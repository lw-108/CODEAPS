"""
CodeAps — WebSocket Connection Manager
Handles real-time communication for terminal output, AI progress, and live collaboration.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional, Set
from app.core.logging_config import get_logger
import json

logger = get_logger("websocket")


class ConnectionManager:
    """Manages WebSocket connections with room-based broadcasting."""

    def __init__(self):
        # client_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # room -> set of client_ids
        self.rooms: Dict[str, Set[str]] = {}
        # Lifecycle callbacks
        self.on_first_connect = None
        self.on_last_disconnect = None

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a new WebSocket connection."""
        is_first = len(self.active_connections) == 0
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info("Client connected: %s (total: %d)", client_id, len(self.active_connections))
        
        if is_first and self.on_first_connect:
            await self.on_first_connect()

    async def disconnect(self, client_id: str):
        """Remove a client from all rooms and active connections."""
        self.active_connections.pop(client_id, None)
        for room_clients in self.rooms.values():
            room_clients.discard(client_id)
        
        count = len(self.active_connections)
        logger.info("Client disconnected: %s (total: %d)", client_id, count)
        
        if count == 0 and self.on_last_disconnect:
            await self.on_last_disconnect()

    def join_room(self, client_id: str, room: str):
        """Add a client to a broadcast room."""
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(client_id)

    def leave_room(self, client_id: str, room: str):
        """Remove a client from a broadcast room."""
        if room in self.rooms:
            self.rooms[room].discard(client_id)

    async def send_personal(self, client_id: str, message: dict):
        """Send a message to a specific client."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning("Failed to send to %s: %s", client_id, e)

    async def broadcast(self, message: dict, exclude: Optional[str] = None):
        """Broadcast a message to all connected clients."""
        payload = json.dumps(message)
        dead_clients = []
        for client_id, ws in self.active_connections.items():
            if client_id == exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead_clients.append(client_id)

        # Clean up dead connections
        for client_id in dead_clients:
            self.disconnect(client_id)

    async def broadcast_to_room(self, room: str, message: dict, exclude: Optional[str] = None):
        """Broadcast a message to all clients in a specific room."""
        clients = self.rooms.get(room, set())
        payload = json.dumps(message)
        dead_clients = []
        for client_id in clients:
            if client_id == exclude:
                continue
            ws = self.active_connections.get(client_id)
            if ws:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_clients.append(client_id)

        for client_id in dead_clients:
            self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton instance
ws_manager = ConnectionManager()
