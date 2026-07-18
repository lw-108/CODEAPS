import asyncio
import psutil
import json
from app.core.websocket_manager import ws_manager
from app.core.logging_config import get_logger

logger = get_logger("telemetry")

class TelemetryService:
    def __init__(self):
        self._running = False
        self._task = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Telemetry Engine started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Telemetry Engine stopped")

    async def _loop(self):
        while self._running:
            try:
                # Gather stats
                cpu = psutil.cpu_percent(interval=None)
                ram = psutil.virtual_memory().percent
                disk = psutil.disk_usage('/').percent
                
                # Network I/O (simple rate calculation if needed, but let's keep it minimal for now)
                net = psutil.net_io_counters()
                
                stats = {
                    "type": "telemetry",
                    "data": {
                        "cpu": cpu,
                        "memory": ram,
                        "disk": disk,
                        "net_sent": net.bytes_sent,
                        "net_recv": net.bytes_recv,
                        "timestamp": psutil.boot_time() # Use boot time for system uptime context if needed
                    }
                }
                
                # Broadcast to all connected clients
                await ws_manager.broadcast(stats)
                
            except Exception as e:
                logger.error(f"Telemetry error: {e}")
            
            await asyncio.sleep(1.5) # Dynamic update rate

telemetry_service = TelemetryService()
