from fastapi import APIRouter, Depends
from sqlmodel import Session
from core.database import get_session
from core.core_auth import get_current_user, require_admin

from core.core_user import (
    list_users_core,
    get_user_core,
    create_user_core,
    delete_user_core
)

from models.model_user import Users, UserRead, UserCreate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserRead])
def get_all_users(
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Liste tous les utilisateurs (admin uniquement)."""
    require_admin(current_user)
    return list_users_core(session)


@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Recupere un utilisateur par son ID (authentification requise)."""
    return get_user_core(session, user_id)


@router.post("", response_model=UserRead)
def create_user(data: UserCreate, session: Session = Depends(get_session)):
    """Cree un nouvel utilisateur (endpoint public pour inscription)."""
    return create_user_core(session, data)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Supprime un utilisateur (admin uniquement)."""
    require_admin(current_user)
    return delete_user_core(session, user_id)
