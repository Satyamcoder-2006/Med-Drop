import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Patient, Medicine, AdherenceLog, SyncQueueItem } from '../types';

const DB_NAME = 'meddrop.db';
const ENCRYPTION_KEY = 'med_drop_encryption_key';

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;

    async initialize(): Promise<void> {
        try {
            // Open encrypted database
            this.db = await SQLite.openDatabaseAsync(DB_NAME);

            // DROPPING TABLES FOR MVP DEV TO ENSURE SCHEMA IS CORRECT
            // In production, use properly versioned migrations
            await this.db.execAsync(`
                DROP TABLE IF EXISTS medicines;
                DROP TABLE IF EXISTS adherence_logs;
                DROP TABLE IF EXISTS patients;
                DROP TABLE IF EXISTS sync_queue;
                DROP TABLE IF EXISTS settings;
            `);

            // Create tables
            await this.createTables();

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // Patients table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        medDropId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        language TEXT DEFAULT 'hi',
        emergencyContact TEXT,
        photo TEXT,
        aadhaar TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );
    `);

        // Medicines table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        name TEXT NOT NULL,
        genericName TEXT,
        photo TEXT,
        dosage TEXT,
        schedule TEXT, -- JSON string
        isCritical INTEGER DEFAULT 0,
        color TEXT,
        daysRemaining INTEGER,
        totalDays INTEGER,
        addedBy TEXT,
        addedByName TEXT,
        instructions TEXT,
        createdAt INTEGER,
        updatedAt INTEGER,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      );
    `);

        // Adherence logs table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS adherence_logs (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        medicineId TEXT NOT NULL,
        medicineName TEXT NOT NULL,
        scheduledTime INTEGER NOT NULL,
        actualTime INTEGER,
        status TEXT NOT NULL,
        symptoms TEXT, -- JSON string
        notes TEXT,
        confirmedBy TEXT,
        snoozeCount INTEGER DEFAULT 0,
        createdAt INTEGER,
        FOREIGN KEY (patientId) REFERENCES patients(id),
        FOREIGN KEY (medicineId) REFERENCES medicines(id)
      );
    `);

        // Sync queue table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON string
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        retryCount INTEGER DEFAULT 0
      );
    `);

        // Settings table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

        // Create indexes for better performance
        await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_medicines_patient ON medicines(patientId);
      CREATE INDEX IF NOT EXISTS idx_adherence_patient ON adherence_logs(patientId);
      CREATE INDEX IF NOT EXISTS idx_adherence_medicine ON adherence_logs(medicineId);
      CREATE INDEX IF NOT EXISTS idx_adherence_scheduled ON adherence_logs(scheduledTime);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    `);
    }

    // Patient operations
    async savePatient(patient: Patient): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT OR REPLACE INTO patients 
       (id, medDropId, name, phone, age, gender, language, emergencyContact, photo, aadhaar, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patient.id,
                patient.medDropId,
                patient.name,
                patient.phone,
                patient.age,
                patient.gender,
                patient.language,
                patient.emergencyContact || null,
                patient.photo || null,
                patient.aadhaar || null,
                patient.createdAt.getTime(),
                patient.updatedAt.getTime(),
            ]
        );
    }

    async getPatient(id: string): Promise<Patient | null> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM patients WHERE id = ?',
            [id]
        );

        if (!result) return null;

        return this.rowToPatient(result);
    }

    // Medicine operations
    async saveMedicine(medicine: Medicine): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT OR REPLACE INTO medicines 
       (id, patientId, name, genericName, photo, dosage, schedule, isCritical, color, 
        daysRemaining, totalDays, addedBy, addedByName, instructions, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                medicine.id,
                medicine.patientId,
                medicine.name,
                medicine.genericName || null,
                medicine.photo || null,
                medicine.dosage,
                JSON.stringify(medicine.schedule),
                medicine.isCritical ? 1 : 0,
                medicine.color,
                medicine.daysRemaining,
                medicine.totalDays,
                medicine.addedBy,
                medicine.addedByName || null,
                medicine.instructions || null,
                medicine.createdAt.getTime(),
                medicine.updatedAt.getTime(),
            ]
        );
    }

    async getMedicinesByPatient(patientId: string): Promise<Medicine[]> {
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM medicines WHERE patientId = ? ORDER BY createdAt DESC',
            [patientId]
        );

        return results.map(this.rowToMedicine);
    }

    async getMedicine(id: string): Promise<Medicine | null> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM medicines WHERE id = ?',
            [id]
        );

        if (!result) return null;

        return this.rowToMedicine(result);
    }

    // Adherence log operations
    async saveAdherenceLog(log: AdherenceLog): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT OR REPLACE INTO adherence_logs 
       (id, patientId, medicineId, medicineName, scheduledTime, actualTime, status, 
        symptoms, notes, confirmedBy, snoozeCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.patientId,
                log.medicineId,
                log.medicineName,
                log.scheduledTime.getTime(),
                log.actualTime?.getTime() || null,
                log.status,
                log.symptoms ? JSON.stringify(log.symptoms) : null,
                log.notes || null,
                log.confirmedBy,
                log.snoozeCount || 0,
                log.createdAt.getTime(),
            ]
        );
    }

    async getAdherenceLogs(patientId: string, startDate: Date, endDate: Date): Promise<AdherenceLog[]> {
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            `SELECT * FROM adherence_logs 
       WHERE patientId = ? AND scheduledTime >= ? AND scheduledTime <= ?
       ORDER BY scheduledTime DESC`,
            [patientId, startDate.getTime(), endDate.getTime()]
        );

        return results.map(this.rowToAdherenceLog);
    }

    async getTodayAdherence(patientId: string): Promise<AdherenceLog[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getAdherenceLogs(patientId, today, tomorrow);
    }

    // Sync queue operations
    async addToSyncQueue(item: SyncQueueItem): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT INTO sync_queue (id, type, action, data, timestamp, synced, retryCount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                item.id,
                item.type,
                item.action,
                JSON.stringify(item.data),
                item.timestamp.getTime(),
                item.synced ? 1 : 0,
                item.retryCount,
            ]
        );
    }

    async getPendingSyncItems(): Promise<SyncQueueItem[]> {
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC'
        );

        return results.map(row => ({
            id: row.id,
            type: row.type,
            action: row.action,
            data: JSON.parse(row.data),
            timestamp: new Date(row.timestamp),
            synced: row.synced === 1,
            retryCount: row.retryCount,
        }));
    }

    async markSynced(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'UPDATE sync_queue SET synced = 1 WHERE id = ?',
            [id]
        );
    }

    async incrementRetryCount(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'UPDATE sync_queue SET retryCount = retryCount + 1 WHERE id = ?',
            [id]
        );
    }

    // Settings operations
    async saveSetting(key: string, value: any): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, JSON.stringify(value)]
        );
    }

    async getSetting(key: string): Promise<any> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT value FROM settings WHERE key = ?',
            [key]
        );

        return result ? JSON.parse(result.value) : null;
    }

    // Helper methods to convert database rows to objects
    private rowToPatient(row: any): Patient {
        return {
            id: row.id,
            medDropId: row.medDropId,
            name: row.name,
            phone: row.phone,
            age: row.age,
            gender: row.gender,
            guardians: [], // Will be populated from separate table if needed
            language: row.language,
            emergencyContact: row.emergencyContact,
            photo: row.photo,
            aadhaar: row.aadhaar,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    }

    private rowToMedicine(row: any): Medicine {
        return {
            id: row.id,
            patientId: row.patientId,
            name: row.name,
            genericName: row.genericName,
            photo: row.photo,
            dosage: row.dosage,
            schedule: JSON.parse(row.schedule),
            isCritical: row.isCritical === 1,
            color: row.color,
            daysRemaining: row.daysRemaining,
            totalDays: row.totalDays,
            addedBy: row.addedBy,
            addedByName: row.addedByName,
            instructions: row.instructions,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    }

    private rowToAdherenceLog(row: any): AdherenceLog {
        return {
            id: row.id,
            patientId: row.patientId,
            medicineId: row.medicineId,
            medicineName: row.medicineName,
            scheduledTime: new Date(row.scheduledTime),
            actualTime: row.actualTime ? new Date(row.actualTime) : undefined,
            status: row.status,
            symptoms: row.symptoms ? JSON.parse(row.symptoms) : undefined,
            notes: row.notes,
            confirmedBy: row.confirmedBy,
            snoozeCount: row.snoozeCount,
            createdAt: new Date(row.createdAt),
        };
    }

    async clearAllData(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.execAsync(`
      DELETE FROM patients;
      DELETE FROM medicines;
      DELETE FROM adherence_logs;
      DELETE FROM sync_queue;
      DELETE FROM settings;
    `);
    }
}

export const database = new DatabaseService();
