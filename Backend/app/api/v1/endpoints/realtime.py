# backend/app/api/v1/endpoints/realtime.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import jwt
from typing import Dict, Set, Any, DefaultDict
from collections import defaultdict
import asyncio
import os

router = APIRouter(prefix="/ws", tags=["realtime"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

class RealtimeBroker:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.connections_by_user: DefaultDict[str, Set[WebSocket]] = defaultdict(set)

    async def register(self, user_id: str, ws: WebSocket):
        async with self.lock:
            self.connections_by_user[user_id].add(ws)

    async def unregister(self, user_id: str, ws: WebSocket):
        async with self.lock:
            conns = self.connections_by_user[user_id]
            conns.discard(ws)
            if not conns:
                self.connections_by_user.pop(user_id, None)

    async def push_to_user(self, user_id: str, event: Dict[str, Any]):
        async with self.lock:
            conns = list(self.connections_by_user.get(user_id, []))
        # send outside the lock
        for ws in conns:
            try:
                await ws.send_json(event)
            except Exception:
                # drop broken sockets silently
                pass

broker = RealtimeBroker()

def decode_user(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Expect at least: sub(user_id), company_id, role, email...
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

@router.websocket("/customer")
async def customer_ws(ws: WebSocket, token: str = Query(..., description="JWT access token")):
    # Accept first so we can send close codes properly
    await ws.accept()
    user = decode_user(token)
    user_id = str(user.get("sub") or user.get("id") or "")
    role = (user.get("role") or "").lower()
    if not user_id:
        await ws.close(code=4401)
        return
    # Optional role guard: customers only
    if role not in {"customer"}:
        await ws.close(code=4403)
        return

    await broker.register(user_id, ws)
    # greet
    await ws.send_json({"type": "connected", "user_id": user_id})

    try:
        while True:
            # Keep the socket alive; you can also handle client pings/messages here
            _ = await ws.receive_text()
            # No-op; you can implement client->server messages if needed
    except WebSocketDisconnect:
        pass
    finally:
        await broker.unregister(user_id, ws)
