from enum import Enum


class DetectionSource(str, Enum):
    """
    Source de détection du trajet.

    - AUTO: Trajet détecté automatiquement par les capteurs du smartphone
    - MANUAL: Trajet saisi manuellement par l'utilisateur
    """
    AUTO = "auto"
    MANUAL = "manual"
