/**
 * Wrapper TypeScript du Native Module Android de détection de trajets.
 *
 * Ce module fournit une API JavaScript propre pour interagir avec
 * le module natif Kotlin de détection de trajets.
 *
 * API :
 * - startDetection() : Démarre la détection automatique
 * - stopDetection() : Arrête la détection
 * - isDetecting() : Vérifie si la détection est active
 * - getCurrentJourney() : Récupère le trajet en cours
 * - getSavedJourneys() : Récupère tous les trajets sauvegardés
 * - requestPermissions() : Demande les permissions nécessaires
 * - checkPermissions() : Vérifie si les permissions sont accordées
 *
 * Événements émis :
 * - onDetectionStarted : Détection démarrée
 * - onDetectionStopped : Détection arrêtée
 * - onActivityChanged : Activité détectée changée
 * - onJourneyStarted : Nouveau trajet démarré
 * - onJourneyUpdated : Trajet en cours mis à jour
 * - onJourneyCompleted : Trajet terminé et valide
 * - onJourneyDiscarded : Trajet terminé mais rejeté (trop court)
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {LocalJourney, ActivityChangedEvent} from '../../types/journey.types';

interface JourneyDetectionModuleInterface {
  startDetection(): Promise<boolean>;
  stopDetection(): Promise<boolean>;
  isDetecting(): Promise<boolean>;
  getCurrentJourney(): Promise<LocalJourney | null>;
  getSavedJourneys(): Promise<LocalJourney[]>;
  requestPermissions(): Promise<boolean>;
  checkPermissions(): Promise<boolean>;
}

// Récupérer le module natif
const JourneyDetectionNative =
  NativeModules.JourneyDetection as JourneyDetectionModuleInterface;

// Vérifier que le module natif existe (Android uniquement)
if (Platform.OS === 'android' && !JourneyDetectionNative) {
  throw new Error(
    'JourneyDetection native module not found. Did you forget to link it?',
  );
}

// Créer l'event emitter
const eventEmitter = Platform.OS === 'android'
  ? new NativeEventEmitter(NativeModules.JourneyDetection)
  : null;

/**
 * Types d'événements disponibles.
 */
export type JourneyDetectionEventType =
  | 'onDetectionStarted'
  | 'onDetectionStopped'
  | 'onActivityChanged'
  | 'onJourneyStarted'
  | 'onJourneyUpdated'
  | 'onJourneyCompleted'
  | 'onJourneyDiscarded';

/**
 * Type des listeners d'événements.
 */
export type EventListener<T = any> = (data: T) => void;

/**
 * Classe wrapper du module natif de détection de trajets.
 */
class JourneyDetection {
  /**
   * Démarre la détection automatique de trajets.
   * Nécessite les permissions LOCATION et ACTIVITY_RECOGNITION.
   */
  async startDetection(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('Journey detection is only available on Android');
      return false;
    }
    return JourneyDetectionNative.startDetection();
  }

  /**
   * Arrête la détection automatique de trajets.
   */
  async stopDetection(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return JourneyDetectionNative.stopDetection();
  }

  /**
   * Vérifie si la détection est actuellement active.
   */
  async isDetecting(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return JourneyDetectionNative.isDetecting();
  }

  /**
   * Récupère le trajet en cours de détection.
   */
  async getCurrentJourney(): Promise<LocalJourney | null> {
    if (Platform.OS !== 'android') {
      return null;
    }
    return JourneyDetectionNative.getCurrentJourney();
  }

  /**
   * Récupère tous les trajets sauvegardés localement.
   */
  async getSavedJourneys(): Promise<LocalJourney[]> {
    if (Platform.OS !== 'android') {
      return [];
    }
    return JourneyDetectionNative.getSavedJourneys();
  }

  /**
   * Demande les permissions nécessaires à l'utilisateur.
   * Sur Android : LOCATION, BACKGROUND_LOCATION, ACTIVITY_RECOGNITION
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return JourneyDetectionNative.requestPermissions();
  }

  /**
   * Vérifie si les permissions nécessaires sont accordées.
   */
  async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return JourneyDetectionNative.checkPermissions();
  }

  /**
   * Écoute un événement émis par le module natif.
   *
   * @param eventType Type d'événement
   * @param listener Fonction callback
   * @returns Fonction pour retirer le listener
   */
  addEventListener<T = any>(
    eventType: JourneyDetectionEventType,
    listener: EventListener<T>,
  ): () => void {
    if (Platform.OS !== 'android' || !eventEmitter) {
      return () => {};
    }

    const subscription = eventEmitter.addListener(eventType, listener);
    return () => subscription.remove();
  }

  /**
   * Retire tous les listeners d'un type d'événement.
   */
  removeAllListeners(eventType: JourneyDetectionEventType): void {
    if (Platform.OS !== 'android' || !eventEmitter) {
      return;
    }
    eventEmitter.removeAllListeners(eventType);
  }
}

export default new JourneyDetection();
