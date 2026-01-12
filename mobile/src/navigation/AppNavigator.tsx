/**
 * Configuration de la navigation React Navigation.
 *
 * Stack Navigator avec les écrans :
 * - Login (non authentifié)
 * - Home (authentifié)
 * - JourneyList
 * - JourneyDetail
 * - Statistics
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import JourneyListScreen from '../screens/JourneyListScreen';
import JourneyDetailScreen from '../screens/JourneyDetailScreen';
import StatisticsScreen from '../screens/StatisticsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const {isAuthenticated} = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="JourneyList" component={JourneyListScreen} />
          <Stack.Screen name="JourneyDetail" component={JourneyDetailScreen} />
          <Stack.Screen name="Statistics" component={StatisticsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
