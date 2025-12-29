import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import {
    getAuth,
    Auth,
    signInWithCustomToken,
    signOut as firebaseSignOut,
    initializeAuth,
    getReactNativePersistence
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { database } from './DatabaseService';
import { Patient, Medicine, AdherenceLog, SyncQueueItem } from '../types';

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

class FirebaseService {
    private app: FirebaseApp | null = null;
    private firestore: Firestore | null = null;
    private auth: Auth | null = null;
    private isOnline: boolean = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private listeners: Unsubscribe[] = [];

    async initialize(): Promise<void> {
        try {
            // Check if using placeholders - bypass for dev
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                console.log('Using placeholder config - starting in OFFLINE MODE');
                this.isOnline = false;
                return;
            }

            // Initialize Firebase
            this.app = initializeApp(firebaseConfig);
            this.firestore = getFirestore(this.app);

            // Initialize Auth with persistence
            try {
                this.auth = initializeAuth(this.app, {
                    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
                });
            } catch (e) {
                console.warn('Auth init failed, continuing offline:', e);
            }

            // Monitor network connectivity
            NetInfo.addEventListener(state => {
                this.isOnline = state.isConnected ?? false;

                if (this.isOnline) {
                    this.startBackgroundSync();
                } else {
                    this.stopBackgroundSync();
                }
            });

            console.log('Firebase service initialized');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    async signIn(token: string): Promise<void> {
        if (!this.auth) throw new Error('Firebase not initialized');

        try {
            await signInWithCustomToken(this.auth, token);
            console.log('User signed in successfully');
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        if (!this.auth) throw new Error('Firebase not initialized');

        await firebaseSignOut(this.auth);
        this.stopBackgroundSync();
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }

    // Sync operations
    private startBackgroundSync(): void {
        if (this.syncInterval) return;

        // Sync immediately
        this.syncPendingChanges();

        // Then sync every 15 minutes
        this.syncInterval = setInterval(() => {
            this.syncPendingChanges();
        }, 15 * 60 * 1000);
    }

    private stopBackgroundSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncPendingChanges(): Promise<void> {
        if (!this.isOnline || !this.firestore) return;

        try {
            const pendingItems = await database.getPendingSyncItems();

            for (const item of pendingItems) {
                try {
                    await this.syncItem(item);
                    await database.markSynced(item.id);
                } catch (error) {
                    console.error('Failed to sync item:', item.id, error);
                    await database.incrementRetryCount(item.id);

                    // If retry count exceeds 5, log for manual intervention
                    if (item.retryCount >= 5) {
                        console.error('Item failed after 5 retries:', item);
                    }
                }
            }

            console.log(`Synced ${pendingItems.length} items`);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    private async syncItem(item: SyncQueueItem): Promise<void> {
        if (!this.firestore) throw new Error('Firestore not initialized');

        const collectionName = this.getCollectionName(item.type);
        const docRef = doc(this.firestore, collectionName, item.data.id);

        switch (item.action) {
            case 'create':
            case 'update':
                await setDoc(docRef, {
                    ...item.data,
                    updatedAt: Timestamp.now(),
                }, { merge: true });
                break;

            case 'delete':
                // Soft delete - mark as deleted instead of removing
                await setDoc(docRef, {
                    deleted: true,
                    deletedAt: Timestamp.now(),
                }, { merge: true });
                break;
        }
    }

    private getCollectionName(type: string): string {
        switch (type) {
            case 'adherence':
                return 'adherence_logs';
            case 'medicine':
                return 'medicines';
            case 'patient':
                return 'patients';
            case 'intervention':
                return 'interventions';
            default:
                throw new Error(`Unknown sync type: ${type}`);
        }
    }

    // Patient operations
    async savePatient(patient: Patient): Promise<void> {
        // Save locally first
        await database.savePatient(patient);

        // Queue for sync
        await database.addToSyncQueue({
            id: `sync_${Date.now()}_${Math.random()}`,
            type: 'patient',
            action: 'update',
            data: patient,
            timestamp: new Date(),
            synced: false,
            retryCount: 0,
        });

        // Try immediate sync if online
        if (this.isOnline) {
            await this.syncPendingChanges();
        }
    }

    async getPatient(patientId: string): Promise<Patient | null> {
        // Try local first
        const localPatient = await database.getPatient(patientId);

        if (localPatient) return localPatient;

        // If not found locally and online, try Firebase
        if (this.isOnline && this.firestore) {
            const docRef = doc(this.firestore, 'patients', patientId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const patient = this.firestoreToPatient(docSnap.data());
                await database.savePatient(patient);
                return patient;
            }
        }

        return null;
    }

    // Medicine operations
    async saveMedicine(medicine: Medicine): Promise<void> {
        await database.saveMedicine(medicine);

        await database.addToSyncQueue({
            id: `sync_${Date.now()}_${Math.random()}`,
            type: 'medicine',
            action: 'update',
            data: medicine,
            timestamp: new Date(),
            synced: false,
            retryCount: 0,
        });

        if (this.isOnline) {
            await this.syncPendingChanges();
        }
    }

    async getMedicinesByPatient(patientId: string): Promise<Medicine[]> {
        return await database.getMedicinesByPatient(patientId);
    }

    // Adherence log operations
    async saveAdherenceLog(log: AdherenceLog): Promise<void> {
        await database.saveAdherenceLog(log);

        await database.addToSyncQueue({
            id: `sync_${Date.now()}_${Math.random()}`,
            type: 'adherence',
            action: 'create',
            data: log,
            timestamp: new Date(),
            synced: false,
            retryCount: 0,
        });

        if (this.isOnline) {
            await this.syncPendingChanges();
        }
    }

    async getAdherenceLogs(patientId: string, startDate: Date, endDate: Date): Promise<AdherenceLog[]> {
        return await database.getAdherenceLogs(patientId, startDate, endDate);
    }

    // Real-time listeners
    listenToPatientMedicines(
        patientId: string,
        callback: (medicines: Medicine[]) => void
    ): Unsubscribe | null {
        if (!this.firestore || !this.isOnline) return null;

        const q = query(
            collection(this.firestore, 'medicines'),
            where('patientId', '==', patientId),
            where('deleted', '!=', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const medicines: Medicine[] = [];

            snapshot.forEach((doc) => {
                const medicine = this.firestoreToMedicine(doc.data());
                medicines.push(medicine);

                // Update local database
                database.saveMedicine(medicine);
            });

            callback(medicines);
        });

        this.listeners.push(unsubscribe);
        return unsubscribe;
    }

    // Helper methods to convert Firestore data to app models
    private firestoreToPatient(data: any): Patient {
        return {
            id: data.id,
            medDropId: data.medDropId,
            name: data.name,
            phone: data.phone,
            age: data.age,
            gender: data.gender,
            guardians: data.guardians || [],
            linkedPharmacy: data.linkedPharmacy,
            language: data.language,
            emergencyContact: data.emergencyContact,
            photo: data.photo,
            aadhaar: data.aadhaar,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }

    private firestoreToMedicine(data: any): Medicine {
        return {
            id: data.id,
            patientId: data.patientId,
            name: data.name,
            genericName: data.genericName,
            photo: data.photo,
            dosage: data.dosage,
            schedule: data.schedule,
            isCritical: data.isCritical,
            color: data.color,
            daysRemaining: data.daysRemaining,
            totalDays: data.totalDays,
            addedBy: data.addedBy,
            addedByName: data.addedByName,
            instructions: data.instructions,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }

    getOnlineStatus(): boolean {
        return this.isOnline;
    }

    async getLastSyncTime(): Promise<Date | null> {
        const lastSync = await database.getSetting('lastSyncTime');
        return lastSync ? new Date(lastSync) : null;
    }

    async updateLastSyncTime(): Promise<void> {
        await database.saveSetting('lastSyncTime', new Date().toISOString());
    }
}

export const firebaseService = new FirebaseService();
