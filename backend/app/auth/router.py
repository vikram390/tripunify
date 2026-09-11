from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.auth.security import create_access_token, get_current_user, hash_password, verify_password
from app.core.db import get_db
from app.core.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(id=str(user.id), name=user.name, email=user.email, created_at=user.created_at)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_user_out(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)
