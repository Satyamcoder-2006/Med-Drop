import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const extra =
  (Constants?.expoConfig?.extra) ||
  (Constants?.manifest?.extra) ||
  {};
// TODO: Replace with your actual Firebase configuration from the Firebase Console
export const firebaseConfig = {
    apiKey: extra.MED_DROP_FIREBASE_API_KEY,
    authDomain: extra.MED_DROP_FIREBASE_AUTH_DOMAIN,
    projectId: extra.MED_DROP_FIREBASE_PROJECT_ID,
    storageBucket: extra.MED_DROP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: extra.MED_DROP_FIREBASE_MESSAGING_SENDER_ID,
    appId: extra.MED_DROP_FIREBASE_APP_ID,
    measurementId: extra.MED_DROP_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
    } else {
        app = getApp();
        auth = getAuth(app);
    }

    // Use long polling for Expo/React Native
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
    });
} catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
}

const storage = getStorage(app);

export { app, auth, db, storage };
