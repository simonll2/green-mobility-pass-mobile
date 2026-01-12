package com.greenmobilitypass.detection

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.greenmobilitypass.MainActivity
import com.greenmobilitypass.R
import com.greenmobilitypass.detection.models.ActivityType
import com.greenmobilitypass.detection.models.DetectedActivity

/**
 * Service Android de détection d'activité en arrière-plan.
 *
 * Utilise l'Activity Recognition API de Google Play Services pour détecter :
 * - Stationnaire (immobile)
 * - Marche à pied
 * - Course à pied
 * - Vélo
 * - En véhicule
 *
 * Le service tourne en foreground pour garantir la détection même
 * lorsque l'app est en arrière-plan.
 *
 * Fréquence de détection : toutes les 10 secondes (configurable).
 */
class ActivityDetectionService : Service() {

    companion object {
        private const val CHANNEL_ID = "journey_detection_channel"
        private const val NOTIFICATION_ID = 1001
        private const val DETECTION_INTERVAL_MS = 10000L // 10 secondes
    }

    private lateinit var activityRecognitionClient: ActivityRecognitionClient
    private var pendingIntent: PendingIntent? = null

    override fun onCreate() {
        super.onCreate()
        activityRecognitionClient = ActivityRecognition.getClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Démarrer en foreground
        startForeground(NOTIFICATION_ID, createNotification())

        // Démarrer la détection d'activité
        startActivityRecognition()

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopActivityRecognition()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * Démarre la détection d'activité.
     */
    private fun startActivityRecognition() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val intent = Intent(this, ActivityRecognitionReceiver::class.java)
        pendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

        activityRecognitionClient.requestActivityUpdates(
            DETECTION_INTERVAL_MS,
            pendingIntent!!
        )
    }

    /**
     * Arrête la détection d'activité.
     */
    private fun stopActivityRecognition() {
        pendingIntent?.let {
            activityRecognitionClient.removeActivityUpdates(it)
        }
    }

    /**
     * Crée le canal de notification (Android 8+).
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Détection de trajets",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notification de détection automatique de trajets"
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
            .setContentText("Détection de trajets active")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}

/**
 * BroadcastReceiver qui reçoit les mises à jour d'activité.
 */
class ActivityRecognitionReceiver : android.content.BroadcastReceiver() {

    override fun onReceive(context: android.content.Context, intent: Intent) {
        if (ActivityRecognitionResult.hasResult(intent)) {
            val result = ActivityRecognitionResult.extractResult(intent)
            val activity = result?.mostProbableActivity

            activity?.let {
                val detectedActivity = DetectedActivity(
                    type = mapActivityType(it.type),
                    confidence = it.confidence
                )

                // Notifier le JourneyDetectionManager
                notifyActivityDetected(context, detectedActivity)
            }
        }
    }

    /**
     * Mappe les types d'activité de Google vers notre enum.
     */
    private fun mapActivityType(type: Int): ActivityType {
        return when (type) {
            com.google.android.gms.location.DetectedActivity.STILL -> ActivityType.STATIONARY
            com.google.android.gms.location.DetectedActivity.WALKING -> ActivityType.WALKING
            com.google.android.gms.location.DetectedActivity.RUNNING -> ActivityType.RUNNING
            com.google.android.gms.location.DetectedActivity.ON_BICYCLE -> ActivityType.CYCLING
            com.google.android.gms.location.DetectedActivity.IN_VEHICLE -> ActivityType.IN_VEHICLE
            else -> ActivityType.UNKNOWN
        }
    }

    /**
     * Notifie le JourneyDetectionManager d'une nouvelle activité détectée.
     */
    private fun notifyActivityDetected(context: android.content.Context, activity: DetectedActivity) {
        // Utiliser un broadcast local ou directement appeler le manager
        val intent = Intent("com.greenmobilitypass.ACTIVITY_DETECTED")
        intent.putExtra("activityType", activity.type.name)
        intent.putExtra("confidence", activity.confidence)
        intent.putExtra("timestamp", activity.timestamp)
        context.sendBroadcast(intent)
    }
}
