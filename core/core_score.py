"""
Logique métier de calcul de score pour les trajets (V1 simplifiée POC).

Le score est calculé une seule fois lors de la création du trajet validé.
Pas d'historique, pas de recalcul - simplicité maximale pour la V1.
"""

from sqlmodel import Session
from models.model_transport_type import TransportType
from models.model_journey import Journey


# Configuration des scores de base par mode de transport
TRANSPORT_BASE_SCORES = {
    TransportType.marche: 100,
    TransportType.velo: 90,
    TransportType.transport_commun: 70,
    TransportType.voiture: 20,
}

# Modes actifs éligibles au bonus écologique
ECO_BONUS_MODES = {
    TransportType.marche,
    TransportType.velo,
}

# Paramètres de calcul
DISTANCE_BONUS_PER_KM = 2  # 2 points par km
ECO_BONUS_BASE = 50  # Bonus écologique de base


def calculate_and_save_score(
    session: Session,
    journey: Journey
) -> None:
    """
    Calcule le score d'un trajet et le sauvegarde directement.

    Args:
        session: Session SQLModel
        journey: Trajet pour lequel calculer le score

    Logique :
        - Base score : dépend du mode de transport
        - Distance bonus : 2 points par km
        - Eco bonus : 50 points si mode actif (marche, vélo)
    """
    # Score de base selon le mode de transport
    base_score = TRANSPORT_BASE_SCORES.get(journey.transport_type, 0)

    # Bonus distance : 2 points par km
    distance_bonus = int(journey.distance_km * DISTANCE_BONUS_PER_KM)

    # Bonus écologique : 50 points pour les modes actifs
    eco_bonus = ECO_BONUS_BASE if journey.transport_type in ECO_BONUS_MODES else 0

    # Score total
    score_total = base_score + distance_bonus + eco_bonus

    # Mise à jour du score dans le trajet
    journey.score_journey = score_total

    # Commit des changements
    session.commit()
