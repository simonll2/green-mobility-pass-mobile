/**
 * Contexte d'authentification React.
 *
 * Gère l'état d'authentification global de l'application.
 */

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import ApiService from '../services/api';
import StorageService from '../services/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: number | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Restaurer la session au démarrage
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const tokens = await StorageService.getTokens();
      const savedUsername = await StorageService.getUsername();

      if (tokens.accessToken && tokens.refreshToken) {
        ApiService.setTokens(tokens.accessToken, tokens.refreshToken);
        setIsAuthenticated(true);
        setUserId(tokens.userId);
        setUsername(savedUsername);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (user: string, password: string) => {
    try {
      const response = await ApiService.login(user, password);

      // Sauvegarder les tokens
      await StorageService.saveTokens(
        response.access_token,
        response.refresh_token,
        response.user_id,
      );
      await StorageService.saveUsername(user);

      setIsAuthenticated(true);
      setUserId(response.user_id);
      setUsername(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      ApiService.logout();
      await StorageService.clearTokens();
      setIsAuthenticated(false);
      setUserId(null);
      setUsername(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        username,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
