from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from models.model_transport_type import TransportType
from models.model_journey_status import JourneyStatus
from models.model_detection_source import DetectionSource
from models.model_user import Users


class Journey(SQLModel, table=True):
    """
    Modèle de trajet enrichi avec cycle de vie complet.

    Distinction entre données brutes (détectées) et données validées.
    Le statut permet de suivre le parcours du trajet depuis la détection
    jusqu'à la validation finale qui déclenche l'attribution des récompenses.
    """
    __tablename__ = "Journey"

    # Identifiants
    id: Optional[int] = Field(default=None, primary_key=True)
    id_user: int = Field(foreign_key="users.id", nullable=False, index=True)

    # Cycle de vie
    status: JourneyStatus = Field(
        default=JourneyStatus.VALIDATED,
        nullable=False,
        index=True,
        description="Statut du trajet dans son cycle de vie"
    )
    detection_source: DetectionSource = Field(
        default=DetectionSource.MANUAL,
        nullable=False,
        description="Source de détection du trajet"
    )

    # Données spatiales et temporelles (données brutes ou validées)
    place_departure: str = Field(max_length=200, nullable=False)
    place_arrival: str = Field(max_length=200, nullable=False)
    time_departure: datetime = Field(nullable=False)
    time_arrival: datetime = Field(nullable=False)

    # Données calculées
    distance_km: float = Field(
        default=0.0,
        nullable=False,
        description="Distance en kilomètres"
    )
    duration_minutes: int = Field(
        default=0,
        nullable=False,
        description="Durée en minutes"
    )

    # Mode de transport
    transport_type: TransportType = Field(nullable=False)

    # Score (calculé après validation)
    score_journey: Optional[int] = Field(
        default=None,
        description="Score total attribué (calculé après validation)"
    )

    # Métadonnées de modification
    original_place_departure: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Lieu de départ original (avant modification utilisateur)"
    )
    original_place_arrival: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Lieu d'arrivée original (avant modification utilisateur)"
    )
    original_transport_type: Optional[TransportType] = Field(
        default=None,
        description="Mode de transport original (avant modification utilisateur)"
    )

    # Dates de gestion
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="Date de création du trajet"
    )
    validated_at: Optional[datetime] = Field(
        default=None,
        description="Date de validation par l'utilisateur"
    )
    rejected_at: Optional[datetime] = Field(
        default=None,
        description="Date de rejet par l'utilisateur"
    )


class JourneyCreate(SQLModel):
    """
    Schéma de création d'un trajet VALIDÉ.

    L'utilisateur envoie uniquement des trajets qu'il a validés depuis l'app mobile.
    Le backend n'a pas besoin de recevoir les trajets en attente de validation.
    """
    place_departure: str
    place_arrival: str
    time_departure: datetime
    time_arrival: datetime
    distance_km: float
    transport_type: TransportType
    detection_source: DetectionSource = DetectionSource.MANUAL


class JourneyUpdate(SQLModel):
    """
    Schéma de modification d'un trajet avant validation.

    Permet à l'utilisateur de corriger les données détectées automatiquement.
    """
    place_departure: Optional[str] = None
    place_arrival: Optional[str] = None
    time_departure: Optional[datetime] = None
    time_arrival: Optional[datetime] = None
    distance_km: Optional[float] = None
    transport_type: Optional[TransportType] = None


class JourneyRead(SQLModel):
    """Schéma de lecture d'un trajet."""
    id: int
    id_user: int
    status: JourneyStatus
    detection_source: DetectionSource
    place_departure: str
    place_arrival: str
    time_departure: datetime
    time_arrival: datetime
    distance_km: float
    duration_minutes: int
    transport_type: TransportType
    score_journey: Optional[int]
    created_at: datetime
    validated_at: Optional[datetime]
    rejected_at: Optional[datetime]


class JourneyReadWithModifications(JourneyRead):
    """Schéma de lecture d'un trajet avec historique des modifications."""
    original_place_departure: Optional[str]
    original_place_arrival: Optional[str]
    original_transport_type: Optional[TransportType]