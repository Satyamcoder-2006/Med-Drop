export interface Patient {
    id: string;
    medDropId: string; // Unique human-readable ID (e.g., MD-8822-4411)
    name: string;
    phone: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    language: string;
    linkedPharmacyId: string;
    guardians: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Medicine {
    id: string;
    patientId: string;
    name: string;
    dosage: string;
    type: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'inhaler' | 'drops' | 'other';
    schedule: MedicineSchedule[];
    isCritical: boolean;
    daysRemaining: number;
    totalDays: number; // For refill calculation
    addedBy: 'pharmacy' | 'guardian' | 'patient';
    createdAt: Date;
    updatedAt: Date;
}

export interface MedicineSchedule {
    time: string; // HH:mm format
    frequency: 'OD' | 'BD' | 'TDS' | 'QDS' | 'SOS' | 'custom';
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface Pharmacy {
    id: string;
    name: string;
    licenseNumber: string;
    pharmacistName: string;
    pharmacistPhone: string;
    location: {
        address: string;
        city: string;
        state: string;
        zipCode: string;
    };
    incentiveBalance: number;
    patientsHelped: number;
    badge: 'bronze' | 'silver' | 'gold' | 'platinum';
    createdAt: Date;
}

export interface RefillRequest {
    id: string;
    pharmacyId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    medicineId: string;
    medicineName: string;
    dosage: string;
    daysRemaining: number;
    status: 'pending' | 'ready' | 'completed' | 'cancelled';
    createdAt: Date;
}
