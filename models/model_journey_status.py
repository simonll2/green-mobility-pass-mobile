from enum import Enum


class JourneyStatus(str, Enum):
    """
    Statut du cycle de vie d'un trajet (V1 simplifiée POC).

    - VALIDATED: Trajet validé par l'utilisateur, éligible aux récompenses
    - REJECTED: Trajet rejeté par l'utilisateur
    """
    VALIDATED = "validated"
    REJECTED = "rejected"
