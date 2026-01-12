from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from passlib.context import CryptContext
from typing import Optional
from models.model_role import UserRole
from models.model_company import Company

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class Users(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=50, nullable=False)
    password: str = Field(nullable=False)
    email: str = Field(unique=True, max_length=100, nullable=False)
    role: UserRole = Field(default=UserRole.user, nullable=False)
    date_creation: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    id_company: Optional[int] = Field(default=None, foreign_key="company.id")
    company: Optional[Company] = Relationship(back_populates="users")
    # trajets: List["Trajet"] = Relationship(back_populates="user")

    def set_password(self, password: str):
        self.password = pwd_context.hash(password)

    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.password)


class UserCreate(SQLModel):
    username: str
    password: str
    email: str
    id_company: Optional[int] = None


class UserRead(SQLModel):
    id: int
    username: str
    email: str
    role: UserRole
    date_creation: datetime
    id_company: Optional[int] = None

