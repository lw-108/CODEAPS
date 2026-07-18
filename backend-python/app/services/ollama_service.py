import aiohttp
import asyncio
import json
import logging
from typing import AsyncGenerator, Optional, Dict, Any, Union, List
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaService:
    """
    Service to communicate with locally running Ollama DeepSeek model.
    Optimized for CodeAps Kinetic Engine.
    """
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.default_model = "deepseek-coder:1.3b"
        self.fallback_models = ["phi3:mini", "qwen2.5-coder:1.5b", "tinyllama"]
        self.timeout = aiohttp.ClientTimeout(total=3000) # Further increased for massive model pulls
        self.session = None
        self.ollama_path = None
        self.model_dir = None

    def update_config(self, ollama_path: Optional[str] = None, model_dir: Optional[str] = None):
        """Update runtime configuration for Ollama"""
        if ollama_path:
            self.ollama_path = ollama_path
        if model_dir:
            self.model_dir = model_dir
            # We don't change base_url here as Ollama still listens on the same port, 
            # but we will need to set env vars if we start the process.
            pass

    async def ensure_ollama_running(self):
        """Ensure Ollama is running, optionally starting it from custom path"""
        status = await self.check_ollama_status()
        if status["status"] == "running":
            return True

        if not self.ollama_path:
            return False

        try:
            import subprocess
            import os
            
            env = os.environ.copy()
            if self.model_dir:
                env["OLLAMA_MODELS"] = self.model_dir
            
            logger.info(f"AI Engine: Attempting to launch Ollama from {self.ollama_path}")
            # Start detached
            subprocess.Popen(
                [self.ollama_path, "serve"],
                env=env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Wait up to 10 seconds for it to come alive
            for _ in range(20):
                await asyncio.sleep(0.5)
                status = await self.check_ollama_status()
                if status["status"] == "running":
                    logger.info("AI Engine: Neural Link established successfully.")
                    return True
            return False
        except Exception as e:
            logger.error(f"AI Engine: Failed to launch Ollama: {str(e)}")
            return False
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if not self.session or self.session.closed:
            self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self.session
    
    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and get available models"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    models = [model["name"] for model in data.get("models", [])]
                    deepseek_available = any("deepseek" in m for m in models)
                    
                    return {
                        "status": "running",
                        "models": models,
                        "deepseek_available": deepseek_available,
                        "recommended_model": self._get_best_model_name(models)
                    }
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
        except Exception as e:
            return {"status": "not_running", "message": str(e)}
        
        # Explicit fallback for linter
        return {"status": "not_running", "message": "Unknown status error"}

    async def get_embeddings(self, text: str) -> List[float]:
        """Generate vector embeddings for RAG chunking"""
        payload = {
            "model": "nomic-embed-text",
            "prompt": text
        }
        try:
            session = await self._get_session()
            async with session.post(f"{self.base_url}/api/embeddings", json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("embedding", [])
                logger.error(f"Embedding error: {response.status}")
                return []
        except Exception as e:
            logger.error(f"Embedding Connectivity Error: {str(e)}")
            return []

    async def generate(
        self, 
        prompt: str, 
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        stream: bool = False,
        images: Optional[List[str]] = None
    ) -> Union[AsyncGenerator[str, None], str]:
        """Generate response from DeepSeek model"""
        if not model:
            model = await self._get_best_available_model()
            
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system_prompt or "You are the CodeAps AI assistant. Provide optimized, reasoned code.",
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 4096,
                "num_thread": 4,
                "top_p": 0.95
            }
        }
        
        if images:
            payload["images"] = images
        
        try:
            session = await self._get_session()
            start_time = datetime.now()
            logger.info(f"Neural Link: Initiating generation for model {model}...")
            
            if stream:
                return self._stream_generate(session, payload)
            else:
                try:
                    async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                        duration = (datetime.now() - start_time).total_seconds()
                        logger.info(f"Neural Link: Generation complete in {duration:.2f}s")
                        
                        if response.status == 200:
                            data = await response.json()
                            return data.get("response", "")
                        else:
                            error_text = await response.text()
                            return await self._fallback_generation(prompt, f"Model Error ({response.status}): {error_text}")
                except asyncio.TimeoutError:
                    duration = (datetime.now() - start_time).total_seconds()
                    return await self._fallback_generation(prompt, f"Timeout after {duration:.1f}s. The model is likely still loading into RAM or your D: drive is under heavy load.")
                except Exception as inner_e:
                    # Fallback logic for Windows loopback quirks
                    fallback_url = "http://localhost:11434" if "127.0.0.1" in self.base_url else "http://127.0.0.1:11434"
                    async with session.post(f"{fallback_url}/api/generate", json=payload) as response:
                        if response.status == 200:
                            data = await response.json()
                            return data.get("response", "")
                        else:
                            return await self._fallback_generation(prompt, f"Secondary Error: {repr(inner_e)}")
        except Exception as e:
            return await self._fallback_generation(prompt, f"Connectivity Error: {repr(e)}")
        
        # Explicit fallback for linter
        return "Critical Error: Generation path failed to return."

    async def _stream_generate(self, session: aiohttp.ClientSession, payload: Dict) -> AsyncGenerator[str, None]:
        try:
            async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                if response.status != 200:
                    err = await response.text()
                    yield f"Error: {err}"
                    return
                async for line in response.content:
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if "response" in data:
                                yield data["response"]
                            if data.get("done"):
                                break
                        except Exception:
                            continue
        except Exception as e:
            yield f"Connectivity Error: {str(e)}"

    async def complete_code(
        self,
        prefix: str,
        suffix: str,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 64
    ) -> str:
        """
        Predict the missing code between prefix and suffix using FIM (Fill-In-Middle).
        Optimized for deepseek-coder and other FIM-capable models.
        """
        if not model:
            model = await self._get_best_available_model()

        # DeepSeek FIM tokens:
        # <｜fjps｜> = Prefix
        # <｜fjsq｜> = Suffix
        # <｜fjlz｜> = Middle (target)
        # Note: We use specific delimiters that work best with DeepSeek-Coder.
        prompt = f"<｜fjps｜>{prefix}<｜fjsq｜>{suffix}<｜fjlz｜>"
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 4096,
                "num_thread": 4,
                # Added more comprehensive stop tokens for different languages
                "stop": ["<｜fjsq｜>", "<｜fjlz｜>", "<｜fjps｜>", "```", "\n\n\n", "class ", "def ", "function "]
            }
        }

        try:
            session = await self._get_session()
            async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    completion = data.get("response", "")
                    
                    # Post-processing: remove any leftover FIM markers if the model hallucinated them
                    for marker in ["<｜fjps｜>", "<｜fjsq｜>", "<｜fjlz｜>"]:
                        completion = completion.replace(marker, "")
                    
                    return completion.strip()
                return ""
        except Exception as e:
            logger.error(f"Neural Completion Error: {str(e)}")
            return ""

    async def pull_model(self, model_name: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Pull a model from Ollama library and stream progress"""
        payload = {"name": model_name, "stream": True}
        try:
            session = await self._get_session()
            async with session.post(f"{self.base_url}/api/pull", json=payload) as response:
                if response.status != 200:
                    yield {"status": "error", "message": await response.text()}
                    return
                
                async for line in response.content:
                    if line:
                        try:
                            # Use non-destructive parsing
                            data = json.loads(line.decode('utf-8'))
                            yield data
                        except Exception:
                            continue
        except Exception as e:
            yield {"status": "error", "message": str(e)}

    async def _fallback_generation(self, prompt: str, error_detail: str = "") -> str:
        logger.error(f"Neural Link Fallback Triggered: {error_detail}")
        if "404" in error_detail:
            return f"Model Not Found: Your local AI engine is running, but you need to pull the model. Run 'ollama pull {self.default_model}' in your terminal."
        return f"Neural Link Error: {error_detail}\n\nTroubleshooting:\n1. Ensure Ollama is running.\n2. Verify the model '{self.default_model}' is installed.\n3. Check if your new drive path (D:) is accessible."

    async def _get_best_available_model(self) -> str:
        status = await self.check_ollama_status()
        if status["status"] != "running":
            return self.default_model
        models = status.get("models", [])
        priority = ["deepseek-coder:6.7b", "deepseek-coder:33b", "deepseek-v2", "deepseek-coder:1.3b", "phi3:mini", "llama3"]
        for p in priority:
            for m in models:
                if p in m: return m
        return models[0] if models else self.default_model

    def _get_best_model_name(self, models: list) -> str:
        priority = ["deepseek", "phi3", "qwen", "llama"]
        for p in priority:
            for m in models:
                if p in m.lower(): return m
        return models[0] if models else "none"

    async def close(self):
        """Gracefully close the AI session"""
        try:
            # Create a local copy to help the linter understand type-narrowing
            s = self.session
            if s is not None and not s.closed:
                await s.close()
                self.session = None
        except Exception:
            pass

ollama_service = OllamaService()
