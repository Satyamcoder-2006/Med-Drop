import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { database } from './src/services/DatabaseService';
import { notificationService } from './src/services/NotificationService';

// Suppress the internal expo-firebase-recaptcha warning
LogBox.ignoreLogs(['FirebaseRecaptcha: Support for defaultProps will be removed']);

export default function App() {
    const [isDbReady, setIsDbReady] = useState(false);

    useEffect(() => {
        const initDb = async () => {
            try {
                await database.initialize();
                await notificationService.initialize();
                setIsDbReady(true);
            } catch (error) {
                console.error('Failed to initialize database:', error);
                // Even if DB fails, we might want to continue with a fallback, 
                // but for now let's just wait.
            }
        };

        initDb();
    }, []);

    if (!isDbReady) {
        return null; // Or a splash screen
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <NavigationContainer>
                    <RootNavigator />
                </NavigationContainer>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
