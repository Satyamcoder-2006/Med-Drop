import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { database } from './src/services/DatabaseService';
import { notificationService } from './src/services/NotificationService';
import { voiceService } from './src/services/VoiceService';
import { firebaseService } from './src/services/FirebaseService';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import SymptomReportScreen from './src/screens/SymptomReportScreen';

const Stack = createStackNavigator();

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('hi');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize all services
      await database.initialize();
      await notificationService.initialize();
      await firebaseService.initialize();

      // Check if user has completed onboarding
      const savedLanguage = await database.getSetting('language');
      const savedPatientId = await database.getSetting('patientId');

      if (savedLanguage && savedPatientId) {
        setLanguage(savedLanguage);
        setPatientId(savedPatientId);
        setIsOnboarded(true);
        voiceService.setLanguage(savedLanguage);
      }

      // Set up notification handlers
      const responseSubscription = notificationService.addNotificationResponseListener(
        (response) => {
          const data = response.notification.request.content.data;
          console.log('Notification tapped:', data);
          // Handle navigation based on notification data
        }
      );

      setIsLoading(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (selectedLanguage: string) => {
    // Save language preference
    await database.saveSetting('language', selectedLanguage);
    setLanguage(selectedLanguage);
    voiceService.setLanguage(selectedLanguage);

    // For now, create a demo patient ID
    // In production, this would come from pharmacy registration
    const demoPatientId = 'patient_demo_001';
    await database.saveSetting('patientId', demoPatientId);
    setPatientId(demoPatientId);

    setIsOnboarded(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isOnboarded ? (
            <Stack.Screen name="Onboarding">
              {(props) => <OnboardingScreen {...props} onComplete={handleOnboardingComplete} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home">
                {(props) => (
                  <HomeScreen
                    {...props}
                    patientId={patientId!}
                    onNavigate={(screen, params) => {
                      props.navigation.navigate(screen, params);
                    }}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="SymptomReport">
                {(props) => (
                  <SymptomReportScreen
                    {...props}
                    patientId={patientId!}
                    medicineId={props.route.params?.medicineId}
                    medicineName={props.route.params?.medicineName || 'Medicine'}
                    onComplete={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
