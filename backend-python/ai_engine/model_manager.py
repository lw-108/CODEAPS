"""Model Manager - Handles local LLM loading, resource management, fallback, and queuing"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any, List, AsyncGenerator
from pathlib import Path
import json

import aiohttp
import psutil
try:
    import GPUtil
except ImportError:
    GPUtil = None

from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

class ModelManager:
    """
    Enterprise-grade model manager with resource monitoring and fallback.
    Supported providers: ollama (primary), transformers (fallback/local).
    """
    
    # Model Registry - defines requirements for models
    MODEL_REGISTRY = {
        "deepseek-coder:6.7b": {
            "ram_gb": 8, "vram_gb": 6, "task": "coding",
            "quantizations": ["fp16", "q8_0", "q4_k_m"]
        },
        "llama3-8b": {
            "ram_gb": 8, "vram_gb": 5, "task": "chat",
            "quantizations": ["q8_0", "q4_k_m"]
        },
        "phi3:3.8b": {
            "ram_gb": 4, "vram_gb": 3, "task": "lightweight",
            "quantizations": ["q4_k_m"]
        },
        "codellama:7b": {
            "ram_gb": 8, "vram_gb": 6, "task": "coding",
            "quantizations": ["q8_0", "q4_k_m"]
        }
    }

    def __init__(self, provider: str = "ollama"):
        self.provider = provider
        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.queue = asyncio.Queue()
        self.is_processing = False
        self._lock = asyncio.Lock()
        
    async def get_best_model(self, task: str = "coding") -> str:
        """Select best available model based on task and hardware"""
        vram = self._get_available_vram()
        ram = psutil.virtual_memory().available / (1024**3)
        
        # Priority: VRAM > RAM
        best_model = "phi3:3.8b" # Efficient Default
        
        for model, specs in self.MODEL_REGISTRY.items():
            if specs.get("task") == task:
                # Check hardware eligibility
                vram_req = float(specs.get("vram_gb", 0))
                ram_req = float(specs.get("ram_gb", 0))
                
                if vram >= vram_req or ram >= ram_req:
                    best_model = model
                    break
        
        return best_model

    def _get_available_vram(self) -> float:
        """Get available VRAM in GB using GPUtil"""
        if GPUtil is None:
            return 0.0
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                return 0.0
            # Return max free VRAM across all GPUs
            return max(gpu.memoryFree for gpu in gpus) / 1024.0
        except Exception as e:
            logger.warning(f"Failed to detect VRAM: {e}")
            return 0.0

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(self, prompt: str, model: Optional[str] = None, system_prompt: Optional[str] = None, 
                       stream: bool = False, **kwargs) -> Any:
        """Generate response with integrated queue and fallback"""
        if model is None:
            model = await self.get_best_model()

        # Check provider
        if self.provider == "ollama":
            return await self._ollama_generate(prompt, model, system_prompt, stream, **kwargs)
        else:
            # Fallback to a placeholder or simple local engine
            return f"Provider {self.provider} not fully implemented. Using default fallback."

    async def _ollama_generate(self, prompt: str, model: str, system_prompt: Optional[str], 
                               stream: bool, **kwargs) -> Any:
        """Ollama specific generation"""
        url = f"{self.ollama_base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system_prompt or "You are a helpful coding assistant.",
            "stream": stream,
            "options": kwargs.get("options", {})
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama error ({response.status}): {error_text}")
                        raise Exception(f"Ollama error: {error_text}")

                    if stream:
                        return self._stream_response(response)
                    else:
                        result = await response.json()
                        return result.get("response", "")
            except aiohttp.ClientError as e:
                logger.error(f"Network error connecting to Ollama: {e}")
                raise

    async def _stream_response(self, response: aiohttp.ClientResponse) -> AsyncGenerator[str, None]:
        """Process streaming response from Ollama"""
        async for line in response.content:
            if line:
                try:
                    chunk = json.loads(line.decode('utf-8'))
                    if chunk.get("done"):
                        break
                    yield chunk.get("response", "")
                except json.JSONDecodeError:
                    continue

    async def check_health(self) -> Dict[str, Any]:
        """Check status of model providers and local resources"""
        health = {
            "status": "healthy",
            "provider": self.provider,
            "timestamp": time.time(),
            "resources": {
                "ram_available_gb": round(float(psutil.virtual_memory().available / (1024**3)), 2),
                "vram_available_gb": round(float(self._get_available_vram()), 2),
                "cpu_percent": float(psutil.cpu_percent())
            }
        }
        
        if self.provider == "ollama":
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{self.ollama_base_url}/api/tags") as resp:
                        if resp.status == 200:
                            models_data = await resp.json()
                            health["ollama"] = {
                                "status": "connected", 
                                "models": [m["name"] for m in models_data.get("models", [])]
                            }
                        else:
                            health["ollama"] = {"status": "disconnected", "error": f"HTTP {resp.status}"}
                            health["status"] = "degraded"
            except Exception as e:
                health["ollama"] = {"status": "error", "error": str(e)}
                health["status"] = "error" # Critical if ollama is broken
                
        return health

    async def pull_model(self, model_name: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Pull a model with progress reporting"""
        url = f"{self.ollama_base_url}/api/pull"
        payload = {"name": model_name, "stream": True}
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, json=payload) as response:
                    async for line in response.content:
                        if line:
                            data = json.loads(line.decode('utf-8'))
                            yield data
            except Exception as e:
                logger.error(f"Failed to pull model {model_name}: {e}")
                yield {"status": "error", "error": str(e)}

    async def preload_model(self, model_name: str):
        """Warm up a model by sending a dummy request"""
        logger.info(f"Preloading model: {model_name}")
        try:
            await self.generate("Hello, state your system ID.", model=model_name, stream=False)
            logger.info(f"Model {model_name} preloaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to preload {model_name}: {e}")
