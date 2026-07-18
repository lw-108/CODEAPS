import asyncio
import sys
import os
import shutil
import tempfile
import platform
import re
import json
import logging
import signal
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from app.core.config import settings
from app.services.ollama_service import ollama_service

# Setup dedicated execution logger
execution_log_path = Path("logs/execution.log")
execution_log_path.parent.mkdir(parents=True, exist_ok=True)
fh = logging.FileHandler(execution_log_path)
fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
execution_logger = logging.getLogger("execution_engine")
execution_logger.addHandler(fh)
execution_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

class ExecutionService:
    def __init__(self):
        self.max_output_size = 1024 * 1024  # 1MB
        self.timeout = 30  # Default 30 seconds
        self.semaphore = asyncio.Semaphore(3)  # Max 3 concurrent runs
        self.temp_root = Path("storage/temp")
        self.temp_root.mkdir(parents=True, exist_ok=True)
        self.lang_config_dir = Path("app/resources/languages")
        self.is_windows = platform.system() == "Windows"
        
        # Internal state
        self.languages: Dict[str, Dict[str, Any]] = {}
        self.resolved_paths: Dict[str, str] = {}
        self._load_language_configs()

    def _load_language_configs(self):
        """Discovers and resolves language definitions at startup"""
        if not self.lang_config_dir.exists():
            logger.warning(f"Language config directory missing: {self.lang_config_dir}")
            return

        for config_file in self.lang_config_dir.glob("*.json"):
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    lang_id = config_file.stem.lower()
                    
                    # Filter by OS support
                    if "os_support" in config:
                        current_os = platform.system().lower()
                        if current_os not in [os_name.lower() for os_name in config["os_support"]]:
                            logger.info(f"Skipping language '{config['name']}' - Not supported on {current_os}")
                            continue

                    # Resolve system paths for all commands and dependencies
                    is_available = True
                    deps = config.get("dependencies", [])
                    
                    bins_to_resolve = set(deps)
                    if config.get("compile"): bins_to_resolve.add(config["compile"][0])
                    if config.get("run"): bins_to_resolve.add(config["run"][0])

                    for cmd in bins_to_resolve:
                        if "{" in cmd: continue
                        
                        if cmd in ["python", "python3"]:
                            path = sys.executable
                        else:
                            path = shutil.which(cmd)
                        
                        if not path:
                            logger.info(f"Language feature '{config['name']}' not available: Binary '{cmd}' missing.")
                            is_available = False
                            break
                        self.resolved_paths[cmd] = path

                    if is_available:
                        self.languages[lang_id] = config
                        self.languages[config["extension"].lstrip('.')] = config
                        logger.info(f"Loaded Language: {config['name']} ({config['extension']})")

            except Exception as e:
                logger.error(f"Failed to load language config {config_file}: {e}")

    async def _read_stream(self, stream, limit: int) -> Tuple[str, bool]:
        """Reads from a stream using a rolling buffer up to a limit"""
        buffer = bytearray()
        truncated = False
        while True:
            try:
                chunk = await stream.read(4096)
                if not chunk:
                    break
                buffer.extend(chunk)
                if len(buffer) > limit:
                    buffer = buffer[:limit]
                    truncated = True
                    break
            except Exception as e:
                logger.error(f"Stream read error: {e}")
                break
        
        result = buffer.decode('utf-8', errors='replace')
        if truncated:
            result += "\n[Output Truncated - 1MB Limit Reached]"
        return result, truncated

    async def _kill_process_group(self, process):
        """Kills an entire process tree safely depending on OS"""
        try:
            if self.is_windows:
                # Windows: send CTRL_BREAK to process group
                import subprocess
                os.kill(process.pid, signal.CTRL_BREAK_EVENT)
            else:
                # Unix: kill session group
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            
            await process.wait()
        except Exception as e:
            logger.error(f"Error killing process group: {e}")
            try:
                process.kill()
            except:
                pass

    def _sanitize_filename(self, filename: str) -> str:
        """Strips path separators and unsafe characters from filenames"""
        name = os.path.basename(filename)
        sanitized = re.sub(r'[^a-zA-Z0-9_\-\.]', '', name)
        if not sanitized or sanitized.startswith('.'):
            return "script.run"
        return sanitized

    def get_supported_languages(self) -> List[Dict[str, Any]]:
        """Returns metadata for all available/healthy languages"""
        return [
            {
                "id": lang_id,
                "name": cfg["name"],
                "extension": cfg["extension"],
                "is_available": True,
                "install_hint": cfg.get("install_hint", "")
            }
            for lang_id, cfg in self.languages.items()
            if not lang_id.startswith('.') # Skip extension-only aliases
        ]

    async def execute(
        self,
        file_path: Path,
        language_hint: str,
        input_data: str = ""
    ) -> Dict[str, Any]:
        """High-level code execution pipeline with pre-flight checks and short-circuiting"""
        
        # 1. Pre-flight Validation
        lang_id = language_hint.lower()
        if lang_id not in self.languages:
            # Try auto-detection via extension
            ext = file_path.suffix.lstrip('.') if file_path.suffix else ""
            if ext in self.languages:
                lang_id = ext
            else:
                execution_logger.error(f"Execution failed: Unsupported language '{language_hint}' for file {file_path}")
                return {
                    "status": "completed",
                    "stdout": "",
                    "stderr": f"Error: Untrusted or missing runtime for '{language_hint}'.",
                    "error_type": "system_error",
                    "exit_code": -1,
                    "success": False
                }

        config = self.languages[lang_id]
        
        async with self.semaphore:
            execution_logger.info(f"Starting execution: {config['name']} | File: {file_path}")
            # 2. Setup isolated environment
            with tempfile.TemporaryDirectory(dir=self.temp_root) as temp_dir:
                temp_path = Path(temp_dir)
                safe_name = self._sanitize_filename(file_path.name)
                dest_file = temp_path / safe_name
                shutil.copy2(file_path, dest_file)
                
                # Context variables
                binary_name = safe_name.split('.')[0]
                if self.is_windows: binary_name += ".exe"
                else: 
                    if "binary_prefix" in config:
                        binary_name = config["binary_prefix"] + binary_name
                    else:
                        binary_name = "./" + binary_name

                params = {
                    "file_name": safe_name,
                    "file_stem": safe_name.split('.')[0],
                    "binary_name": binary_name
                }

                # 3. Compile Step (if needed)
                if config.get("compile"):
                    compile_cmd = [cfg.format(**params) for cfg in config["compile"]]
                    if compile_cmd[0] in self.resolved_paths:
                        compile_cmd[0] = self.resolved_paths[compile_cmd[0]]

                    compile_res = await self._run_safe(compile_cmd, temp_path)
                    if compile_res["exit_code"] != 0:
                        compile_res["error_type"] = "compile_error"
                        compile_res["status"] = "completed"
                        
                        # AI Debug for compile errors
                        try:
                            with open(dest_file, 'r') as f:
                                code_context = f.read()
                            compile_res["error_explanation"] = await self._explain_error(compile_res["stderr"], code_context, config["name"])
                        except: pass
                        
                        return compile_res

                # 4. Run Step
                run_cmd = [cfg.format(**params) for cfg in config["run"]]
                if run_cmd[0] in self.resolved_paths:
                    run_cmd[0] = self.resolved_paths[run_cmd[0]]

                result = await self._run_safe(run_cmd, temp_path, input_data=input_data)
                
                if result.get("error_type") is None:
                    result["error_type"] = "runtime_error" if result["exit_code"] != 0 else None
                
                # 5. AI Debug Loop for runtime errors
                if result.get("error_type") and result.get("stderr"):
                    try:
                        with open(dest_file, 'r') as f:
                            code_context = f.read()
                        explanation = await self._explain_error(result["stderr"], code_context, config["name"])
                        result["error_explanation"] = explanation
                    except Exception as ai_err:
                        logger.error(f"AI Debug Loop failed: {ai_err}")

                result["status"] = "completed"
                execution_logger.info(f"Execution finished: {config['name']} | Exit Code: {result['exit_code']} | Time: {result.get('execution_time', 0)}s")
                return result

    async def _explain_error(self, stderr: str, code: str, language: str) -> str:
        """Triggers local AI to explain a compilation or runtime error"""
        prompt = f"The following {language} code failed with an error.\n\nCODE:\n```{language}\n{code}\n```\n\nERROR:\n{stderr}\n\nExplain why this error occurred and suggest a precise fix."
        try:
            response = await ollama_service.generate(prompt, model="deepseek-coder:6.7b")
            return response
        except:
            return "AI Debugging unavailable."

    async def _run_safe(self, cmd_args: List[str], cwd: Path, input_data: str = "") -> Dict[str, Any]:
        """Lower-level safe process execution using exec (no shell) and streaming capture"""
        start_time = datetime.now()
        
        creation_flags = 0
        if self.is_windows:
            creation_flags = 0x00000200 # CREATE_NEW_PROCESS_GROUP
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                start_new_session=not self.is_windows,
                creationflags=creation_flags if self.is_windows else 0
            )

            # Write stdin safely and close
            if input_data:
                try:
                    process.stdin.write(input_data.encode())
                    await process.stdin.drain()
                except Exception as e:
                    logger.error(f"Stdin write error: {e}")
                finally:
                    process.stdin.close()
            else:
                process.stdin.close()

            # Concurrent streaming read with timeout
            try:
                stdout_task = asyncio.create_task(self._read_stream(process.stdout, self.max_output_size))
                stderr_task = asyncio.create_task(self._read_stream(process.stderr, self.max_output_size))
                
                await asyncio.wait_for(process.wait(), timeout=self.timeout)
                
                stdout, out_trunc = await stdout_task
                stderr, err_trunc = await stderr_task
                
                execution_time = (datetime.now() - start_time).total_seconds()
                
                if out_trunc or err_trunc:
                    await self._kill_process_group(process)
                    return {
                        "stdout": stdout,
                        "stderr": stderr + "\n[System: Execution terminated due to excessive output]",
                        "exit_code": -1,
                        "execution_time": execution_time,
                        "error_type": "system_error",
                        "success": False
                    }

                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": process.returncode,
                    "execution_time": execution_time,
                    "success": process.returncode == 0
                }

            except asyncio.TimeoutError:
                await self._kill_process_group(process)
                return {
                    "stdout": "",
                    "stderr": f"Execution timed out after {self.timeout}s.",
                    "exit_code": -1,
                    "execution_time": self.timeout,
                    "error_type": "timeout_error",
                    "success": False
                }

        except Exception as e:
            logger.error(f"System error during execution of {cmd_args}: {e}")
            return {
                "stdout": "",
                "stderr": f"System error: {str(e)}",
                "exit_code": -1,
                "error_type": "system_error",
                "success": False
            }

execution_service = ExecutionService()
