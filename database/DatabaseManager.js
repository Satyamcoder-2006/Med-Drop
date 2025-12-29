import * as SQLite from 'expo-sqlite';
import { initDatabase } from './schema';

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!this.db) {
            this.db = await initDatabase();
        }
        return this.db;
    }

    async getDb() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    }

    // ========== PATIENT OPERATIONS ==========

    async createPatient(patientData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO patients (name, phone, language_code, emergency_contact_name, emergency_contact_phone) 
       VALUES (?, ?, ?, ?, ?)`,
            [
                patientData.name,
                patientData.phone,
                patientData.languageCode || 'hi-IN',
                patientData.emergencyContactName,
                patientData.emergencyContactPhone
            ]
        );
        return result.lastInsertRowId;
    }

    async getPatient(patientId) {
        const db = await this.getDb();
        return await db.getFirstAsync('SELECT * FROM patients WHERE id = ?', [patientId]);
    }

    async updatePatient(patientId, updates) {
        const db = await this.getDb();
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), patientId];
        await db.runAsync(
            `UPDATE patients SET ${fields}, updated_at = strftime('%s', 'now') WHERE id = ?`,
            values
        );
    }

    // ========== MEDICINE OPERATIONS ==========

    async createMedicine(medicineData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO medicines (patient_id, name, image_uri, color, time_slot, scheduled_time, 
                              duration_days, start_date, end_date, pills_per_dose, total_pills) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                medicineData.patientId,
                medicineData.name,
                medicineData.imageUri,
                medicineData.color || 'blue',
                medicineData.timeSlot,
                medicineData.scheduledTime,
                medicineData.durationDays,
                medicineData.startDate,
                medicineData.endDate,
                medicineData.pillsPerDose || 1,
                medicineData.totalPills
            ]
        );
        return result.lastInsertRowId;
    }

    async getMedicine(medicineId) {
        const db = await this.getDb();
        return await db.getFirstAsync('SELECT * FROM medicines WHERE id = ?', [medicineId]);
    }

    async getPatientMedicines(patientId) {
        const db = await this.getDb();
        return await db.getAllAsync(
            'SELECT * FROM medicines WHERE patient_id = ? ORDER BY scheduled_time',
            [patientId]
        );
    }

    async getTodaysMedicines(patientId) {
        const db = await this.getDb();
        const now = Math.floor(Date.now() / 1000);
        return await db.getAllAsync(
            `SELECT * FROM medicines 
       WHERE patient_id = ? AND start_date <= ? AND end_date >= ?
       ORDER BY scheduled_time`,
            [patientId, now, now]
        );
    }

    async updateMedicine(medicineId, updates) {
        const db = await this.getDb();
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), medicineId];
        await db.runAsync(`UPDATE medicines SET ${fields} WHERE id = ?`, values);
    }

    async deleteMedicine(medicineId) {
        const db = await this.getDb();
        await db.runAsync('DELETE FROM medicines WHERE id = ?', [medicineId]);
    }

    // ========== ADHERENCE LOG OPERATIONS ==========

    async logAdherence(logData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO adherence_logs (medicine_id, patient_id, scheduled_time, actual_time, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                logData.medicineId,
                logData.patientId,
                logData.scheduledTime,
                logData.actualTime || Math.floor(Date.now() / 1000),
                logData.status,
                logData.notes
            ]
        );
        return result.lastInsertRowId;
    }

    async getAdherenceLogs(patientId, startDate, endDate) {
        const db = await this.getDb();
        return await db.getAllAsync(
            `SELECT al.*, m.name as medicine_name, m.color 
       FROM adherence_logs al
       JOIN medicines m ON al.medicine_id = m.id
       WHERE al.patient_id = ? AND al.scheduled_time BETWEEN ? AND ?
       ORDER BY al.scheduled_time DESC`,
            [patientId, startDate, endDate]
        );
    }

    async getTodaysAdherence(patientId) {
        const db = await this.getDb();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return await db.getAllAsync(
            `SELECT al.*, m.name as medicine_name, m.color, m.time_slot
       FROM adherence_logs al
       JOIN medicines m ON al.medicine_id = m.id
       WHERE al.patient_id = ? AND al.scheduled_time BETWEEN ? AND ?
       ORDER BY al.scheduled_time`,
            [patientId, Math.floor(startOfDay.getTime() / 1000), Math.floor(endOfDay.getTime() / 1000)]
        );
    }

    async getAdherenceStreak(patientId) {
        const db = await this.getDb();
        const logs = await db.getAllAsync(
            `SELECT DATE(scheduled_time, 'unixepoch') as date, 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken
       FROM adherence_logs
       WHERE patient_id = ?
       GROUP BY DATE(scheduled_time, 'unixepoch')
       ORDER BY date DESC
       LIMIT 30`,
            [patientId]
        );

        let streak = 0;
        for (const log of logs) {
            if (log.taken === log.total) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // ========== SYMPTOM OPERATIONS ==========

    async logSymptom(symptomData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO symptoms (adherence_log_id, patient_id, symptom_type, audio_uri) 
       VALUES (?, ?, ?, ?)`,
            [
                symptomData.adherenceLogId,
                symptomData.patientId,
                symptomData.symptomType,
                symptomData.audioUri
            ]
        );
        return result.lastInsertRowId;
    }

    async getPatientSymptoms(patientId, days = 7) {
        const db = await this.getDb();
        const startDate = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
        return await db.getAllAsync(
            `SELECT s.*, al.medicine_id, m.name as medicine_name
       FROM symptoms s
       JOIN adherence_logs al ON s.adherence_log_id = al.id
       JOIN medicines m ON al.medicine_id = m.id
       WHERE s.patient_id = ? AND s.created_at >= ?
       ORDER BY s.created_at DESC`,
            [patientId, startDate]
        );
    }

    // ========== CAREGIVER OPERATIONS ==========

    async createCaregiver(caregiverData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO caregivers (name, email, phone, role, firebase_uid) 
       VALUES (?, ?, ?, ?, ?)`,
            [
                caregiverData.name,
                caregiverData.email,
                caregiverData.phone,
                caregiverData.role || 'family',
                caregiverData.firebaseUid
            ]
        );
        return result.lastInsertRowId;
    }

    async linkPatientToCaregiver(patientId, caregiverId, relationship, canEdit = false) {
        const db = await this.getDb();
        await db.runAsync(
            `INSERT INTO patient_caregivers (patient_id, caregiver_id, relationship, can_edit) 
       VALUES (?, ?, ?, ?)`,
            [patientId, caregiverId, relationship, canEdit ? 1 : 0]
        );
    }

    async getCaregiverPatients(caregiverId) {
        const db = await this.getDb();
        return await db.getAllAsync(
            `SELECT p.*, pc.relationship, pc.can_edit
       FROM patients p
       JOIN patient_caregivers pc ON p.id = pc.patient_id
       WHERE pc.caregiver_id = ?
       ORDER BY p.name`,
            [caregiverId]
        );
    }

    // ========== INTERVENTION OPERATIONS ==========

    async logIntervention(interventionData) {
        const db = await this.getDb();
        const result = await db.runAsync(
            `INSERT INTO interventions (patient_id, caregiver_id, intervention_type, notes, follow_up_date) 
       VALUES (?, ?, ?, ?, ?)`,
            [
                interventionData.patientId,
                interventionData.caregiverId,
                interventionData.interventionType,
                interventionData.notes,
                interventionData.followUpDate
            ]
        );
        return result.lastInsertRowId;
    }

    async getPatientInterventions(patientId, limit = 10) {
        const db = await this.getDb();
        return await db.getAllAsync(
            `SELECT i.*, c.name as caregiver_name
       FROM interventions i
       JOIN caregivers c ON i.caregiver_id = c.id
       WHERE i.patient_id = ?
       ORDER BY i.created_at DESC
       LIMIT ?`,
            [patientId, limit]
        );
    }

    // ========== SYNC QUEUE OPERATIONS ==========

    async addToSyncQueue(tableName, recordId, operation, data = null) {
        const db = await this.getDb();
        await db.runAsync(
            `INSERT INTO sync_queue (table_name, record_id, operation, data) 
       VALUES (?, ?, ?, ?)`,
            [tableName, recordId, operation, data ? JSON.stringify(data) : null]
        );
    }

    async getPendingSyncItems() {
        const db = await this.getDb();
        return await db.getAllAsync(
            'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at'
        );
    }

    async markSynced(syncId) {
        const db = await this.getDb();
        await db.runAsync(
            `UPDATE sync_queue SET synced = 1, synced_at = strftime('%s', 'now') WHERE id = ?`,
            [syncId]
        );
    }
}

// Export singleton instance
const dbManager = new DatabaseManager();
export default dbManager;
