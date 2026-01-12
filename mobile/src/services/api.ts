/**
 * Service de communication avec le backend FastAPI.
 *
 * Ce service implémente tous les appels API nécessaires :
 * - Authentification JWT
 * - Création de trajets validés
 * - Récupération des trajets
 * - Statistiques utilisateur
 */

import axios, {AxiosInstance, AxiosError} from 'axios';
import {
  CreateJourneyRequest,
  BackendJourney,
  UserStatistics,
} from '../types/journey.types';

/**
 * Configuration de l'API.
 * Remplacez BASE_URL par l'adresse de votre backend.
 */
const BASE_URL = 'http://localhost:8000'; // À remplacer par l'IP réelle en dev

/**
 * Types pour l'authentification.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
}

export interface UserInfo {
  id: number;
  username: string;
}

/**
 * Service API principal.
 */
class ApiService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token JWT
    this.axiosInstance.interceptors.request.use(
      config => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Intercepteur pour gérer les erreurs 401 (token expiré)
    this.axiosInstance.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Si erreur 401 et pas déjà retenté
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Tenter de rafraîchir le token
            if (this.refreshToken) {
              const newTokens = await this.refreshAccessToken(this.refreshToken);
              this.setTokens(newTokens.access_token, newTokens.refresh_token);

              // Refaire la requête avec le nouveau token
              originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Échec du refresh, déconnecter l'utilisateur
            this.clearTokens();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Configure l'URL de base de l'API.
   */
  setBaseURL(url: string): void {
    this.axiosInstance.defaults.baseURL = url;
  }

  /**
   * Définit les tokens JWT.
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Efface les tokens JWT (déconnexion).
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Vérifie si l'utilisateur est authentifié.
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  // ========== AUTHENTIFICATION ==========

  /**
   * Connexion utilisateur.
   */
  async login(username: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await this.axiosInstance.post<TokenResponse>('/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  }

  /**
   * Rafraîchit le token d'accès.
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.axiosInstance.post<TokenResponse>('/token/refresh', {
      refresh_token: refreshToken,
    });

    return response.data;
  }

  /**
   * Récupère les informations de l'utilisateur connecté.
   */
  async getMe(): Promise<UserInfo> {
    const response = await this.axiosInstance.get<UserInfo>('/me');
    return response.data;
  }

  /**
   * Déconnexion (efface les tokens localement).
   */
  logout(): void {
    this.clearTokens();
  }

  // ========== TRAJETS ==========

  /**
   * Crée un trajet validé sur le backend.
   */
  async createJourney(journey: CreateJourneyRequest): Promise<BackendJourney> {
    const response = await this.axiosInstance.post<BackendJourney>('/journey/', journey);
    return response.data;
  }

  /**
   * Récupère tous les trajets validés de l'utilisateur.
   */
  async getValidatedJourneys(): Promise<BackendJourney[]> {
    const response = await this.axiosInstance.get<BackendJourney[]>('/journey/validated');
    return response.data;
  }

  /**
   * Récupère un trajet par son ID.
   */
  async getJourneyById(id: number): Promise<BackendJourney> {
    const response = await this.axiosInstance.get<BackendJourney>(`/journey/${id}`);
    return response.data;
  }

  /**
   * Rejette un trajet.
   */
  async rejectJourney(id: number): Promise<BackendJourney> {
    const response = await this.axiosInstance.post<BackendJourney>(`/journey/${id}/reject`);
    return response.data;
  }

  /**
   * Supprime un trajet.
   */
  async deleteJourney(id: number): Promise<{message: string}> {
    const response = await this.axiosInstance.delete<{message: string}>(`/journey/${id}`);
    return response.data;
  }

  /**
   * Récupère les statistiques de l'utilisateur.
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const response = await this.axiosInstance.get<UserStatistics>('/journey/statistics/me');
    return response.data;
  }
}

export default new ApiService();
