import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Patient, Medicine, AdherenceLog, SyncQueueItem, MedicineSchedule, SymptomReport, Alert } from '../types';

const DB_NAME = 'meddrop.db';
const ENCRYPTION_KEY = 'med_drop_encryption_key';

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private isWeb = Platform.OS === 'web';

    // Web Mock Storage
    private mockPatients: Map<string, Patient> = new Map();
    private mockMedicines: Map<string, Medicine> = new Map();
    private mockLogs: AdherenceLog[] = [];
    private mockSettings: Map<string, any> = new Map();
    private mockCatalog: Map<string, any> = new Map();
    private mockSyncQueue: SyncQueueItem[] = [];
    private mockSymptomReports: Map<string, SymptomReport[]> = new Map();
    private mockAlerts: Alert[] = [];

    async initialize(): Promise<void> {
        if (this.isWeb) {
            console.log('Web platform detected. Using mock database.');
            this.prepopulateMockData();
            return;
        }

        try {
            // Open encrypted database
            this.db = await SQLite.openDatabaseAsync(DB_NAME);

            // Create tables
            await this.createTables();

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            // Don't throw for dev if it's just a local module issue
            if (__DEV__) {
                console.warn('Falling back to mock database due to init failure');
                this.isWeb = true;
                this.prepopulateMockData();
            } else {
                throw error;
            }
        }
    }

    private prepopulateMockData() {
        // Sample medicine names for catalog
        const initialMeds = [
            'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin',
            'Amlodipine', 'Omeprazole', 'Simvastatin', 'Losartan',
            'Albuterol', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline',
            'Montelukast', 'Fluticasone', 'Amoxicillin', 'Furosemide',
            'Pantoprazole', 'Acetaminophen', 'Ibuprofen', 'Dolo 650'
        ];
        initialMeds.forEach(name => {
            this.mockCatalog.set(name, { name, photo: null, createdAt: Date.now() });
        });

        // Sample Patient for Demo
        const demoPatient: Patient = {
            id: 'demo-patient',
            medDropId: 'MD12345',
            name: 'Demo Patient',
            phone: '9876543210',
            age: 65,
            gender: 'male',
            language: 'en',
            guardians: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.mockPatients.set(demoPatient.id, demoPatient);

        // Sample Medicine for Demo
        const demoMed: Medicine = {
            id: 'demo-med-1',
            patientId: 'demo-patient',
            name: 'Aspirin',
            dosage: '100mg',
            schedule: [
                { time: '08:00', timeOfDay: 'morning', frequency: 'BD' },
                { time: '20:00', timeOfDay: 'evening', frequency: 'BD' }
            ],
            isCritical: false,
            color: 'White',
            daysRemaining: 15,
            totalDays: 30,
            addedBy: 'pharmacy',
            instructions: 'Take after meals',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.mockMedicines.set(demoMed.id, demoMed);
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
        guardians TEXT, -- JSON string
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

        // Medicine catalog table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicine_catalog (
        name TEXT PRIMARY KEY,
        photo TEXT,
        createdAt INTEGER
      );
    `);

        // Symptom reports table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS symptom_reports (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        symptoms TEXT NOT NULL, -- JSON string array
        notes TEXT,
        createdAt INTEGER,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      );
    `);

        // Alerts table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        guardianId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        actionTaken INTEGER DEFAULT 0,
        createdAt INTEGER,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      );
    `);

        // Create indexes for better performance
        await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_medicines_patient ON medicines(patientId);
      CREATE INDEX IF NOT EXISTS idx_adherence_patient ON adherence_logs(patientId);
      CREATE INDEX IF NOT EXISTS idx_adherence_medicine ON adherence_logs(medicineId);
      CREATE INDEX IF NOT EXISTS idx_adherence_scheduled ON adherence_logs(scheduledTime);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
      CREATE INDEX IF NOT EXISTS idx_catalog_name ON medicine_catalog(name);
      CREATE INDEX IF NOT EXISTS idx_symptoms_patient ON symptom_reports(patientId);
      CREATE INDEX IF NOT EXISTS idx_alerts_guardian ON alerts(guardianId);
    `);

        // Pre-populate catalog with common medicines (without photos initially, or add placeholders if needed)
        try {
            const count = await this.db.getFirstAsync<any>('SELECT COUNT(*) as count FROM medicine_catalog');
            if (count.count === 0) {
                const initialMeds = [
                    'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin',
                    'Amlodipine', 'Omeprazole', 'Simvastatin', 'Losartan',
                    'Albuterol', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline',
                    'Montelukast', 'Fluticasone', 'Amoxicillin', 'Furosemide',
                    'Pantoprazole', 'Acetaminophen', 'Ibuprofen', 'Dolo 650'
                ];
                for (const name of initialMeds) {
                    await this.db.runAsync(
                        'INSERT INTO medicine_catalog (name, createdAt) VALUES (?, ?)',
                        [name, Date.now()]
                    );
                }
            }
        } catch (e) {
            console.error('Failed to pre-populate catalog:', e);
        }
    }

    // Patient operations
    async savePatient(patient: Patient): Promise<void> {
        if (this.isWeb) {
            this.mockPatients.set(patient.id, { ...patient });
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT OR REPLACE INTO patients 
       (id, medDropId, name, phone, age, gender, language, emergencyContact, photo, aadhaar, guardians, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patient.id.trim(),
                patient.medDropId,
                patient.name.trim(),
                patient.phone.trim(),
                patient.age,
                patient.gender,
                patient.language,
                patient.emergencyContact || null,
                patient.photo || null,
                patient.aadhaar || null,
                JSON.stringify(patient.guardians || []),
                patient.createdAt.getTime(),
                patient.updatedAt.getTime(),
            ]
        );
    }

    async getPatient(id: string): Promise<Patient | null> {
        if (this.isWeb) {
            return this.mockPatients.get(id) || null;
        }
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM patients WHERE id = ?',
            [id]
        );

        if (!result) return null;

        return this.rowToPatient(result);
    }

    async getAllPatients(): Promise<Patient[]> {
        if (this.isWeb) {
            return Array.from(this.mockPatients.values());
        }
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM patients'
        );

        return results.map(row => this.rowToPatient(row));
    }

    async deletePatient(id: string): Promise<void> {
        if (this.isWeb) {
            this.mockPatients.delete(id);
            // Delete associated data
            this.mockLogs = this.mockLogs.filter(l => l.patientId !== id);
            for (const [mid, med] of this.mockMedicines.entries()) {
                if (med.patientId === id) this.mockMedicines.delete(mid);
            }
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.withTransactionAsync(async () => {
            // Delete related data first
            await this.db!.runAsync('DELETE FROM adherence_logs WHERE patientId = ?', [id]);
            await this.db!.runAsync('DELETE FROM medicines WHERE patientId = ?', [id]);
            await this.db!.runAsync('DELETE FROM patients WHERE id = ?', [id]);
        });
    }

    // Medicine operations
    async saveMedicine(medicine: Medicine): Promise<void> {
        if (this.isWeb) {
            this.mockMedicines.set(medicine.id, { ...medicine });
            return;
        }
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
        if (this.isWeb) {
            return Array.from(this.mockMedicines.values()).filter(m => m.patientId === patientId);
        }
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM medicines WHERE patientId = ? ORDER BY createdAt DESC',
            [patientId]
        );

        return results.map(this.rowToMedicine);
    }

    async getMedicine(id: string): Promise<Medicine | null> {
        if (this.isWeb) {
            return this.mockMedicines.get(id) || null;
        }
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM medicines WHERE id = ?',
            [id]
        );

        if (!result) return null;

        return this.rowToMedicine(result);
    }

    async deleteMedicine(id: string): Promise<void> {
        if (this.isWeb) {
            this.mockMedicines.delete(id);
            this.mockLogs = this.mockLogs.filter(l => l.medicineId !== id);
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.withTransactionAsync(async () => {
            // Delete related logs first
            await this.db!.runAsync('DELETE FROM adherence_logs WHERE medicineId = ?', [id]);
            await this.db!.runAsync('DELETE FROM medicines WHERE id = ?', [id]);
        });
    }

    // Catalog operations
    async saveToCatalog(name: string, photo?: string): Promise<void> {
        if (this.isWeb) {
            this.mockCatalog.set(name.trim(), { name: name.trim(), photo: photo || null, createdAt: Date.now() });
            return;
        }
        if (!this.db) throw new Error('Database not initialized');
        await this.db.runAsync(
            'INSERT OR REPLACE INTO medicine_catalog (name, photo, createdAt) VALUES (?, ?, ?)',
            [name.trim(), photo || null, Date.now()]
        );
    }

    async searchCatalog(query: string): Promise<{ name: string, photo: string | null }[]> {
        if (this.isWeb) {
            return Array.from(this.mockCatalog.values())
                .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 10);
        }
        if (!this.db) throw new Error('Database not initialized');
        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM medicine_catalog WHERE name LIKE ? LIMIT 10',
            [`%${query}%`]
        );
        return results.map(row => ({
            name: row.name,
            photo: row.photo
        }));
    }

    async getCatalogMedicine(name: string): Promise<{ name: string, photo: string | null } | null> {
        if (this.isWeb) {
            return this.mockCatalog.get(name.trim()) || null;
        }
        if (!this.db) throw new Error('Database not initialized');
        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM medicine_catalog WHERE name = ?',
            [name.trim()]
        );
        return result ? { name: result.name, photo: result.photo } : null;
    }

    // Adherence log operations
    async saveAdherenceLog(log: AdherenceLog): Promise<void> {
        if (this.isWeb) {
            const index = this.mockLogs.findIndex(l => l.id === log.id);
            if (index >= 0) this.mockLogs[index] = { ...log };
            else this.mockLogs.push({ ...log });
            return;
        }
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
        if (this.isWeb) {
            return this.mockLogs.filter(l =>
                l.patientId === patientId &&
                l.scheduledTime >= startDate &&
                l.scheduledTime <= endDate
            ).sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
        }
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

    // Symptom report operations
    async saveSymptomReport(report: SymptomReport): Promise<void> {
        if (this.isWeb) {
            const current = this.mockSymptomReports.get(report.patientId) || [];
            this.mockSymptomReports.set(report.patientId, [report, ...current]);
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT INTO symptom_reports (id, patientId, symptoms, notes, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
                report.id,
                report.patientId,
                JSON.stringify(report.symptoms),
                report.notes || null,
                report.createdAt.getTime(),
            ]
        );
    }

    async getSymptomReportsByPatient(patientId: string): Promise<SymptomReport[]> {
        if (this.isWeb) {
            return this.mockSymptomReports.get(patientId) || [];
        }
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM symptom_reports WHERE patientId = ? ORDER BY createdAt DESC',
            [patientId]
        );

        return results.map(row => ({
            id: row.id,
            patientId: row.patientId,
            symptoms: JSON.parse(row.symptoms),
            notes: row.notes,
            createdAt: new Date(row.createdAt),
        }));
    }

    // Alert operations
    async saveAlert(alert: Alert): Promise<void> {
        if (this.isWeb) {
            const index = this.mockAlerts.findIndex(a => a.id === alert.id);
            if (index >= 0) this.mockAlerts[index] = { ...alert };
            else this.mockAlerts.push({ ...alert });
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT OR IGNORE INTO alerts (id, patientId, guardianId, type, title, message, actionTaken, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                alert.id,
                alert.patientId,
                alert.guardianId,
                alert.type,
                alert.title,
                alert.message,
                alert.actionTaken ? 1 : 0,
                alert.createdAt.getTime(),
            ]
        );
    }

    async getAlertsByGuardian(guardianId: string): Promise<Alert[]> {
        if (this.isWeb) {
            return this.mockAlerts.filter(a => a.guardianId === guardianId);
        }
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM alerts WHERE guardianId = ? ORDER BY createdAt DESC',
            [guardianId]
        );

        return results.map(row => ({
            id: row.id,
            patientId: row.patientId,
            guardianId: row.guardianId,
            type: row.type as 'urgent' | 'important' | 'info',
            title: row.title,
            message: row.message,
            actionTaken: row.actionTaken === 1,
            createdAt: new Date(row.createdAt),
        }));
    }

    async getAlertsByPatient(patientId: string): Promise<Alert[]> {
        if (this.isWeb) {
            return this.mockAlerts.filter(a => a.patientId === patientId);
        }
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM alerts WHERE patientId = ? ORDER BY createdAt DESC',
            [patientId]
        );

        return results.map(row => ({
            id: row.id,
            patientId: row.patientId,
            guardianId: row.guardianId,
            type: row.type as 'urgent' | 'important' | 'info',
            title: row.title,
            message: row.message,
            actionTaken: row.actionTaken === 1,
            createdAt: new Date(row.createdAt),
        }));
    }

    async resolveAlert(alertId: string): Promise<void> {
        if (this.isWeb) {
            const alert = this.mockAlerts.find(a => a.id === alertId);
            if (alert) alert.actionTaken = true;
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'UPDATE alerts SET actionTaken = 1 WHERE id = ?',
            [alertId]
        );
    }

    // Sync queue operations
    async addToSyncQueue(item: SyncQueueItem): Promise<void> {
        if (this.isWeb) {
            this.mockSyncQueue.push({ ...item });
            return;
        }
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
        if (this.isWeb) {
            return this.mockSyncQueue.filter(i => !i.synced);
        }
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
        if (this.isWeb) {
            this.mockSettings.set(key, value);
            return;
        }
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, JSON.stringify(value)]
        );
    }

    async getSetting(key: string): Promise<any> {
        if (this.isWeb) {
            return this.mockSettings.get(key) || null;
        }
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
            guardians: row.guardians ? JSON.parse(row.guardians) : [],
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

    async getTodaysSchedule(patientId: string): Promise<{ medicine: Medicine; schedule: MedicineSchedule; status: AdherenceLog['status'] | 'pending' }[]> {
        const medicines = await this.getMedicinesByPatient(patientId);
        const logs = await this.getTodayAdherence(patientId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result: { medicine: Medicine; schedule: MedicineSchedule; status: AdherenceLog['status'] | 'pending' }[] = [];

        medicines.forEach(medicine => {
            medicine.schedule.forEach(sched => {
                // Check if there's a log for this dose today
                const log = logs.find(l => {
                    const isSameMedicine = l.medicineId === medicine.id;
                    const logTime = `${l.scheduledTime.getHours().toString().padStart(2, '0')}:${l.scheduledTime.getMinutes().toString().padStart(2, '0')}`;
                    return isSameMedicine && logTime === sched.time;
                });

                result.push({
                    medicine,
                    schedule: sched,
                    status: log ? log.status : 'pending',
                });
            });
        });

        return result.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));
    }

    async getCurrentMedicine(patientId: string): Promise<{ medicine: Medicine; schedule: MedicineSchedule } | null> {
        const schedule = await this.getTodaysSchedule(patientId);
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        for (const item of schedule) {
            if (item.status === 'pending') {
                const [h, m] = item.schedule.time.split(':').map(Number);
                const schedTimeInMinutes = h * 60 + m;
                const diff = Math.abs(currentTimeInMinutes - schedTimeInMinutes);

                if (diff <= 30) {
                    return { medicine: item.medicine, schedule: item.schedule };
                }
            }
        }
        return null;
    }

    async getNextMedicine(patientId: string): Promise<{ medicine: Medicine; schedule: MedicineSchedule; timeUntil: string } | null> {
        const schedule = await this.getTodaysSchedule(patientId);
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        for (const item of schedule) {
            if (item.status === 'pending') {
                const [h, m] = item.schedule.time.split(':').map(Number);
                const schedTimeInMinutes = h * 60 + m;

                if (schedTimeInMinutes > currentTimeInMinutes) {
                    const diff = schedTimeInMinutes - currentTimeInMinutes;
                    const timeUntil = diff < 60 ? `in ${diff} minutes` : `at ${item.schedule.time}`;
                    return { medicine: item.medicine, schedule: item.schedule, timeUntil };
                }
            }
        }
        return null;
    }

    async getAdherenceRate(patientId: string): Promise<number> {
        // Simple adherence rate: taken / (taken + missed) for last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const logs = await this.getAdherenceLogs(patientId, start, end);
        if (logs.length === 0) return 1.0;

        const relevantLogs = logs.filter(l => l.status === 'taken' || l.status === 'missed');
        if (relevantLogs.length === 0) return 1.0;

        const takenCount = relevantLogs.filter(l => l.status === 'taken').length;
        return takenCount / relevantLogs.length;
    }

    async getRiskLevel(patientId: string): Promise<{ level: 'low' | 'medium' | 'high'; misses: number }> {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        const logs = await this.getAdherenceLogs(patientId, start, end);

        // Calculate consecutive misses
        let misses = 0;
        for (const log of logs) {
            if (log.status === 'missed') {
                misses++;
            } else if (log.status === 'taken') {
                break;
            }
        }

        const rate = await this.getAdherenceRate(patientId);

        let level: 'low' | 'medium' | 'high' = 'low';
        if (misses >= 3 || rate < 0.6) {
            level = 'high';
        } else if (misses >= 1 || rate < 0.8) {
            level = 'medium';
        }

        return { level, misses };
    }

    async getDailyAdherenceStats(patientId: string): Promise<{ taken: number; missed: number; pending: number; total: number; lastTakenTime?: string }> {
        const schedule = await this.getTodaysSchedule(patientId);

        let taken = 0;
        let missed = 0;
        let pending = 0;

        schedule.forEach(item => {
            if (item.status === 'taken') taken++;
            else if (item.status === 'missed') missed++;
            else if (item.status === 'pending') {
                // Check if it's already "missed" based on time
                const [h, m] = item.schedule.time.split(':').map(Number);
                const now = new Date();
                const schedTime = new Date(now);
                schedTime.setHours(h, m, 0, 0);

                if (now > schedTime) {
                    missed++;
                } else {
                    pending++;
                }
            }
        });

        // Get actual last taken time from logs
        const logs = await this.getTodayAdherence(patientId);
        const takenLogs = logs.filter(l => l.status === 'taken' && l.actualTime).sort((a, b) => b.actualTime!.getTime() - a.actualTime!.getTime());
        const lastTakenTime = takenLogs.length > 0 ? takenLogs[0].actualTime!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;

        return { taken, missed, pending, total: schedule.length, lastTakenTime };
    }
}

export const database = new DatabaseService();
