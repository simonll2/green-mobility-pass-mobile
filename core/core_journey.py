"""
Logique métier pour la gestion des trajets (V1 simplifiée POC).

Ce module implémente :
- Création de trajets validés avec calcul automatique de score
- Récupération de trajets validés
- Rejet de trajets
- Suppression de trajets
- Statistiques utilisateur

Règles métier :
- Les trajets sont créés directement validés
- Le score est calculé automatiquement à la création
- L'utilisateur ne peut accéder qu'à ses propres trajets
- La durée est calculée automatiquement à partir des horaires
"""

from sqlmodel import Session, select
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from models.model_journey import Journey, JourneyCreate
from models.model_journey_status import JourneyStatus
from core.core_score import calculate_and_save_score


def _calculate_duration_minutes(time_departure: datetime, time_arrival: datetime) -> int:
    """Calcule la durée en minutes entre deux dates."""
    delta = time_arrival - time_departure
    return int(delta.total_seconds() / 60)


def _verify_journey_ownership(session: Session, journey_id: int, user_id: int) -> Journey:
    """
    Vérifie qu'un trajet existe et appartient à l'utilisateur.

    Args:
        session: Session SQLModel
        journey_id: ID du trajet
        user_id: ID de l'utilisateur

    Returns:
        Journey: Le trajet si trouvé et appartenant à l'utilisateur

    Raises:
        HTTPException: Si trajet non trouvé ou n'appartient pas à l'utilisateur
    """
    journey = session.get(Journey, journey_id)
    if not journey:
        raise HTTPException(404, "Journey not found")

    if journey.id_user != user_id:
        raise HTTPException(403, "You don't have permission to access this journey")

    return journey


def create_validated_journey_core(
    session: Session,
    data: JourneyCreate,
    user_id: int
) -> Journey:
    """
    Crée un trajet validé directement.

    Dans le workflow de l'app mobile :
    1. L'utilisateur valide un trajet sur son téléphone
    2. L'app mobile envoie le trajet au backend
    3. Le backend le crée avec status=VALIDATED
    4. Le score est calculé automatiquement

    Args:
        session: Session SQLModel
        data: Données du trajet
        user_id: ID de l'utilisateur (extrait du JWT)

    Returns:
        Journey: Le trajet créé avec son score

    Raises:
        HTTPException: Si données invalides
    """
    # Validation temporelle
    if data.time_arrival <= data.time_departure:
        raise HTTPException(400, "time_arrival must be after time_departure")

    # Validation distance
    if data.distance_km <= 0:
        raise HTTPException(400, "distance_km must be positive")

    # Calcul automatique de la durée
    duration_minutes = _calculate_duration_minutes(data.time_departure, data.time_arrival)

    # Création du trajet validé
    journey = Journey(
        id_user=user_id,
        status=JourneyStatus.VALIDATED,
        detection_source=data.detection_source,
        place_departure=data.place_departure,
        place_arrival=data.place_arrival,
        time_departure=data.time_departure,
        time_arrival=data.time_arrival,
        distance_km=data.distance_km,
        duration_minutes=duration_minutes,
        transport_type=data.transport_type,
        validated_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )

    session.add(journey)

    try:
        session.commit()
        session.refresh(journey)
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(400, f"Invalid journey data: {str(e)}")

    # Calcul automatique du score
    calculate_and_save_score(session, journey)
    session.refresh(journey)

    return journey


def list_validated_journeys_core(session: Session, user_id: int) -> list[Journey]:
    """
    Liste tous les trajets validés d'un utilisateur.

    Args:
        session: Session SQLModel
        user_id: ID de l'utilisateur

    Returns:
        list[Journey]: Liste des trajets validés
    """
    statement = (
        select(Journey)
        .where(Journey.id_user == user_id)
        .where(Journey.status == JourneyStatus.VALIDATED)
        .order_by(Journey.time_departure.desc())
    )
    return session.exec(statement).all()


def get_journey_core(session: Session, journey_id: int, user_id: int) -> Journey:
    """
    Récupère un trajet par son ID.

    Args:
        session: Session SQLModel
        journey_id: ID du trajet
        user_id: ID de l'utilisateur (pour vérification de propriété)

    Returns:
        Journey: Le trajet

    Raises:
        HTTPException: Si trajet non trouvé ou n'appartient pas à l'utilisateur
    """
    return _verify_journey_ownership(session, journey_id, user_id)


def reject_journey_core(
    session: Session,
    journey_id: int,
    user_id: int
) -> Journey:
    """
    Rejette un trajet.

    Un trajet rejeté :
    - N'est pas comptabilisé dans les statistiques
    - N'attribue aucun point
    - Est conservé en base pour audit

    Args:
        session: Session SQLModel
        journey_id: ID du trajet
        user_id: ID de l'utilisateur

    Returns:
        Journey: Le trajet rejeté

    Raises:
        HTTPException: Si trajet non trouvé ou déjà validé
    """
    journey = _verify_journey_ownership(session, journey_id, user_id)

    # Vérifier que le trajet peut être rejeté
    if journey.status == JourneyStatus.VALIDATED:
        raise HTTPException(400, "Cannot reject a validated journey")

    if journey.status == JourneyStatus.REJECTED:
        raise HTTPException(400, "Journey is already rejected")

    # Rejeter le trajet
    journey.status = JourneyStatus.REJECTED
    journey.rejected_at = datetime.utcnow()

    session.commit()
    session.refresh(journey)

    return journey


def delete_journey_core(session: Session, journey_id: int, user_id: int) -> dict:
    """
    Supprime un trajet.

    Note : Dans un système de production, on préférerait un soft delete.
    Ici on garde le hard delete pour simplifier le POC.

    Args:
        session: Session SQLModel
        journey_id: ID du trajet
        user_id: ID de l'utilisateur

    Returns:
        dict: Message de confirmation

    Raises:
        HTTPException: Si trajet non trouvé
    """
    journey = _verify_journey_ownership(session, journey_id, user_id)

    session.delete(journey)
    session.commit()

    return {"message": "Journey deleted successfully"}


def get_user_statistics_core(session: Session, user_id: int) -> dict:
    """
    Récupère les statistiques simplifiées d'un utilisateur.

    Calcule :
    - Nombre total de trajets validés
    - Distance totale parcourue
    - Score total

    Args:
        session: Session SQLModel
        user_id: ID de l'utilisateur

    Returns:
        dict: Statistiques de l'utilisateur
    """
    # Récupérer tous les trajets validés
    validated_journeys = list_validated_journeys_core(session, user_id)

    if not validated_journeys:
        return {
            "total_journeys": 0,
            "total_distance_km": 0.0,
            "total_score": 0,
        }

    # Calculer les statistiques
    total_distance = sum(j.distance_km for j in validated_journeys)
    total_score = sum(j.score_journey or 0 for j in validated_journeys)

    return {
        "total_journeys": len(validated_journeys),
        "total_distance_km": round(total_distance, 2),
        "total_score": total_score,
    }
