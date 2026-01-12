from sqlmodel import Session, select
from fastapi import HTTPException
from models.model_user import Users, UserCreate
from sqlalchemy.exc import IntegrityError

def list_users_core(session: Session):
    statement = select(Users)
    return session.exec(statement).all()


def get_user_core(session: Session, user_id: int):
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


def create_user_core(session: Session, data: UserCreate):

    existing_username = session.exec(
        select(Users).where(Users.username == data.username)
    ).first()
    if existing_username:
        raise HTTPException(400, "Username already exists")

    existing_email = session.exec(
        select(Users).where(Users.email == data.email)
    ).first()
    if existing_email:
        raise HTTPException(400, "Email already exists")

    user = Users(
        username=data.username,
        email=data.email,
        role="user",
        id_company=data.id_company
    )
    user.set_password(data.password)

    session.add(user)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, "Invalid user data")

    session.refresh(user)
    return user


def delete_user_core(session: Session, user_id: int):
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    session.delete(user)
    session.commit()
    return {"message": "User deleted"}
