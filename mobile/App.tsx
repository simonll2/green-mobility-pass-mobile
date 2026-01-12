/**
 * App React Native principal.
 *
 * Green Mobility Pass - Application mobile POC
 *
 * Architecture :
 * - Module Android natif de détection automatique (Kotlin)
 * - Wrapper React Native (TypeScript)
 * - Intégration backend FastAPI
 * - Navigation React Navigation
 * - Authentification JWT
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StatusBar} from 'react-native';
import {AuthProvider} from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
