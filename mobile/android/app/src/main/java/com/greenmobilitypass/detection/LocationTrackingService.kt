package com.greenmobilitypass.detection

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.greenmobilitypass.MainActivity
import com.greenmobilitypass.detection.models.LocationPoint

/**
 * Service Android de tracking GPS en arrière-plan.
 *
 * Caractéristiques :
 * - Fréquence de mise à jour : toutes les 30 secondes (faible batterie)
 * - Priorité : BALANCED_POWER_ACCURACY (compromis précision/batterie)
 * - Actif uniquement pendant les trajets détectés
 *
 * Le service tourne en foreground pour garantir le tracking même
 * lorsque l'app est en arrière-plan.
 */
class LocationTrackingService : Service() {

    companion object {
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val NOTIFICATION_ID = 1002
        private const val UPDATE_INTERVAL_MS = 30000L // 30 secondes
        private const val FASTEST_INTERVAL_MS = 15000L // 15 secondes minimum
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var isTracking = false

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Démarrer en foreground
        startForeground(NOTIFICATION_ID, createNotification())

        // Démarrer le tracking GPS
        startLocationTracking()

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopLocationTracking()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * Configure le callback de réception des positions GPS.
     */
    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    onLocationReceived(location)
                }
            }
        }
    }

    /**
     * Démarre le tracking GPS.
     */
    private fun startLocationTracking() {
        if (isTracking) return

        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            UPDATE_INTERVAL_MS
        ).apply {
            setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            setWaitForAccurateLocation(false)
        }.build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        isTracking = true
    }

    /**
     * Arrête le tracking GPS.
     */
    private fun stopLocationTracking() {
        if (!isTracking) return

        fusedLocationClient.removeLocationUpdates(locationCallback)
        isTracking = false
    }

    /**
     * Appelé lorsqu'une nouvelle position GPS est reçue.
     */
    private fun onLocationReceived(location: Location) {
        val locationPoint = LocationPoint(
            latitude = location.latitude,
            longitude = location.longitude,
            timestamp = location.time,
            accuracy = location.accuracy
        )

        // Broadcaster la nouvelle position
        val intent = Intent("com.greenmobilitypass.LOCATION_UPDATE")
        intent.putExtra("latitude", locationPoint.latitude)
        intent.putExtra("longitude", locationPoint.longitude)
        intent.putExtra("timestamp", locationPoint.timestamp)
        intent.putExtra("accuracy", locationPoint.accuracy)
        sendBroadcast(intent)
    }

    /**
     * Crée le canal de notification (Android 8+).
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Tracking GPS",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Suivi de position pendant les trajets"
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Crée la notification foreground.
     */
    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Green Mobility Pass")
            .setContentText("Suivi GPS actif")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
