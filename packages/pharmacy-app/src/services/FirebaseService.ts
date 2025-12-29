import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { Patient, Medicine, Pharmacy } from '../types';

// Placeholder config - replace with actual values from Firebase Console
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
        console.log('Firebase initialized in Pharmacy App');
    },

    // Auth methods
    signIn: async (token: string) => {
        try {
            await signInWithCustomToken(auth, token);
            return auth.currentUser;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    },

    // Pharmacy methods
    getPharmacyProfile: async (pharmacyId: string): Promise<Pharmacy | null> => {
        try {
            const docRef = doc(db, 'pharmacies', pharmacyId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                } as Pharmacy;
            }
            return null;
        } catch (error) {
            console.error('Error fetching pharmacy profile:', error);
            throw error;
        }
    },

    // Patient methods
    registerPatient: async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const newPatientRef = doc(collection(db, 'patients'));
            const timestamp = serverTimestamp();

            const newPatient = {
                ...patient,
                id: newPatientRef.id,
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            await setDoc(newPatientRef, newPatient);
            return newPatientRef.id;
        } catch (error) {
            console.error('Error registering patient:', error);
            throw error;
        }
    },

    searchPatientByPhone: async (phone: string): Promise<Patient | null> => {
        try {
            const q = query(collection(db, 'patients'), where('phone', '==', phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as Patient;
            }
            return null;
        } catch (error) {
            console.error('Error searching patient:', error);
            throw error;
        }
    },

    // Medicine methods
    addMedicine: async (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const newMedicineRef = doc(collection(db, 'medicines'));
            const timestamp = serverTimestamp();

            await setDoc(newMedicineRef, {
                ...medicine,
                id: newMedicineRef.id,
                createdAt: timestamp,
                updatedAt: timestamp,
            });

            return newMedicineRef.id;
        } catch (error) {
            console.error('Error adding medicine:', error);
            throw error;
        }
    },

    // Dashboard stats
    getRecentRefillRequests: async (pharmacyId: string) => {
        try {
            const q = query(
                collection(db, 'refill_requests'),
                where('pharmacyId', '==', pharmacyId),
                where('status', '==', 'pending')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching refills:', error);
            return [];
        }
    }
};
