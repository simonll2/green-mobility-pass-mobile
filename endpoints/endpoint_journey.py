from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session

from core.database import get_session
from models.model_journey import Journey, JourneyCreate
from core.core_journey import (
    list_journeys_core,
    get_journey_core,
    list_journeys_by_user_core,
    create_journey_core,  
    delete_journey_core,
)

router = APIRouter(prefix="/journey", tags=["Journey"])


@router.get("/", response_model=List[Journey])
def list_journeys(session: Session = Depends(get_session)):
    return list_journeys_core(session)


@router.get("/{journey_id}", response_model=Journey)
def get_journey(journey_id: int, session: Session = Depends(get_session)):
    return get_journey_core(session, journey_id)


@router.get("/user/{user_id}", response_model=List[Journey])
def list_journeys_by_user(
    user_id: int,
    session: Session = Depends(get_session)
):
    return list_journeys_by_user_core(session, user_id)


@router.post("/", response_model=Journey, status_code=201)
def create_journey(data: JourneyCreate, session: Session = Depends(get_session)):
    return create_journey_core(session, data)


@router.delete("/{journey_id}")
def delete_journey(journey_id: int, session: Session = Depends(get_session)):
    return delete_journey_core(session, journey_id)
