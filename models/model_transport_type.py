from enum import Enum


class TransportType(str, Enum):
    """
    Types de transport disponibles (V1 simplifiée POC).

    Limité aux 4 catégories principales pour éviter toute ambiguïté.
    """
    marche = "marche"
    velo = "velo"
    transport_commun = "transport_commun"
    voiture = "voiture"
