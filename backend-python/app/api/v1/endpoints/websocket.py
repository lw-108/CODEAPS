"""
WebSocket endpoint for real-time communication.
Handles: terminal output streaming, AI generation progress, live collaboration.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import ws_manager
from app.core.logging_config import get_logger
import json
import asyncio

logger = get_logger("ws_endpoint")

from app.services.telemetry_service import telemetry_service
from app.services.fs_watcher import fs_watcher_service

router = APIRouter()

# Lifecycle Management
async def _on_first():
    logger.info("[WS] First client connected - Booting background engines")
    # For now, we still default to CodeAps root, but could be dynamic later
    await asyncio.gather(
        telemetry_service.start(),
        fs_watcher_service.start()
    )

async def _on_last():
    logger.info("[WS] Last client disconnected - Hibernating background engines")
    await asyncio.gather(
        telemetry_service.stop(),
        fs_watcher_service.stop()
    )

ws_manager.on_first_connect = _on_first
ws_manager.on_last_disconnect = _on_last

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time events.
    Services start/stop automatically via ws_manager hooks.
    """
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_personal(client_id, {
                    "type": "error", "message": "Invalid JSON"
                })
                continue

            msg_type = message.get("type", "")

            if msg_type == "join_room":
                room = message.get("room", "")
                if room:
                    ws_manager.join_room(client_id, room)
                    await ws_manager.send_personal(client_id, {
                        "type": "room_joined", "room": room
                    })

            elif msg_type == "leave_room":
                room = message.get("room", "")
                if room:
                    ws_manager.leave_room(client_id, room)

            elif msg_type == "yjs_update":
                room = message.get("room", "")
                if room:
                    payload = {
                        "type": "yjs_update",
                        "from": client_id,
                        "data": message.get("data")
                    }
                    await ws_manager.broadcast_to_room(room, payload, exclude=client_id)

            elif msg_type == "broadcast":
                room = message.get("room")
                data = message.get("data", {})
                payload = {"type": "broadcast", "from": client_id, "data": data}
                if room:
                    await ws_manager.broadcast_to_room(room, payload, exclude=client_id)
                else:
                    await ws_manager.broadcast(payload, exclude=client_id)

            elif msg_type == "ping":
                await ws_manager.send_personal(client_id, {"type": "pong"})

            elif msg_type == "presence":
                room = message.get("room")
                if room:
                    payload = {"type": "presence", "user_id": client_id, "status": message.get("status", "online")}
                    await ws_manager.broadcast_to_room(room, payload, exclude=client_id)

            elif msg_type == "cursor_update":
                room = message.get("room")
                if room:
                    payload = {
                        "type": "cursor_update",
                        "user_id": client_id,
                        "position": message.get("position"),
                        "file_path": message.get("file_path")
                    }
                    await ws_manager.broadcast_to_room(room, payload, exclude=client_id)

            elif msg_type == "file_edit":
                room = message.get("room")
                if room:
                    payload = {
                        "type": "file_edit",
                        "user_id": client_id,
                        "change": message.get("change"),
                        "file_path": message.get("file_path")
                    }
                    await ws_manager.broadcast_to_room(room, payload, exclude=client_id)

            else:
                # Echo unknown message types for debugging
                logger.debug("Unknown message type from %s: %s", client_id, msg_type)

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
    except Exception as e:
        logger.error("WebSocket error for %s: %s", client_id, e)
        ws_manager.disconnect(client_id)
