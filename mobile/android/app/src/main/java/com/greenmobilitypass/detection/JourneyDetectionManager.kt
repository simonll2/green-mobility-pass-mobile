package com.greenmobilitypass.detection

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.greenmobilitypass.detection.models.ActivityType
import com.greenmobilitypass.detection.models.DetectedActivity
import com.greenmobilitypass.detection.models.LocalJourney
import com.greenmobilitypass.detection.models.LocationPoint
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Gestionnaire central de la détection automatique de trajets.
 *
 * Responsabilités :
 * - Orchestrer la détection d'activité et le tracking GPS
 * - Gérer le cycle de vie des trajets (ouverture/clôture automatique)
 * - Filtrer les micro-trajets non pertinents
 * - Calculer les distances parcourues
 * - Émettre les événements vers React Native
 * - Persister les trajets localement
 *
 * Design Pattern : Singleton
 */
class JourneyDetectionManager private constructor(
    private val reactContext: ReactApplicationContext
) {
    companion object {
        @Volatile
        private var instance: JourneyDetectionManager? = null

        fun getInstance(context: ReactApplicationContext): JourneyDetectionManager {
            return instance ?: synchronized(this) {
                instance ?: JourneyDetectionManager(context).also { instance = it }
            }
        }

        // Constantes de configuration
        private const val MIN_JOURNEY_DISTANCE_METERS = 100.0
        private const val MIN_JOURNEY_DURATION_MINUTES = 2
        private const val STATIONARY_TIMEOUT_MS = 5 * 60 * 1000L // 5 minutes
        private const val PREFS_NAME = "journey_detection"
        private const val PREFS_KEY_JOURNEYS = "local_journeys"
        private const val PREFS_KEY_CURRENT = "current_journey_id"
    }

    private val prefs: SharedPreferences = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // État de la détection
    var isDetecting: Boolean = false
        private set

    // Trajet en cours
    private var currentJourney: LocalJourney? = null

    // Dernière activité détectée
    private var lastActivity: DetectedActivity? = null
    private var lastActivityChangeTime: Long = 0

    // Temps depuis lequel l'utilisateur est stationnaire
    private var stationarySinceTime: Long? = null

    /**
     * Démarre la détection de trajets.
     */
    fun startDetection() {
        if (isDetecting) return

        isDetecting = true
        sendEvent("onDetectionStarted", Arguments.createMap())

        // Restaurer le trajet en cours si existant
        restoreCurrentJourney()
    }

    /**
     * Arrête la détection de trajets.
     */
    fun stopDetection() {
        if (!isDetecting) return

        isDetecting = false

        // Terminer le trajet en cours s'il existe
        currentJourney?.let { completeJourney(it) }

        sendEvent("onDetectionStopped", Arguments.createMap())
    }

    /**
     * Appelé lorsqu'une nouvelle activité est détectée.
     */
    fun onActivityDetected(activity: DetectedActivity) {
        if (!isDetecting) return

        lastActivity = activity
        sendEvent("onActivityChanged", Arguments.createMap().apply {
            putString("activityType", activity.type.name)
            putInt("confidence", activity.confidence)
        })

        when {
            // L'utilisateur est stationnaire
            activity.type == ActivityType.STATIONARY -> handleStationaryActivity()

            // L'utilisateur commence à bouger
            activity.isMoving() && activity.isConfident() -> handleMovingActivity(activity)
        }
    }

    /**
     * Appelé lorsqu'une nouvelle position GPS est reçue.
     */
    fun onLocationUpdate(location: LocationPoint) {
        if (!isDetecting) return

        currentJourney?.let { journey ->
            // Ajouter la position au trajet
            journey.addLocation(location)

            // Calculer la distance depuis le dernier point
            if (journey.locations.size >= 2) {
                val previousLocation = journey.locations[journey.locations.size - 2]
                val distance = calculateDistance(
                    previousLocation.latitude, previousLocation.longitude,
                    location.latitude, location.longitude
                )
                journey.distanceMeters += distance
            }

            // Sauvegarder le trajet mis à jour
            saveCurrentJourney(journey)

            // Émettre un événement de mise à jour
            sendEvent("onJourneyUpdated", journey.toWritableMap())
        }
    }

    /**
     * Récupère tous les trajets sauvegardés.
     */
    fun getSavedJourneys(): List<LocalJourney> {
        val journeysJson = prefs.getString(PREFS_KEY_JOURNEYS, "[]") ?: "[]"
        return parseJourneys(journeysJson)
    }

    /**
     * Récupère le trajet en cours.
     */
    fun getCurrentJourney(): LocalJourney? = currentJourney

    // ========== Gestion du cycle de vie des trajets ==========

    /**
     * Gère l'activité stationnaire (utilisateur immobile).
     */
    private fun handleStationaryActivity() {
        val now = System.currentTimeMillis()

        // Initialiser le temps de stationnement
        if (stationarySinceTime == null) {
            stationarySinceTime = now
        }

        // Si stationnaire depuis > 5 minutes, terminer le trajet
        val stationaryDuration = now - (stationarySinceTime ?: now)
        if (stationaryDuration > STATIONARY_TIMEOUT_MS) {
            currentJourney?.let { completeJourney(it) }
        }
    }

    /**
     * Gère l'activité en mouvement.
     */
    private fun handleMovingActivity(activity: DetectedActivity) {
        stationarySinceTime = null

        if (currentJourney == null) {
            // Démarrer un nouveau trajet
            startNewJourney(activity)
        } else {
            // Mettre à jour le type d'activité si changement significatif
            val journey = currentJourney!!
            if (journey.activityType != activity.type) {
                journey.activityType = activity.type
                saveCurrentJourney(journey)
            }
        }
    }

    /**
     * Démarre un nouveau trajet.
     */
    private fun startNewJourney(activity: DetectedActivity) {
        val journey = LocalJourney(
            startTime = System.currentTimeMillis(),
            activityType = activity.type
        )

        currentJourney = journey
        saveCurrentJourney(journey)

        sendEvent("onJourneyStarted", journey.toWritableMap())
    }

    /**
     * Termine un trajet en cours.
     */
    private fun completeJourney(journey: LocalJourney) {
        journey.complete()

        // Vérifier si le trajet est valide
        if (journey.isValid()) {
            // Sauvegarder dans la liste des trajets
            saveJourney(journey)
            sendEvent("onJourneyCompleted", journey.toWritableMap())
        } else {
            // Trajet trop court, on le rejette
            sendEvent("onJourneyDiscarded", journey.toWritableMap())
        }

        currentJourney = null
        clearCurrentJourney()
    }

    // ========== Persistence locale ==========

    /**
     * Sauvegarde le trajet en cours.
     */
    private fun saveCurrentJourney(journey: LocalJourney) {
        prefs.edit()
            .putString(PREFS_KEY_CURRENT, journeyToJson(journey))
            .apply()
    }

    /**
     * Supprime le trajet en cours.
     */
    private fun clearCurrentJourney() {
        prefs.edit()
            .remove(PREFS_KEY_CURRENT)
            .apply()
    }

    /**
     * Restaure le trajet en cours depuis les préférences.
     */
    private fun restoreCurrentJourney() {
        val journeyJson = prefs.getString(PREFS_KEY_CURRENT, null)
        if (journeyJson != null) {
            currentJourney = jsonToJourney(journeyJson)
        }
    }

    /**
     * Sauvegarde un trajet terminé dans la liste.
     */
    private fun saveJourney(journey: LocalJourney) {
        val journeys = getSavedJourneys().toMutableList()
        journeys.add(journey)

        val journeysJson = journeysToJson(journeys)
        prefs.edit()
            .putString(PREFS_KEY_JOURNEYS, journeysJson)
            .apply()
    }

    // ========== Sérialisation JSON ==========

    private fun journeyToJson(journey: LocalJourney): String {
        val json = JSONObject()
        json.put("id", journey.id)
        json.put("startTime", journey.startTime)
        json.put("endTime", journey.endTime)
        json.put("activityType", journey.activityType.name)
        json.put("distanceMeters", journey.distanceMeters)
        json.put("status", journey.status.name)

        val locationsArray = JSONArray()
        journey.locations.forEach { loc ->
            val locJson = JSONObject()
            locJson.put("latitude", loc.latitude)
            locJson.put("longitude", loc.longitude)
            locJson.put("timestamp", loc.timestamp)
            locJson.put("accuracy", loc.accuracy)
            locationsArray.put(locJson)
        }
        json.put("locations", locationsArray)

        return json.toString()
    }

    private fun jsonToJourney(json: String): LocalJourney {
        val obj = JSONObject(json)
        val journey = LocalJourney(
            id = obj.getString("id"),
            startTime = obj.getLong("startTime"),
            endTime = if (obj.has("endTime") && !obj.isNull("endTime")) obj.getLong("endTime") else null,
            activityType = ActivityType.valueOf(obj.getString("activityType")),
            distanceMeters = obj.getDouble("distanceMeters"),
            status = LocalJourney.JourneyStatus.valueOf(obj.getString("status"))
        )

        val locationsArray = obj.getJSONArray("locations")
        for (i in 0 until locationsArray.length()) {
            val locObj = locationsArray.getJSONObject(i)
            journey.addLocation(LocationPoint(
                latitude = locObj.getDouble("latitude"),
                longitude = locObj.getDouble("longitude"),
                timestamp = locObj.getLong("timestamp"),
                accuracy = locObj.getDouble("accuracy").toFloat()
            ))
        }

        return journey
    }

    private fun journeysToJson(journeys: List<LocalJourney>): String {
        val array = JSONArray()
        journeys.forEach { array.put(journeyToJson(it)) }
        return array.toString()
    }

    private fun parseJourneys(json: String): List<LocalJourney> {
        val array = JSONArray(json)
        val journeys = mutableListOf<LocalJourney>()
        for (i in 0 until array.length()) {
            journeys.add(jsonToJourney(array.getString(i)))
        }
        return journeys
    }

    // ========== Utilitaires ==========

    /**
     * Calcule la distance en mètres entre deux coordonnées GPS (formule de Haversine).
     */
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371000.0 // Rayon de la Terre en mètres
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)

        val a = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2).pow(2)

        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }

    /**
     * Envoie un événement vers React Native.
     */
    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
