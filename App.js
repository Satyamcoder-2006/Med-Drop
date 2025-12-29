import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import dbManager from './database/DatabaseManager';
import syncManager from './services/SyncManager';

export default function App() {
  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup
      syncManager.cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await dbManager.init();
      console.log('Database initialized');

      // Initialize sync manager
      await syncManager.init();
      console.log('Sync manager initialized');
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
