from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional


class ScoreHistory(SQLModel, table=True):
    """
    Historique des calculs de score pour traçabilité.

    Permet de :
    - Tracer comment chaque score a été calculé
    - Auditer les récompenses attribuées
    - Recalculer les scores si les règles changent
    - Justifier les points attribués
    """
    __tablename__ = "score_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    id_journey: int = Field(foreign_key="Journey.id", nullable=False, index=True)
    score_value: int = Field(nullable=False)

    # Détails du calcul
    base_score: int = Field(nullable=False, description="Score de base selon le mode de transport")
    distance_bonus: int = Field(default=0, description="Bonus selon la distance parcourue")
    eco_bonus: int = Field(default=0, description="Bonus écologique (marche, vélo)")

    # Métadonnées de calcul
    calculation_method: str = Field(max_length=50, default="v1.0", description="Version de l'algorithme de calcul")
    calculated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Données du trajet au moment du calcul (pour historique)
    transport_type: str = Field(max_length=50, nullable=False)
    distance_km: float = Field(nullable=False)


class ScoreHistoryRead(SQLModel):
    """Schéma de lecture pour l'historique des scores."""
    id: int
    id_journey: int
    score_value: int
    base_score: int
    distance_bonus: int
    eco_bonus: int
    calculation_method: str
    calculated_at: datetime
    transport_type: str
    distance_km: float
