// Firebase configuration
// NOTE: Replace these with your actual Firebase project credentials
// Get these from Firebase Console > Project Settings > Your apps > Web app

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCp8yWb4LftaaE90KhJ9R6myhtLPbVgNs4",
    authDomain: "med-drop-afbb2.firebaseapp.com",
    projectId: "med-drop-afbb2",
    storageBucket: "med-drop-afbb2.firebasestorage.app",
    messagingSenderId: "815385322710",
    appId: "1:815385322710:web:951414d973b2bd69e45577"
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
    db = getFirestore(app);
    functions = getFunctions(app); // Renamed from firebaseFunctions to match existing declaration
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
