package com.greenmobilitypass.detection.models

/**
 * Représente une activité détectée par l'Activity Recognition API.
 *
 * Types d'activités reconnus :
 * - STATIONARY : Utilisateur immobile
 * - WALKING : Marche à pied
 * - RUNNING : Course à pied
 * - CYCLING : Vélo
 * - IN_VEHICLE : En véhicule (voiture, bus, train, etc.)
 * - UNKNOWN : Activité inconnue
 */
enum class ActivityType {
    STATIONARY,
    WALKING,
    RUNNING,
    CYCLING,
    IN_VEHICLE,
    UNKNOWN
}

/**
 * Modèle d'activité détectée avec niveau de confiance.
 *
 * @property type Type d'activité détectée
 * @property confidence Niveau de confiance (0-100)
 * @property timestamp Horodatage de la détection
 */
data class DetectedActivity(
    val type: ActivityType,
    val confidence: Int,
    val timestamp: Long = System.currentTimeMillis()
) {
    /**
     * Convertit en type de transport backend.
     * Règles de mapping :
     * - WALKING/RUNNING -> "apied"
     * - CYCLING -> "velo"
     * - IN_VEHICLE -> "transport_commun" (par défaut, l'utilisateur pourra ajuster)
     * - STATIONARY/UNKNOWN -> null
     */
    fun toTransportType(): String? {
        return when (type) {
            ActivityType.WALKING, ActivityType.RUNNING -> "apied"
            ActivityType.CYCLING -> "velo"
            ActivityType.IN_VEHICLE -> "transport_commun"
            ActivityType.STATIONARY, ActivityType.UNKNOWN -> null
        }
    }

    /**
     * Vérifie si l'activité est considérée comme "en mouvement".
     */
    fun isMoving(): Boolean {
        return type != ActivityType.STATIONARY && type != ActivityType.UNKNOWN
    }

    /**
     * Vérifie si la confiance est suffisante (>= 60%).
     */
    fun isConfident(): Boolean {
        return confidence >= 60
    }
}
