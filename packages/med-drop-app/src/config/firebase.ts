import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase configuration from the Firebase Console
export const firebaseConfig = {
    apiKey: "AIzaSyBiLioNwGgp_tg6D2QzNbLc6GXKS8v-7E4",
    authDomain: "med-drop-app.firebaseapp.com",
    projectId: "med-drop-app",
    storageBucket: "med-drop-app.firebasestorage.app",
    messagingSenderId: "967638864464",
    appId: "1:967638864464:web:efdcc6635ad8227a653755",
    measurementId: "G-9KYLY7M6Z9"
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

    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
}

const storage = getStorage(app);

export { app, auth, db, storage };
