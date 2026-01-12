from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List


class Company(SQLModel, table=True):
    __tablename__ = "company"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_name: str = Field(max_length=100, nullable=False)
    domain_name: str = Field(max_length=100, nullable=False)
    company_locate: str = Field(max_length=100, nullable=False)
    users: List["Users"] = Relationship(back_populates="company")


class CompanyCreate(SQLModel):
    company_name: str
    domain_name: str
    company_locate: str


class CompanyRead(SQLModel):
    id: int
    company_name: str
    domain_name: str
    company_locate: str