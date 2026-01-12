package com.greenmobilitypass.detection.models

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.text.SimpleDateFormat
import java.util.*

/**
 * Représente un trajet local détecté par l'application.
 *
 * Un trajet local :
 * - Est détecté automatiquement ou créé manuellement
 * - Est stocké localement dans l'app
 * - Peut être validé ou rejeté par l'utilisateur
 * - N'est envoyé au backend que s'il est validé
 *
 * Cycle de vie :
 * ONGOING (détection en cours) -> COMPLETED (détection terminée)
 * -> VALIDATED (validé par utilisateur) ou REJECTED (rejeté par utilisateur)
 */
data class LocalJourney(
    val id: String = UUID.randomUUID().toString(),
    val startTime: Long,
    var endTime: Long? = null,
    var activityType: ActivityType,
    var distanceMeters: Double = 0.0,
    val locations: MutableList<LocationPoint> = mutableListOf(),
    var status: JourneyStatus = JourneyStatus.ONGOING
) {
    enum class JourneyStatus {
        ONGOING,    // Trajet en cours de détection
        COMPLETED,  // Trajet détecté terminé, en attente de validation
        VALIDATED,  // Trajet validé par l'utilisateur
        REJECTED    // Trajet rejeté par l'utilisateur
    }

    /**
     * Calcule la durée du trajet en minutes.
     */
    fun getDurationMinutes(): Int {
        val end = endTime ?: System.currentTimeMillis()
        return ((end - startTime) / (1000 * 60)).toInt()
    }

    /**
     * Calcule la distance en kilomètres.
     */
    fun getDistanceKm(): Double {
        return distanceMeters / 1000.0
    }

    /**
     * Vérifie si le trajet est valide (distance et durée minimales).
     * Seuils :
     * - Distance > 100m (évite les micro-mouvements)
     * - Durée > 2 minutes
     */
    fun isValid(): Boolean {
        return distanceMeters > 100 && getDurationMinutes() >= 2
    }

    /**
     * Ajoute un point GPS au trajet.
     */
    fun addLocation(location: LocationPoint) {
        locations.add(location)
    }

    /**
     * Termine le trajet (passe en COMPLETED).
     */
    fun complete() {
        if (endTime == null) {
            endTime = System.currentTimeMillis()
        }
        status = JourneyStatus.COMPLETED
    }

    /**
     * Convertit en objet React Native WritableMap pour envoi vers JS.
     */
    fun toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        map.putString("id", id)
        map.putString("startTime", dateFormat.format(Date(startTime)))
        endTime?.let { map.putString("endTime", dateFormat.format(Date(it))) }
        map.putString("activityType", activityType.name)
        map.putDouble("distanceKm", getDistanceKm())
        map.putInt("durationMinutes", getDurationMinutes())
        map.putString("status", status.name)

        // Localisation de départ/arrivée (première et dernière location)
        if (locations.isNotEmpty()) {
            val firstLocation = locations.first()
            val lastLocation = locations.last()

            map.putDouble("startLatitude", firstLocation.latitude)
            map.putDouble("startLongitude", firstLocation.longitude)
            map.putDouble("endLatitude", lastLocation.latitude)
            map.putDouble("endLongitude", lastLocation.longitude)
        }

        return map
    }
}

/**
 * Point GPS enregistré pendant un trajet.
 */
data class LocationPoint(
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val accuracy: Float = 0f
)
