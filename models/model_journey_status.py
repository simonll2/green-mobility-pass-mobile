from enum import Enum


class JourneyStatus(str, Enum):
    """
    Statut du cycle de vie d'un trajet.

    - DETECTED: Trajet détecté automatiquement (pas encore utilisé dans le POC)
    - PENDING_VALIDATION: Trajet en attente de validation utilisateur
    - VALIDATED: Trajet validé par l'utilisateur, éligible aux récompenses
    - REJECTED: Trajet rejeté par l'utilisateur
    - MODIFIED: Trajet modifié par l'utilisateur avant validation
    """
    DETECTED = "detected"
    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    REJECTED = "rejected"
    MODIFIED = "modified"
