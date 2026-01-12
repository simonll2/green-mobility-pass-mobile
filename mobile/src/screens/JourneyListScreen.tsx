/**
 * Écran de liste des trajets détectés.
 *
 * Affiche tous les trajets détectés localement avec leur statut.
 * Permet de naviguer vers les détails d'un trajet.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import JourneyDetection from '../modules/JourneyDetection/NativeJourneyDetection';
import type {LocalJourney} from '../types/journey.types';

const JourneyListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [journeys, setJourneys] = useState<LocalJourney[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadJourneys();
    }, []),
  );

  const loadJourneys = async () => {
    try {
      const savedJourneys = await JourneyDetection.getSavedJourneys();
      // Trier du plus récent au plus ancien
      const sorted = savedJourneys.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
      setJourneys(sorted);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les trajets');
      console.error('Error loading journeys:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadJourneys();
    setIsRefreshing(false);
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      ONGOING: 'En cours',
      COMPLETED: 'Terminé',
      VALIDATED: 'Validé',
      REJECTED: 'Rejeté',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ONGOING: '#f39c12',
      COMPLETED: '#3498db',
      VALIDATED: '#27ae60',
      REJECTED: '#e74c3c',
    };
    return colors[status] || '#95a5a6';
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
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderJourney = ({item}: {item: LocalJourney}) => (
    <TouchableOpacity
      style={styles.journeyCard}
      onPress={() => navigation.navigate('JourneyDetail', {journey: item})}>
      <View style={styles.journeyHeader}>
        <Text style={styles.journeyActivity}>{getActivityLabel(item.activityType)}</Text>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.journeyInfo}>
        <Text style={styles.infoText}>📍 {item.distanceKm.toFixed(2)} km</Text>
        <Text style={styles.infoText}>⏱️ {item.durationMinutes} min</Text>
      </View>

      <Text style={styles.journeyDate}>{formatDate(item.startTime)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes trajets</Text>
      </View>

      {journeys.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun trajet détecté</Text>
          <Text style={styles.emptySubtext}>
            Activez la détection automatique pour commencer à enregistrer vos trajets
          </Text>
        </View>
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={item => item.id}
          renderItem={renderJourney}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  list: {
    padding: 15,
  },
  journeyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journeyActivity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  journeyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  journeyDate: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});

export default JourneyListScreen;
