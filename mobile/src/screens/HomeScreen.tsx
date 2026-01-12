/**
 * Écran principal (Home).
 *
 * Fonctionnalités :
 * - Démarrer/arrêter la détection automatique
 * - Afficher l'activité détectée en temps réel
 * - Afficher le trajet en cours
 * - Navigation vers la liste des trajets et les statistiques
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import JourneyDetection from '../modules/JourneyDetection/NativeJourneyDetection';
import {useAuth} from '../contexts/AuthContext';
import type {LocalJourney, ActivityChangedEvent} from '../types/journey.types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {username, logout} = useAuth();

  const [isDetecting, setIsDetecting] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<string>('UNKNOWN');
  const [currentJourney, setCurrentJourney] = useState<LocalJourney | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    checkPermissions();
    checkDetectionStatus();

    // Écouter les événements
    const unsubscribers = [
      JourneyDetection.addEventListener('onDetectionStarted', handleDetectionStarted),
      JourneyDetection.addEventListener('onDetectionStopped', handleDetectionStopped),
      JourneyDetection.addEventListener<ActivityChangedEvent>(
        'onActivityChanged',
        handleActivityChanged,
      ),
      JourneyDetection.addEventListener<LocalJourney>('onJourneyStarted', handleJourneyStarted),
      JourneyDetection.addEventListener<LocalJourney>('onJourneyUpdated', handleJourneyUpdated),
      JourneyDetection.addEventListener<LocalJourney>(
        'onJourneyCompleted',
        handleJourneyCompleted,
      ),
      JourneyDetection.addEventListener('onJourneyDiscarded', handleJourneyDiscarded),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const granted = await JourneyDetection.checkPermissions();
      setPermissionsGranted(granted);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkDetectionStatus = async () => {
    try {
      const detecting = await JourneyDetection.isDetecting();
      setIsDetecting(detecting);

      if (detecting) {
        const journey = await JourneyDetection.getCurrentJourney();
        setCurrentJourney(journey);
      }
    } catch (error) {
      console.error('Error checking detection status:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await JourneyDetection.requestPermissions();
      setPermissionsGranted(granted);

      if (!granted) {
        Alert.alert(
          'Permissions nécessaires',
          'Les permissions de localisation et de reconnaissance d\'activité sont nécessaires pour la détection automatique.',
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de demander les permissions');
    }
  };

  const startDetection = async () => {
    if (!permissionsGranted) {
      await requestPermissions();
      return;
    }

    try {
      await JourneyDetection.startDetection();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de démarrer la détection');
    }
  };

  const stopDetection = async () => {
    try {
      await JourneyDetection.stopDetection();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'arrêter la détection');
    }
  };

  // Event handlers
  const handleDetectionStarted = () => {
    setIsDetecting(true);
  };

  const handleDetectionStopped = () => {
    setIsDetecting(false);
    setCurrentJourney(null);
    setCurrentActivity('UNKNOWN');
  };

  const handleActivityChanged = (event: ActivityChangedEvent) => {
    setCurrentActivity(event.activityType);
  };

  const handleJourneyStarted = (journey: LocalJourney) => {
    setCurrentJourney(journey);
    Alert.alert('Nouveau trajet', 'Un nouveau trajet a été détecté');
  };

  const handleJourneyUpdated = (journey: LocalJourney) => {
    setCurrentJourney(journey);
  };

  const handleJourneyCompleted = (journey: LocalJourney) => {
    setCurrentJourney(null);
    Alert.alert('Trajet terminé', `Trajet de ${journey.distanceKm.toFixed(2)} km terminé`);
  };

  const handleJourneyDiscarded = () => {
    setCurrentJourney(null);
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          if (isDetecting) {
            await stopDetection();
          }
          await logout();
        },
      },
    ]);
  };

  const getActivityLabel = (activity: string): string => {
    const labels: Record<string, string> = {
      STATIONARY: 'Immobile',
      WALKING: 'Marche',
      RUNNING: 'Course',
      CYCLING: 'Vélo',
      IN_VEHICLE: 'En véhicule',
      UNKNOWN: 'Inconnue',
    };
    return labels[activity] || activity;
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.notAvailable}>
          La détection automatique n'est disponible que sur Android
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Green Mobility Pass</Text>
        <Text style={styles.username}>Connecté en tant que {username}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détection automatique</Text>

        {!permissionsGranted && (
          <TouchableOpacity style={styles.warningButton} onPress={requestPermissions}>
            <Text style={styles.warningText}>
              ⚠️ Accorder les permissions nécessaires
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.detectionCard}>
          <Text style={styles.statusLabel}>État</Text>
          <Text style={[styles.statusValue, isDetecting && styles.statusActive]}>
            {isDetecting ? 'ACTIVE' : 'INACTIVE'}
          </Text>

          {isDetecting && (
            <>
              <Text style={styles.activityLabel}>Activité détectée</Text>
              <Text style={styles.activityValue}>{getActivityLabel(currentActivity)}</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, isDetecting ? styles.buttonStop : styles.buttonStart]}
          onPress={isDetecting ? stopDetection : startDetection}>
          <Text style={styles.buttonText}>
            {isDetecting ? 'Arrêter la détection' : 'Démarrer la détection'}
          </Text>
        </TouchableOpacity>
      </View>

      {currentJourney && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trajet en cours</Text>
          <View style={styles.journeyCard}>
            <Text style={styles.journeyInfo}>
              Distance: {currentJourney.distanceKm.toFixed(2)} km
            </Text>
            <Text style={styles.journeyInfo}>
              Durée: {currentJourney.durationMinutes} min
            </Text>
            <Text style={styles.journeyInfo}>
              Type: {getActivityLabel(currentJourney.activityType)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.navigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('JourneyList')}>
          <Text style={styles.navButtonText}>📋 Mes trajets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Statistics')}>
          <Text style={styles.navButtonText}>📊 Statistiques</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  username: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  detectionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#95a5a6',
  },
  statusActive: {
    color: '#27ae60',
  },
  activityLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 15,
    marginBottom: 5,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: '#27ae60',
  },
  buttonStop: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#f39c12',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  journeyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  journeyInfo: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  navButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  notAvailable: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    padding: 20,
  },
});

export default HomeScreen;
