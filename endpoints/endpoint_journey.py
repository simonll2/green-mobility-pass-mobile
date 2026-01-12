"""
Endpoints API pour la gestion des trajets (V1 simplifiée POC).

Tous les endpoints sont protégés par authentification JWT.
L'utilisateur ne peut accéder qu'à ses propres trajets.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from core.database import get_session
from core.core_auth import get_current_user
from models.model_user import Users
from models.model_journey import JourneyCreate, JourneyRead
from core.core_journey import (
    create_validated_journey_core,
    list_validated_journeys_core,
    get_journey_core,
    reject_journey_core,
    delete_journey_core,
    get_user_statistics_core,
)

router = APIRouter(prefix="/journey", tags=["Journey"])


@router.post(
    "/",
    response_model=JourneyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un trajet validé",
    description="""
    Crée un nouveau trajet validé.

    L'utilisateur envoie un trajet qu'il a préalablement validé sur son mobile.
    Le backend :
    - Calcule automatiquement la durée à partir des horaires
    - Calcule automatiquement le score selon les règles métier
    - Enregistre le trajet avec statut VALIDATED

    Le score est attribué immédiatement.
    """
)
def create_validated_journey(
    data: JourneyCreate,
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Créer un trajet validé (depuis l'app mobile)."""
    return create_validated_journey_core(session, data, current_user.id)


@router.get(
    "/validated",
    response_model=List[JourneyRead],
    summary="Lister les trajets validés",
    description="""
    Récupère tous les trajets validés de l'utilisateur connecté.

    Ces trajets :
    - Ont été validés par l'utilisateur
    - Ont un score attribué
    - Sont comptabilisés dans les statistiques
    - Sont triés du plus récent au plus ancien
    """
)
def list_validated_journeys(
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Liste tous les trajets validés de l'utilisateur."""
    return list_validated_journeys_core(session, current_user.id)


@router.get(
    "/{journey_id}",
    response_model=JourneyRead,
    summary="Récupérer un trajet",
    description="Récupère un trajet par son ID. L'utilisateur ne peut accéder qu'à ses propres trajets."
)
def get_journey(
    journey_id: int,
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Récupère un trajet par son ID."""
    return get_journey_core(session, journey_id, current_user.id)


@router.post(
    "/{journey_id}/reject",
    response_model=JourneyRead,
    summary="Rejeter un trajet",
    description="""
    Rejette un trajet.

    Un trajet rejeté :
    - N'est pas comptabilisé dans les statistiques
    - N'attribue aucun point
    - Est conservé en base pour audit
    - Ne peut plus être validé
    """
)
def reject_journey(
    journey_id: int,
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Rejette un trajet."""
    return reject_journey_core(session, journey_id, current_user.id)


@router.delete(
    "/{journey_id}",
    status_code=status.HTTP_200_OK,
    summary="Supprimer un trajet",
    description="""
    Supprime définitivement un trajet.

    Note : Dans un système de production, on préférerait un soft delete.
    """
)
def delete_journey(
    journey_id: int,
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Supprime un trajet."""
    return delete_journey_core(session, journey_id, current_user.id)


@router.get(
    "/statistics/me",
    summary="Récupérer mes statistiques",
    description="""
    Récupère les statistiques simplifiées de l'utilisateur connecté.

    Calcule :
    - Nombre total de trajets validés
    - Distance totale parcourue
    - Score total
    """
)
def get_my_statistics(
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Récupère les statistiques de l'utilisateur."""
    return get_user_statistics_core(session, current_user.id)
