import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { Patient, AdherenceLog, Alert } from '../types';

// Placeholder config
const firebaseConfig = {
    apiKey: "api-key-placeholder",
    authDomain: "med-drop-project.firebaseapp.com",
    projectId: "med-drop-project",
    storageBucket: "med-drop-project.appspot.com",
    messagingSenderId: "sender-id",
    appId: "app-id"
};

let app: any;
let db: any;
let auth: any;

export const firebaseService = {
    initialize: () => {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('Firebase initialized in Guardian App');
    },

    // Auth
    signIn: async (token: string) => {
        try {
            await signInWithCustomToken(auth, token);
            return auth.currentUser;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    },

    // Patient Monitoring
    getMyPatients: async (guardianId: string): Promise<Patient[]> => {
        try {
            // In real app, query patients where guardians array contains guardianId
            const q = query(
                collection(db, 'patients'),
                where('guardians', 'array-contains', guardianId)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Transform basic data to patient interface
            })) as Patient[];
        } catch (error) {
            console.error('Error fetching patients:', error);
            return [];
        }
    },

    getPatientStats: async (patientId: string) => {
        // Helper to get daily adherence
        // This would ideally be a cloud function or refined query
        return {
            adherenceScore: 85,
            missedToday: 0,
            streak: 5
        };
    },

    getRecentAlerts: async (guardianId: string): Promise<Alert[]> => {
        try {
            const q = query(
                collection(db, 'alerts'),
                where('guardianId', '==', guardianId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            })) as Alert[];
        } catch (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
    }
};
