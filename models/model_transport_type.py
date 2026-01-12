from enum import Enum


class TransportType(str, Enum):
    """
    Types de transport disponibles (V1 simplifiée POC).

    Limité aux 4 catégories principales pour éviter toute ambiguïté.
    """
    marcheapied = "apied"
    velo = "velo"
    transport_commun = "transport_commun"
    voiture = "voiture"
