import asyncio
import os
from typing import Optional
from pathlib import Path
from watchfiles import awatch, Change
from app.core.websocket_manager import ws_manager
from app.core.logging_config import get_logger

logger = get_logger("fs_watcher")

class FSWatcherService:
    def __init__(self):
        self._running = False
        self._task = None
        self._watch_path = Path.cwd()

    async def start(self, watch_path: Optional[str] = None):
        if self._running:
            return
        if watch_path:
            self._watch_path = Path(watch_path)
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info(f"FS Watcher Engine started on {self._watch_path}")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("FS Watcher Engine stopped")

    async def _loop(self):
        async for changes in awatch(self._watch_path):
            if not self._running:
                break
            
            for change, path in changes:
                # Filter out ignore patterns (e.g. .git, node_modules, target, etc.)
                if any(x in path for x in [".git", "node_modules", "target", "out", "__pycache__", ".venv", ".next", "dist", ".tauri", ".cargo"]):
                    continue

                event_type = "file_changed"
                if change == Change.added:
                    event_type = "file_created"
                elif change == Change.deleted:
                    event_type = "file_deleted"
                
                # Relative path for the frontend
                try:
                    rel_path = os.path.relpath(path, self._watch_path)
                    
                    payload = {
                        "type": "fs_event",
                        "data": {
                            "event": event_type,
                            "path": rel_path,
                            "full_path": path
                        }
                    }
                    
                    # Broadcast fs events
                    await ws_manager.broadcast(payload)
                    logger.debug(f"FS Event: {event_type} -> {rel_path}")
                except Exception as e:
                    logger.error(f"FS Watcher error: {e}")

fs_watcher_service = FSWatcherService()
