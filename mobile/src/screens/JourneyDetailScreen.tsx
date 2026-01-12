/**
 * Écran de détails d'un trajet.
 *
 * Permet de :
 * - Voir les détails d'un trajet détecté
 * - Valider et envoyer au backend
 * - Rejeter le trajet
 * - Ajuster le type de transport si nécessaire
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import ApiService from '../services/api';
import {
  LocalJourney,
  TransportType,
  DetectionSource,
  ActivityType,
} from '../types/journey.types';

const JourneyDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const journey: LocalJourney = route.params.journey;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportType>(
    mapActivityToTransport(journey.activityType),
  );
  const [placeDeparture, setPlaceDeparture] = useState('Départ');
  const [placeArrival, setPlaceArrival] = useState('Arrivée');

  function mapActivityToTransport(activity: ActivityType): TransportType {
    switch (activity) {
      case ActivityType.WALKING:
      case ActivityType.RUNNING:
        return TransportType.MARCHE_A_PIED;
      case ActivityType.CYCLING:
        return TransportType.VELO;
      case ActivityType.IN_VEHICLE:
        return TransportType.TRANSPORT_COMMUN;
      default:
        return TransportType.MARCHE_A_PIED;
    }
  }

  const handleValidate = async () => {
    if (!placeDeparture || !placeArrival) {
      Alert.alert('Erreur', 'Veuillez renseigner le lieu de départ et d\'arrivée');
      return;
    }

    Alert.alert(
      'Valider le trajet',
      'Ce trajet sera envoyé au backend et vous rapportera des points.',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Valider',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await ApiService.createJourney({
                place_departure: placeDeparture,
                place_arrival: placeArrival,
                time_departure: journey.startTime,
                time_arrival: journey.endTime!,
                distance_km: journey.distanceKm,
                transport_type: selectedTransport,
                detection_source: DetectionSource.AUTO,
              });

              Alert.alert(
                'Trajet validé !',
                `Score obtenu: ${result.score_journey || 0} points`,
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.detail || 'Impossible d\'envoyer le trajet',
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Rejeter le trajet',
      'Ce trajet sera supprimé et ne vous rapportera pas de points.',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: () => {
            // Le trajet reste en local marqué comme rejeté
            Alert.alert('Trajet rejeté', 'Le trajet a été marqué comme rejeté', [
              {text: 'OK', onPress: () => navigation.goBack()},
            ]);
          },
        },
      ],
    );
  };

  const getActivityLabel = (activity: string): string => {
    const labels: Record<string, string> = {
      STATIONARY: 'Immobile',
      WALKING: 'Marche',
      RUNNING: 'Course',
      CYCLING: 'Vélo',
      IN_VEHICLE: 'En véhicule',
      UNKNOWN: 'Inconnu',
    };
    return labels[activity] || activity;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const transportOptions = [
    {label: 'À pied', value: TransportType.MARCHE_A_PIED},
    {label: 'Vélo', value: TransportType.VELO},
    {label: 'Transport en commun', value: TransportType.TRANSPORT_COMMUN},
    {label: 'Voiture', value: TransportType.VOITURE},
  ];

  const isCompleted = journey.status === 'COMPLETED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Détails du trajet</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.card}>
          <InfoRow label="Activité détectée" value={getActivityLabel(journey.activityType)} />
          <InfoRow label="Distance" value={`${journey.distanceKm.toFixed(2)} km`} />
          <InfoRow label="Durée" value={`${journey.durationMinutes} minutes`} />
          <InfoRow label="Début" value={formatDate(journey.startTime)} />
          {journey.endTime && <InfoRow label="Fin" value={formatDate(journey.endTime)} />}
        </View>
      </View>

      {isCompleted && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lieux</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Lieu de départ</Text>
              <TextInput
                style={styles.input}
                value={placeDeparture}
                onChangeText={setPlaceDeparture}
                placeholder="Ex: Domicile, Bureau..."
              />

              <Text style={styles.inputLabel}>Lieu d'arrivée</Text>
              <TextInput
                style={styles.input}
                value={placeArrival}
                onChangeText={setPlaceArrival}
                placeholder="Ex: Gare, Université..."
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type de transport</Text>
            <View style={styles.card}>
              {transportOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.transportOption,
                    selectedTransport === option.value && styles.transportOptionSelected,
                  ]}
                  onPress={() => setSelectedTransport(option.value)}>
                  <Text
                    style={[
                      styles.transportLabel,
                      selectedTransport === option.value && styles.transportLabelSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonValidate]}
              onPress={handleValidate}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✓ Valider et envoyer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonReject]}
              onPress={handleReject}
              disabled={isLoading}>
              <Text style={styles.buttonText}>✕ Rejeter</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!isCompleted && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Ce trajet est en cours ou a déjà été traité.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const InfoRow: React.FC<{label: string; value: string}> = ({label, value}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    color: '#2c3e50',
  },
  transportOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  transportOptionSelected: {
    borderColor: '#27ae60',
    backgroundColor: '#e8f8f5',
  },
  transportLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  transportLabelSelected: {
    color: '#27ae60',
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonValidate: {
    backgroundColor: '#27ae60',
  },
  buttonReject: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    color: '#856404',
    textAlign: 'center',
  },
});

export default JourneyDetailScreen;
