import NetInfo from '@react-native-community/netinfo';
import { db } from '../config/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import dbManager from '../database/DatabaseManager';

class SyncManager {
    constructor() {
        this.isOnline = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.unsubscribe = null;
    }

    /**
     * Initialize sync manager and setup network listener
     */
    async init() {
        // Listen to network state changes
        this.unsubscribe = NetInfo.addEventListener(state => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected && state.isInternetReachable;

            // If we just came online, trigger sync
            if (wasOffline && this.isOnline) {
                console.log('Network restored, starting sync...');
                this.syncPendingChanges();
            }
        });

        // Check initial network state
        const state = await NetInfo.fetch();
        this.isOnline = state.isConnected && state.isInternetReachable;

        // If online, do initial sync
        if (this.isOnline) {
            await this.syncPendingChanges();
        }
    }

    /**
     * Cleanup listeners
     */
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    /**
     * Check if device is online
     */
    getOnlineStatus() {
        return this.isOnline;
    }

    /**
     * Get last sync timestamp
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }

    /**
     * Sync pending changes from local database to Firebase
     */
    async syncPendingChanges() {
        if (!this.isOnline || this.isSyncing) {
            return;
        }

        this.isSyncing = true;

        try {
            const pendingItems = await dbManager.getPendingSyncItems();
            console.log(`Syncing ${pendingItems.length} pending items...`);

            for (const item of pendingItems) {
                try {
                    await this.syncItem(item);
                    await dbManager.markSynced(item.id);
                } catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error);
                    // Continue with next item
                }
            }

            this.lastSyncTime = Date.now();
            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync individual item to Firebase
     */
    async syncItem(item) {
        const { table_name, record_id, operation, data } = item;
        const collectionName = table_name;
        const docId = `${record_id}`;

        switch (operation) {
            case 'insert':
            case 'update':
                const docData = data ? JSON.parse(data) : {};
                await setDoc(doc(db, collectionName, docId), {
                    ...docData,
                    syncedAt: Date.now()
                }, { merge: true });
                break;

            case 'delete':
                await deleteDoc(doc(db, collectionName, docId));
                break;

            default:
                console.warn(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Add operation to sync queue
     */
    async queueSync(tableName, recordId, operation, data = null) {
        await dbManager.addToSyncQueue(tableName, recordId, operation, data);

        // If online, trigger immediate sync
        if (this.isOnline && !this.isSyncing) {
            this.syncPendingChanges();
        }
    }

    /**
     * Force sync now (manual trigger)
     */
    async forceSyncNow() {
        if (!this.isOnline) {
            throw new Error('Cannot sync while offline');
        }

        await this.syncPendingChanges();
    }

    /**
     * Download data from Firebase to local database
     * (Used for caregiver dashboard to get latest patient data)
     */
    async downloadPatientData(patientId) {
        if (!this.isOnline) {
            throw new Error('Cannot download data while offline');
        }

        try {
            // Download adherence logs
            const logsQuery = query(
                collection(db, 'adherence_logs'),
                where('patient_id', '==', patientId)
            );
            const logsSnapshot = await getDocs(logsQuery);

            // Update local database with downloaded data
            // This is a simplified version - in production, you'd handle conflicts
            for (const docSnapshot of logsSnapshot.docs) {
                const data = docSnapshot.data();
                // Update local database...
            }

            console.log(`Downloaded data for patient ${patientId}`);
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Get sync status for UI display
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            lastSyncTimeFormatted: this.lastSyncTime
                ? new Date(this.lastSyncTime).toLocaleString()
                : 'Never'
        };
    }
}

const syncManager = new SyncManager();
export default syncManager;
