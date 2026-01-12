from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_session
from core.core_auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from models.model_user import Users


router = APIRouter(tags=["Auth"])

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {"sub": user.username, "uid": user.id}

    access_token = create_access_token(
        data=token_payload, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data=token_payload)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.id,
    )


@router.get("/me", response_model=dict)
async def get_me(current_user: Users = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}


@router.post("/token/refresh", response_model=Token)
def refresh_access_token(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_session),
):
    payload = decode_token(refresh_request.refresh_token, expected_type="refresh")

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    statement = select(Users).where(Users.username == username)
    user = db.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    token_payload = {"sub": user.username, "uid": user.id}
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data=token_payload, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data=token_payload)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.id,
    )