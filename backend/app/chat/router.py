import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.security import decode_access_token, get_current_user
from app.chat.schemas import ChatMessageCreate, ChatMessageOut
from app.core.db import get_db
from app.core.models import ChatMessage, User
from app.core.ws_manager import manager
from app.trips.service import get_trip_or_404, require_member

router = APIRouter(prefix="/api/trips/{trip_id}/chat", tags=["chat"])


def _message_out(msg: ChatMessage, trip_id: str) -> ChatMessageOut:
    return ChatMessageOut(
        id=str(msg.id),
        trip_id=trip_id,
        user_id=str(msg.user_id),
        user_name=msg.user.name,
        content=msg.content,
        ref_day_number=msg.ref_day_number,
        created_at=msg.created_at,
    )


@router.get("/messages", response_model=list[ChatMessageOut])
async def list_messages(
    trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.trip_id == trip.id)
        .options(selectinload(ChatMessage.user))
        .order_by(ChatMessage.created_at.asc())
    )
    return [_message_out(m, trip_id) for m in result.scalars().all()]


@router.post("/messages", response_model=ChatMessageOut, status_code=201)
async def send_message(
    trip_id: str,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)

    msg = ChatMessage(
        trip_id=trip.id,
        user_id=current_user.id,
        content=payload.content.strip(),
        ref_day_number=payload.ref_day_number,
    )
    db.add(msg)
    await db.commit()
    msg.user = current_user

    out = _message_out(msg, trip_id)
    await manager.broadcast(trip_id, {"type": "chat_message", "message": out.model_dump(mode="json")})
    return out


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket, trip_id: str, db: AsyncSession = Depends(get_db)):
    token = websocket.query_params.get("token")
    user = None
    if token:
        try:
            user_id = decode_access_token(token)
            user = await db.get(User, uuid.UUID(user_id))
        except (HTTPException, ValueError):
            user = None
    if not user:
        await websocket.close(code=4401)
        return

    try:
        trip = await get_trip_or_404(trip_id, db)
        require_member(trip, user.id)
    except HTTPException:
        await websocket.close(code=4403)
        return

    await websocket.accept()
    manager.connect(trip_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(trip_id, websocket)
