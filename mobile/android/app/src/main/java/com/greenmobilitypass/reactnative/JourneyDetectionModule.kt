package com.greenmobilitypass.reactnative

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionListener
import com.greenmobilitypass.detection.ActivityDetectionService
import com.greenmobilitypass.detection.JourneyDetectionManager
import com.greenmobilitypass.detection.LocationTrackingService
import com.greenmobilitypass.detection.models.ActivityType
import com.greenmobilitypass.detection.models.DetectedActivity
import com.greenmobilitypass.detection.models.LocationPoint

/**
 * Native Module React Native pour la détection de trajets.
 *
 * API exposée vers JavaScript :
 * - startDetection() : Démarre la détection automatique
 * - stopDetection() : Arrête la détection
 * - isDetecting() : Vérifie si la détection est active
 * - getCurrentJourney() : Récupère le trajet en cours
 * - getSavedJourneys() : Récupère tous les trajets sauvegardés
 * - requestPermissions() : Demande les permissions nécessaires
 * - checkPermissions() : Vérifie si les permissions sont accordées
 *
 * Événements émis vers JavaScript :
 * - onDetectionStarted : Détection démarrée
 * - onDetectionStopped : Détection arrêtée
 * - onActivityChanged : Activité détectée changée
 * - onJourneyStarted : Nouveau trajet démarré
 * - onJourneyUpdated : Trajet en cours mis à jour
 * - onJourneyCompleted : Trajet terminé et valide
 * - onJourneyDiscarded : Trajet terminé mais rejeté (trop court)
 */
class JourneyDetectionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PermissionListener {

    companion object {
        const val NAME = "JourneyDetection"

        private val REQUIRED_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                Manifest.permission.ACTIVITY_RECOGNITION
            )
        } else {
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACTIVITY_RECOGNITION
            )
        }
    }

    private val detectionManager: JourneyDetectionManager by lazy {
        JourneyDetectionManager.getInstance(reactApplicationContext)
    }

    private var permissionPromise: Promise? = null

    // BroadcastReceivers pour les événements système
    private val activityReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                val activityType = ActivityType.valueOf(it.getStringExtra("activityType") ?: "UNKNOWN")
                val confidence = it.getIntExtra("confidence", 0)
                val timestamp = it.getLongExtra("timestamp", System.currentTimeMillis())

                val detectedActivity = DetectedActivity(activityType, confidence, timestamp)
                detectionManager.onActivityDetected(detectedActivity)
            }
        }
    }

    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                val latitude = it.getDoubleExtra("latitude", 0.0)
                val longitude = it.getDoubleExtra("longitude", 0.0)
                val timestamp = it.getLongExtra("timestamp", System.currentTimeMillis())
                val accuracy = it.getFloatExtra("accuracy", 0f)

                val locationPoint = LocationPoint(latitude, longitude, timestamp, accuracy)
                detectionManager.onLocationUpdate(locationPoint)
            }
        }
    }

    init {
        // Enregistrer les receivers
        val activityFilter = IntentFilter("com.greenmobilitypass.ACTIVITY_DETECTED")
        val locationFilter = IntentFilter("com.greenmobilitypass.LOCATION_UPDATE")

        reactContext.registerReceiver(activityReceiver, activityFilter)
        reactContext.registerReceiver(locationReceiver, locationFilter)
    }

    override fun getName(): String = NAME

    /**
     * Démarre la détection de trajets.
     */
    @ReactMethod
    fun startDetection(promise: Promise) {
        try {
            // Vérifier les permissions
            if (!hasRequiredPermissions()) {
                promise.reject("PERMISSIONS_ERROR", "Required permissions not granted")
                return
            }

            // Démarrer le manager
            detectionManager.startDetection()

            // Démarrer les services
            val activityIntent = Intent(reactApplicationContext, ActivityDetectionService::class.java)
            val locationIntent = Intent(reactApplicationContext, LocationTrackingService::class.java)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(activityIntent)
                reactApplicationContext.startForegroundService(locationIntent)
            } else {
                reactApplicationContext.startService(activityIntent)
                reactApplicationContext.startService(locationIntent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    /**
     * Arrête la détection de trajets.
     */
    @ReactMethod
    fun stopDetection(promise: Promise) {
        try {
            detectionManager.stopDetection()

            // Arrêter les services
            val activityIntent = Intent(reactApplicationContext, ActivityDetectionService::class.java)
            val locationIntent = Intent(reactApplicationContext, LocationTrackingService::class.java)

            reactApplicationContext.stopService(activityIntent)
            reactApplicationContext.stopService(locationIntent)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    /**
     * Vérifie si la détection est active.
     */
    @ReactMethod
    fun isDetecting(promise: Promise) {
        try {
            promise.resolve(detectionManager.isDetecting)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    /**
     * Récupère le trajet en cours.
     */
    @ReactMethod
    fun getCurrentJourney(promise: Promise) {
        try {
            val journey = detectionManager.getCurrentJourney()
            if (journey != null) {
                promise.resolve(journey.toWritableMap())
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("GET_CURRENT_ERROR", e.message)
        }
    }

    /**
     * Récupère tous les trajets sauvegardés.
     */
    @ReactMethod
    fun getSavedJourneys(promise: Promise) {
        try {
            val journeys = detectionManager.getSavedJourneys()
            val array = Arguments.createArray()

            journeys.forEach { journey ->
                array.pushMap(journey.toWritableMap())
            }

            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("GET_JOURNEYS_ERROR", e.message)
        }
    }

    /**
     * Demande les permissions nécessaires.
     */
    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val activity = currentActivity

        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            return
        }

        if (hasRequiredPermissions()) {
            promise.resolve(true)
            return
        }

        permissionPromise = promise

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            activity.requestPermissions(REQUIRED_PERMISSIONS, 1, this)
        } else {
            promise.resolve(true)
        }
    }

    /**
     * Vérifie si les permissions sont accordées.
     */
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            promise.resolve(hasRequiredPermissions())
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSIONS_ERROR", e.message)
        }
    }

    /**
     * Vérifie si toutes les permissions requises sont accordées.
     */
    private fun hasRequiredPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(
                reactApplicationContext,
                permission
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Callback des permissions.
     */
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>?,
        grantResults: IntArray?
    ): Boolean {
        if (requestCode == 1) {
            val allGranted = grantResults?.all { it == PackageManager.PERMISSION_GRANTED } ?: false
            permissionPromise?.resolve(allGranted)
            permissionPromise = null
            return true
        }
        return false
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        // Désenregistrer les receivers
        try {
            reactApplicationContext.unregisterReceiver(activityReceiver)
            reactApplicationContext.unregisterReceiver(locationReceiver)
        } catch (e: Exception) {
            // Ignore if already unregistered
        }
    }
}
