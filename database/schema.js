import * as SQLite from 'expo-sqlite';

// SQLite database schema initialization
const DB_NAME = 'meddrop.db';

// Initialize database
export const initDatabase = async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    try {
        // Enable foreign keys
        await db.execAsync('PRAGMA foreign_keys = ON;');

        // Create tables
        await db.execAsync(`
      -- Patients table
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        language_code TEXT DEFAULT 'hi-IN',
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Medicines table
      CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        image_uri TEXT,
        color TEXT DEFAULT 'blue',
        time_slot TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        pills_per_dose INTEGER DEFAULT 1,
        total_pills INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );

      -- Adherence logs table
      CREATE TABLE IF NOT EXISTS adherence_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        scheduled_time INTEGER NOT NULL,
        actual_time INTEGER,
        status TEXT NOT NULL CHECK(status IN ('taken', 'missed', 'unwell')),
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );

      -- Symptoms table
      CREATE TABLE IF NOT EXISTS symptoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adherence_log_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        symptom_type TEXT NOT NULL,
        audio_uri TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (adherence_log_id) REFERENCES adherence_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );

      -- Caregivers table
      CREATE TABLE IF NOT EXISTS caregivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        role TEXT DEFAULT 'family',
        firebase_uid TEXT UNIQUE,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Patient-Caregiver associations
      CREATE TABLE IF NOT EXISTS patient_caregivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        caregiver_id INTEGER NOT NULL,
        relationship TEXT,
        can_edit BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (caregiver_id) REFERENCES caregivers(id) ON DELETE CASCADE,
        UNIQUE(patient_id, caregiver_id)
      );

      -- Interventions table
      CREATE TABLE IF NOT EXISTS interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        caregiver_id INTEGER NOT NULL,
        intervention_type TEXT NOT NULL CHECK(intervention_type IN ('call', 'visit', 'sms', 'other')),
        notes TEXT,
        follow_up_date INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (caregiver_id) REFERENCES caregivers(id) ON DELETE CASCADE
      );

      -- Sync queue table (for offline-first sync)
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
        data TEXT,
        synced BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        synced_at INTEGER
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_medicines_patient ON medicines(patient_id);
      CREATE INDEX IF NOT EXISTS idx_adherence_logs_medicine ON adherence_logs(medicine_id);
      CREATE INDEX IF NOT EXISTS idx_adherence_logs_patient ON adherence_logs(patient_id);
      CREATE INDEX IF NOT EXISTS idx_adherence_logs_scheduled_time ON adherence_logs(scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_symptoms_adherence_log ON symptoms(adherence_log_id);
      CREATE INDEX IF NOT EXISTS idx_patient_caregivers_patient ON patient_caregivers(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_caregivers_caregiver ON patient_caregivers(caregiver_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_patient ON interventions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    `);

        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

export default initDatabase;
