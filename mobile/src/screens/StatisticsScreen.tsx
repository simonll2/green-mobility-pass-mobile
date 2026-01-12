/**
 * Écran de statistiques utilisateur.
 *
 * Affiche les statistiques récupérées depuis le backend :
 * - Nombre total de trajets validés
 * - Distance totale parcourue
 * - Score total
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import ApiService from '../services/api';
import type {UserStatistics} from '../types/journey.types';

const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await ApiService.getUserStatistics();
      setStatistics(stats);
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les statistiques',
      );
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStatistics();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Statistiques</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Statistiques</Text>
      </View>

      {statistics ? (
        <>
          <View style={styles.statsContainer}>
            <StatCard
              icon="🚶"
              title="Trajets validés"
              value={statistics.total_journeys.toString()}
              subtitle="trajets"
            />

            <StatCard
              icon="📍"
              title="Distance totale"
              value={statistics.total_distance_km.toFixed(2)}
              subtitle="kilomètres"
            />

            <StatCard
              icon="⭐"
              title="Score total"
              value={statistics.total_score.toString()}
              subtitle="points"
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📊 Comment gagner plus de points ?</Text>
            <Text style={styles.infoText}>
              • Marche à pied : 100 points de base + 50 bonus écologique{'\n'}
              • Vélo : 90 points de base + 50 bonus écologique{'\n'}
              • Transport en commun : 70 points de base{'\n'}
              • Voiture : 20 points de base{'\n'}
              {'\n'}
              Bonus distance : +2 points par kilomètre
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reloadButton}
            onPress={handleRefresh}
            disabled={isRefreshing}>
            <Text style={styles.reloadButtonText}>
              {isRefreshing ? 'Actualisation...' : '🔄 Actualiser'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune statistique disponible</Text>
        </View>
      )}
    </ScrollView>
  );
};

const StatCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}> = ({icon, title, value, subtitle}) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statSubtitle}>{subtitle}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
  },
  infoBox: {
    backgroundColor: '#e8f8f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  reloadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default StatisticsScreen;
