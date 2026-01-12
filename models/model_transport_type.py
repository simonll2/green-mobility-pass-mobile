from enum import Enum


class TransportType(str, Enum):
    """
    Types de transport disponibles.

    Classés par ordre d'impact écologique (du plus au moins écologique).
    """
    # Modes actifs (zéro émission)
    marcheapied = "apied"
    velo = "velo"
    trottinette = "trottinette"

    # Transports en commun (émission partagée)
    metro = "metro"
    bus = "bus"
    tramway = "tramway"
    train = "train"

    # Covoiturage
    covoiturage = "covoiturage"

    # Véhicules individuels
    voiture_electrique = "voiture_electrique"
    voiture_thermique = "voiture_thermique"
    moto = "moto"
