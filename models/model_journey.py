from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from models.model_transport_type import TransportType
from models.model_user import Users


class Journey(SQLModel, table=True):
    __tablename__ = "Journey"

    id: Optional[int] = Field(default=None, primary_key=True)
    place_departure: str = Field(max_length=100, nullable=False)
    place_arrival: str = Field(max_length=100, nullable=False)
    time_departure: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    time_arrival: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    transport_type: TransportType = Field(nullable=False)
    score_journey: Optional[int] = Field(default=None, nullable=False)
    id_user: Optional[int] = Field(default=None, foreign_key="users.id")


class JourneyCreate(SQLModel):
    place_departure: str
    place_arrival: str
    time_departure: datetime
    time_arrival: datetime
    transport_type: TransportType
    score_journey: Optional[int] = None
    id_user: Optional[int] = None


class JourneyRead(SQLModel):
    id: int
    place_departure: str
    place_arrival: str
    time_departure: datetime
    time_arrival: datetime
    transport_type: TransportType
    score_journey: Optional[int] = None
    id_user: Optional[int] = None