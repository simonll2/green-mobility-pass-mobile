from sqlmodel import Session, select
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from models.model_journey import Journey, JourneyCreate
from models.model_user import Users


def list_journeys_core(session: Session):
    statement = select(Journey)
    return session.exec(statement).all()


def get_journey_core(session: Session, journey_id: int):
    journey = session.get(Journey, journey_id)
    if not journey:
        raise HTTPException(404, "Journey not found")
    return journey


def create_journey_core(session: Session, data: JourneyCreate):
    # validation minimale
    if data.time_arrival < data.time_departure:
        raise HTTPException(400, "time_arrival must be >= time_departure")

    journey = Journey(
        place_departure=data.place_departure,
        place_arrival=data.place_arrival,
        time_departure=data.time_departure,
        time_arrival=data.time_arrival,
        transport_type=data.transport_type,
        score_journey=data.score_journey,
        id_user=data.id_user,
    )

    session.add(journey)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, "Invalid journey data")

    session.refresh(journey)
    return journey


def delete_journey_core(session: Session, journey_id: int):
    journey = session.get(Journey, journey_id)
    if not journey:
        raise HTTPException(404, "Journey not found")

    session.delete(journey)
    session.commit()
    return {"message": "Journey deleted"}


def list_journeys_by_user_core(session: Session, user_id: int):
    # Vérifier que l'utilisateur existe
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    statement = select(Journey).where(Journey.id_user == user_id)
    return session.exec(statement).all()