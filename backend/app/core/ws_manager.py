"""
In-memory WebSocket connection registry, keyed by trip_id. Single-process
only (fine for this project's scale) — shared by chat and itinerary, so
both chat messages and itinerary updates broadcast to everyone currently
viewing a given trip over the same connections.
"""
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    def connect(self, trip_id: str, websocket: WebSocket) -> None:
        self._connections.setdefault(trip_id, []).append(websocket)

    def disconnect(self, trip_id: str, websocket: WebSocket) -> None:
        conns = self._connections.get(trip_id)
        if conns and websocket in conns:
            conns.remove(websocket)
            if not conns:
                self._connections.pop(trip_id, None)

    async def broadcast(self, trip_id: str, message: dict) -> None:
        for ws in list(self._connections.get(trip_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()
