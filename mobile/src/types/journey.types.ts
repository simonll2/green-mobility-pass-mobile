/**
 * Types TypeScript pour les trajets.
 * Correspond aux modèles Android et backend.
 */

export enum ActivityType {
  STATIONARY = 'STATIONARY',
  WALKING = 'WALKING',
  RUNNING = 'RUNNING',
  CYCLING = 'CYCLING',
  IN_VEHICLE = 'IN_VEHICLE',
  UNKNOWN = 'UNKNOWN',
}

export enum JourneyStatus {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

export enum TransportType {
  MARCHE_A_PIED = 'apied',
  VELO = 'velo',
  TRANSPORT_COMMUN = 'transport_commun',
  VOITURE = 'voiture',
}

export enum DetectionSource {
  AUTO = 'auto',
  MANUAL = 'manual',
}

/**
 * Trajet local détecté côté mobile.
 */
export interface LocalJourney {
  id: string;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  activityType: ActivityType;
  distanceKm: number;
  durationMinutes: number;
  status: JourneyStatus;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
}

/**
 * Événement d'activité détectée.
 */
export interface ActivityChangedEvent {
  activityType: ActivityType;
  confidence: number;
}

/**
 * Données pour créer un trajet sur le backend.
 */
export interface CreateJourneyRequest {
  place_departure: string;
  place_arrival: string;
  time_departure: string; // ISO 8601
  time_arrival: string; // ISO 8601
  distance_km: number;
  transport_type: TransportType;
  detection_source: DetectionSource;
}

/**
 * Trajet retourné par le backend.
 */
export interface BackendJourney {
  id: number;
  id_user: number;
  status: string;
  detection_source: DetectionSource;
  place_departure: string;
  place_arrival: string;
  time_departure: string;
  time_arrival: string;
  distance_km: number;
  duration_minutes: number;
  transport_type: TransportType;
  score_journey: number | null;
  created_at: string;
  validated_at: string | null;
  rejected_at: string | null;
}

/**
 * Statistiques utilisateur retournées par le backend.
 */
export interface UserStatistics {
  total_journeys: number;
  total_distance_km: number;
  total_score: number;
}
