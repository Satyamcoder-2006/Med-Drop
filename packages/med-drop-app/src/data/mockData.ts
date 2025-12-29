// Mock Data for Med Drop App
// This file contains all mock data for testing the UI without backend

export type MealRelation = 'before' | 'after' | 'with' | 'anytime';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'bedtime';
export type IntakeStatus = 'taken' | 'missed' | 'snoozed' | 'unwell' | 'confused' | 'wrong-time';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface MedicineSchedule {
    time: string;
    meal: MealType;
    relation: MealRelation;
}

export interface Medicine {
    id: string;
    name: string;
    dosage: string;
    color: string;
    shape: string;
    imageUrl: string; // emoji placeholder
    schedule: MedicineSchedule[];
    instructions?: string;
}

export interface AdherenceLog {
    id: string;
    patientId: string;
    medicineId: string;
    medicineName: string;
    scheduledTime: string;
    actualTime?: string;
    status: IntakeStatus;
    notes?: string;
}

export interface Patient {
    id: string;
    name: string;
    phone: string;
    age: number;
    photoUrl?: string;
    medicines: Medicine[];
    adherenceLogs: AdherenceLog[];
    riskLevel: RiskLevel;
    consecutiveMisses: number;
    adherenceRate: number;
    lastActivity: string;
}

export interface Alert {
    id: string;
    patientId: string;
    type: 'consecutive-miss' | 'sudden-stop' | 'no-response' | 'wrong-time';
    severity: RiskLevel;
    message: string;
    timestamp: string;
    acknowledged: boolean;
}

// Mock Medicine Images (using emoji as placeholders)
const MEDICINE_IMAGES = {
    aspirin: '💊',
    metformin: '💊',
    vitaminD: '🟡',
    lisinopril: '⚪',
};

// Mock Medicines with real-time schedules
const MOCK_MEDICINES: Medicine[] = [
    {
        id: 'med_1',
        name: 'Aspirin',
        dosage: '100mg',
        color: 'white',
        shape: 'round',
        imageUrl: '💊',
        schedule: [
            { meal: 'breakfast', time: '08:00', relation: 'after' },
            { meal: 'dinner', time: '20:00', relation: 'after' },
        ],
        instructions: 'Take with water after meals',
    },
    {
        id: 'med_2',
        name: 'Metformin',
        dosage: '500mg',
        color: 'white',
        shape: 'oval',
        imageUrl: '⚪',
        schedule: [
            { meal: 'breakfast', time: '08:30', relation: 'with' },
            { meal: 'dinner', time: '20:30', relation: 'with' },
        ],
        instructions: 'Take with meals',
    },
    {
        id: 'med_3',
        name: 'Vitamin D',
        dosage: '1000 IU',
        color: 'yellow',
        shape: 'capsule',
        imageUrl: '🟡',
        schedule: [
            { meal: 'breakfast', time: '09:00', relation: 'after' },
        ],
        instructions: 'Take once daily in the morning',
    },
    {
        id: 'med_4',
        name: 'Lisinopril',
        dosage: '10mg',
        color: 'pink',
        shape: 'round',
        imageUrl: '🔴',
        schedule: [
            { meal: 'bedtime', time: '22:00', relation: 'anytime' },
        ],
        instructions: 'Take before bedtime',
    },
    {
        id: 'med_test',
        name: 'Test Medicine',
        dosage: '50mg',
        color: 'blue',
        shape: 'capsule',
        imageUrl: '💙',
        schedule: [
            { meal: 'lunch', time: '16:20', relation: 'anytime' },
        ],
        instructions: 'TEST: Take now for demo',
    },
];

// Helper function to get today's date string
const getTodayDateString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// Helper function to create a date-time from time string
const createDateTime = (timeString: string): Date => {
    const today = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);
    return today;
};

// Mock Patients with EMPTY adherence logs (no pre-logged data)
export const MOCK_PATIENTS: Patient[] = [
    {
        id: 'patient_1',
        name: 'John Doe',
        age: 65,
        phone: '9999999992',
        medicines: MOCK_MEDICINES,
        adherenceLogs: [], // Empty - no pre-logged medicines
        riskLevel: 'low',
        consecutiveMisses: 0,
        adherenceRate: 100,
        lastActivity: new Date().toISOString(),
    },
    {
        id: 'patient_2',
        name: 'Jane Smith',
        age: 58,
        phone: '9999999993',
        medicines: [MOCK_MEDICINES[0], MOCK_MEDICINES[2]], // Only Aspirin and Vitamin D
        adherenceLogs: [], // Empty - no pre-logged medicines
        riskLevel: 'low',
        consecutiveMisses: 0,
        adherenceRate: 100,
        lastActivity: new Date().toISOString(),
    },
    {
        id: 'patient_3',
        name: 'Bob Johnson',
        age: 72,
        phone: '9999999994',
        medicines: [MOCK_MEDICINES[1], MOCK_MEDICINES[3]], // Only Metformin and Lisinopril
        adherenceLogs: [], // Empty - no pre-logged medicines
        riskLevel: 'low',
        consecutiveMisses: 0,
        adherenceRate: 100,
        lastActivity: new Date().toISOString(),
    },
];

// Calculate risk level based on adherence
const calculateRiskLevel = (logs: AdherenceLog[]): { level: RiskLevel; consecutiveMisses: number; rate: number } => {
    const recentLogs = logs.slice(0, 10);
    const missedCount = recentLogs.filter(l => l.status === 'missed').length;
    const takenCount = recentLogs.filter(l => l.status === 'taken').length;
    const rate = recentLogs.length > 0 ? takenCount / recentLogs.length : 1; // Default to 100% if no logs

    // Check consecutive misses
    let consecutiveMisses = 0;
    for (const log of recentLogs) {
        if (log.status === 'missed') {
            consecutiveMisses++;
        } else {
            break;
        }
    }

    let level: RiskLevel = 'low';
    if (consecutiveMisses >= 3 || rate < 0.5) {
        level = 'high';
    } else if (consecutiveMisses >= 2 || rate < 0.7) {
        level = 'medium';
    }

    return { level, consecutiveMisses, rate };
};

// Mock Alerts
const MOCK_ALERTS: Alert[] = [
    {
        id: 'alert_001',
        patientId: 'patient_003',
        type: 'consecutive-miss',
        severity: 'high',
        message: 'Possible adherence risk detected',
        timestamp: new Date().toISOString(),
        acknowledged: false,
    },
    {
        id: 'alert_002',
        patientId: 'patient_002',
        type: 'wrong-time',
        severity: 'medium',
        message: 'Irregular medication timing observed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false,
    },
];

// Helper Functions

export const getMockPatients = async (): Promise<Patient[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PATIENTS;
};

export const getMockPatientById = async (id: string): Promise<Patient | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_PATIENTS.find(p => p.id === id) || null;
};

export const getMockAlerts = async (): Promise<Alert[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_ALERTS;
};

export const logMedicineIntake = async (log: Omit<AdherenceLog, 'id'>): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Wrong-time detection
    let finalStatus = log.status;
    let finalNotes = log.notes || '';

    if (log.status === 'taken' && log.actualTime) {
        const scheduledTime = new Date(log.scheduledTime);
        const actualTime = new Date(log.actualTime);
        const diffMinutes = Math.abs((actualTime.getTime() - scheduledTime.getTime()) / 60000);

        // If taken more than 60 minutes off schedule, mark as wrong-time
        if (diffMinutes > 60) {
            finalStatus = 'wrong-time';
            finalNotes = `Taken ${Math.round(diffMinutes)} minutes ${actualTime > scheduledTime ? 'late' : 'early'}. ${finalNotes}`;
            console.warn('⚠️ Wrong-time detection:', finalNotes);
        }
    }

    const newLog: AdherenceLog = {
        ...log,
        id: `log_${Date.now()}`,
        status: finalStatus,
        notes: finalNotes,
    };

    const patient = MOCK_PATIENTS.find(p => p.id === log.patientId);
    if (patient) {
        patient.adherenceLogs.unshift(newLog);
        // Recalculate risk
        const risk = calculateRiskLevel(patient.adherenceLogs);
        patient.riskLevel = risk.level;
        patient.consecutiveMisses = risk.consecutiveMisses;
        patient.adherenceRate = risk.rate;
        patient.lastActivity = new Date().toISOString();
    }

    console.log('Logged medicine intake:', newLog);
};

export const getTodaysMedicines = (patient: Patient): { medicine: Medicine; schedule: MedicineSchedule; status: IntakeStatus | 'pending' }[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: { medicine: Medicine; schedule: MedicineSchedule; status: IntakeStatus | 'pending' }[] = [];

    patient.medicines.forEach(medicine => {
        medicine.schedule.forEach(schedule => {
            const [hours, minutes] = schedule.time.split(':').map(Number);
            const scheduledTime = new Date(today);
            scheduledTime.setHours(hours, minutes, 0, 0);

            // Check if there's a log for this dose today
            // Match by: medicine ID + today's date + schedule time
            const log = patient.adherenceLogs.find(l => {
                const logDate = new Date(l.scheduledTime);
                const isSameDay = logDate.toDateString() === today.toDateString();
                const logTime = `${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}`;
                const isSameTime = logTime === schedule.time;
                const isSameMedicine = l.medicineId === medicine.id;

                return isSameMedicine && isSameDay && isSameTime;
            });

            console.log(`Checking ${medicine.name} at ${schedule.time}: ${log ? `Found log with status ${log.status}` : 'No log found'}`);

            result.push({
                medicine,
                schedule,
                status: log ? log.status : 'pending',
            });
        });
    });

    return result.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));
};

export const getCurrentMedicine = (patient: Patient): { medicine: Medicine; schedule: MedicineSchedule } | null => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const todayDateString = now.toISOString().split('T')[0];

    for (const medicine of patient.medicines) {
        for (const schedule of medicine.schedule) {
            const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
            const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;

            // Check if current time is within 30 minutes before or after scheduled time
            const timeDifference = Math.abs(currentTimeInMinutes - scheduleTimeInMinutes);

            if (timeDifference <= 30) {
                // Check if this medicine at this time has already been logged today
                const alreadyLogged = patient.adherenceLogs.some(log =>
                    log.medicineId === medicine.id &&
                    log.scheduledTime.startsWith(`${todayDateString}T${schedule.time}`)
                );

                if (!alreadyLogged) {
                    return { medicine, schedule };
                }
            }
        }
    }

    return null;
};

export const getNextMedicine = (patient: Patient): { medicine: Medicine; schedule: MedicineSchedule; timeUntil: string } | null => {
    const now = new Date();
    const todaysMeds = getTodaysMedicines(patient);
    const nowTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // Sort already handled by getTodaysMedicines, but let's be sure
    const sortedMeds = [...todaysMeds].sort((a, b) => {
        const [h1, m1] = a.schedule.time.split(':').map(Number);
        const [h2, m2] = b.schedule.time.split(':').map(Number);
        return (h1 * 60 + m1) - (h2 * 60 + m2);
    });

    for (const item of sortedMeds) {
        if (item.status === 'pending') {
            const [schedHours, schedMins] = item.schedule.time.split(':').map(Number);
            const schedTimeInMinutes = schedHours * 60 + schedMins;

            if (schedTimeInMinutes > nowTimeInMinutes) {
                const diffMins = schedTimeInMinutes - nowTimeInMinutes;
                const timeUntil = diffMins < 60
                    ? `in ${diffMins} minutes`
                    : `at ${item.schedule.time}`;

                return { medicine: item.medicine, schedule: item.schedule, timeUntil };
            }
        }
    }

    return null;
};
