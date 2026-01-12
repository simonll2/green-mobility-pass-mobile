/**
 * Service de stockage local (AsyncStorage).
 *
 * Gère la persistance locale de :
 * - Les tokens JWT
 * - La configuration utilisateur (URL API, etc.)
 * - Les trajets locaux en attente de synchronisation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de stockage
const KEYS = {
  ACCESS_TOKEN: '@auth:access_token',
  REFRESH_TOKEN: '@auth:refresh_token',
  USER_ID: '@auth:user_id',
  API_BASE_URL: '@config:api_base_url',
  USERNAME: '@auth:username',
};

/**
 * Service de stockage local.
 */
class StorageService {
  // ========== AUTHENTIFICATION ==========

  /**
   * Sauvegarde les tokens JWT.
   */
  async saveTokens(accessToken: string, refreshToken: string, userId: number): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, accessToken],
      [KEYS.REFRESH_TOKEN, refreshToken],
      [KEYS.USER_ID, userId.toString()],
    ]);
  }

  /**
   * Récupère les tokens JWT sauvegardés.
   */
  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    userId: number | null;
  }> {
    const values = await AsyncStorage.multiGet([
      KEYS.ACCESS_TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.USER_ID,
    ]);

    return {
      accessToken: values[0][1],
      refreshToken: values[1][1],
      userId: values[2][1] ? parseInt(values[2][1], 10) : null,
    };
  }

  /**
   * Efface les tokens JWT (déconnexion).
   */
  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.ACCESS_TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.USER_ID,
      KEYS.USERNAME,
    ]);
  }

  /**
   * Sauvegarde le nom d'utilisateur.
   */
  async saveUsername(username: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.USERNAME, username);
  }

  /**
   * Récupère le nom d'utilisateur sauvegardé.
   */
  async getUsername(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.USERNAME);
  }

  // ========== CONFIGURATION ==========

  /**
   * Sauvegarde l'URL de base de l'API.
   */
  async saveApiBaseUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.API_BASE_URL, url);
  }

  /**
   * Récupère l'URL de base de l'API.
   */
  async getApiBaseUrl(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.API_BASE_URL);
  }

  // ========== UTILITAIRES ==========

  /**
   * Efface toutes les données stockées.
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  }

  /**
   * Vérifie si l'utilisateur est connecté (tokens présents).
   */
  async isAuthenticated(): Promise<boolean> {
    const {accessToken} = await this.getTokens();
    return accessToken !== null;
  }
}

export default new StorageService();
