"""
Logique métier de calcul de score pour les trajets.

Le score est calculé selon :
- Un score de base selon le mode de transport
- Un bonus proportionnel à la distance
- Un bonus écologique pour les modes actifs

Cette logique est traçable via la table ScoreHistory.
"""

from sqlmodel import Session
from models.model_transport_type import TransportType
from models.model_journey import Journey
from models.model_score_history import ScoreHistory
from datetime import datetime


# Configuration des scores de base par mode de transport
TRANSPORT_BASE_SCORES = {
    # Modes actifs (score élevé)
    TransportType.marcheapied: 100,
    TransportType.velo: 90,
    TransportType.trottinette: 80,

    # Transports en commun (score moyen-élevé)
    TransportType.metro: 70,
    TransportType.tramway: 70,
    TransportType.bus: 65,
    TransportType.train: 75,

    # Covoiturage (score moyen)
    TransportType.covoiturage: 50,

    # Véhicules individuels (score faible)
    TransportType.voiture_electrique: 30,
    TransportType.voiture_thermique: 10,
    TransportType.moto: 15,
}

# Modes actifs éligibles au bonus écologique
ECO_BONUS_MODES = {
    TransportType.marcheapied,
    TransportType.velo,
    TransportType.trottinette,
}

# Paramètres de calcul
DISTANCE_BONUS_PER_KM = 2  # 2 points par km
ECO_BONUS_BASE = 50  # Bonus écologique de base
CALCULATION_METHOD_VERSION = "v1.0"


def calculate_score(
    transport_type: TransportType,
    distance_km: float
) -> tuple[int, int, int, int]:
    """
    Calcule le score d'un trajet.

    Args:
        transport_type: Type de transport utilisé
        distance_km: Distance parcourue en kilomètres

    Returns:
        tuple (score_total, base_score, distance_bonus, eco_bonus)

    Logique :
        - Base score : dépend du mode de transport
        - Distance bonus : 2 points par km
        - Eco bonus : 50 points si mode actif (marche, vélo, trottinette)
    """
    # Score de base selon le mode de transport
    base_score = TRANSPORT_BASE_SCORES.get(transport_type, 0)

    # Bonus distance : 2 points par km
    distance_bonus = int(distance_km * DISTANCE_BONUS_PER_KM)

    # Bonus écologique : 50 points pour les modes actifs
    eco_bonus = ECO_BONUS_BASE if transport_type in ECO_BONUS_MODES else 0

    # Score total
    score_total = base_score + distance_bonus + eco_bonus

    return score_total, base_score, distance_bonus, eco_bonus


def calculate_and_save_score(
    session: Session,
    journey: Journey
) -> ScoreHistory:
    """
    Calcule le score d'un trajet et l'enregistre dans l'historique.

    Args:
        session: Session SQLModel
        journey: Trajet pour lequel calculer le score

    Returns:
        ScoreHistory: Enregistrement de l'historique du score

    Cette fonction :
    1. Calcule le score selon les règles définies
    2. Met à jour le trajet avec le score calculé
    3. Enregistre les détails du calcul dans ScoreHistory
    4. Commit les changements
    """
    # Calcul du score
    score_total, base_score, distance_bonus, eco_bonus = calculate_score(
        transport_type=journey.transport_type,
        distance_km=journey.distance_km
    )

    # Mise à jour du score dans le trajet
    journey.score_journey = score_total

    # Création de l'enregistrement d'historique
    score_history = ScoreHistory(
        id_journey=journey.id,
        score_value=score_total,
        base_score=base_score,
        distance_bonus=distance_bonus,
        eco_bonus=eco_bonus,
        calculation_method=CALCULATION_METHOD_VERSION,
        calculated_at=datetime.utcnow(),
        transport_type=journey.transport_type.value,
        distance_km=journey.distance_km
    )

    # Enregistrement en base
    session.add(score_history)
    session.commit()
    session.refresh(score_history)

    return score_history


def recalculate_journey_score(
    session: Session,
    journey_id: int
) -> ScoreHistory:
    """
    Recalcule le score d'un trajet existant.

    Utile si :
    - Les règles de calcul ont changé
    - Le trajet a été modifié
    - Audit des scores

    Args:
        session: Session SQLModel
        journey_id: ID du trajet

    Returns:
        ScoreHistory: Nouvel enregistrement d'historique
    """
    journey = session.get(Journey, journey_id)
    if not journey:
        raise ValueError(f"Journey {journey_id} not found")

    return calculate_and_save_score(session, journey)


def get_score_history_for_journey(
    session: Session,
    journey_id: int
) -> list[ScoreHistory]:
    """
    Récupère l'historique complet des calculs de score pour un trajet.

    Args:
        session: Session SQLModel
        journey_id: ID du trajet

    Returns:
        list[ScoreHistory]: Liste des calculs de score
    """
    from sqlmodel import select

    statement = select(ScoreHistory).where(
        ScoreHistory.id_journey == journey_id
    ).order_by(ScoreHistory.calculated_at.desc())

    return session.exec(statement).all()
