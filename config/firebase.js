// Firebase configuration
// NOTE: Replace these with your actual Firebase project credentials
// Get these from Firebase Console > Project Settings > Your apps > Web app

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const extra =
  (Constants?.expoConfig?.extra) ||
  (Constants?.manifest?.extra) ||
  {};

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: extra.MED_DROP_FIREBASE_API_KEY,
    authDomain: extra.MED_DROP_FIREBASE_AUTH_DOMAIN,
    projectId: extra.MED_DROP_FIREBASE_PROJECT_ID,
    storageBucket: extra.MED_DROP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: extra.MED_DROP_FIREBASE_MESSAGING_SENDER_ID,
    appId: extra.MED_DROP_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let auth;
let db;
let functions;
let storage;
let messaging;

try {
    app = initializeApp(firebaseConfig);

    // Initialize Firebase services
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (error) {
        // Auth might already be initialized
        auth = getAuth(app);
    }

    // Use long polling for Expo/React Native
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
    });

    functions = getFunctions(app);
    storage = getStorage(app);
    messaging = null; // Initialize messaging to null

    // Messaging only works on certain platforms
    try {
        isSupported().then((supported) => {
            if (supported) {
                messaging = getMessaging(app);
            }
        });
    } catch (error) {
        console.log('Firebase Messaging not available on this platform');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

export { app, auth, db, functions, storage, messaging };
export default app;
