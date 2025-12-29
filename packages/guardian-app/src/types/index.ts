export interface Patient {
    id: string;
    medDropId: string;
    name: string;
    phone: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    language: string;
    lastSyncTime?: Date;
    batteryLevel?: number;
    appVersion?: string;
    status: 'active' | 'inactive' | 'offline';
}

export interface AdherenceLog {
    id: string;
    patientId: string;
    medicineId: string;
    medicineName: string;
    scheduledTime: Date;
    actualTime?: Date;
    status: 'taken' | 'missed' | 'snoozed' | 'skipped';
    symptoms?: { type: string }[];
    syncedAt?: Date;
}

export interface Guardian {
    id: string;
    name: string;
    phone: string;
    email?: string;
    patients: string[]; // List of patient IDs
    fcmToken?: string;
}

export interface Alert {
    id: string;
    type: 'urgent' | 'important' | 'info';
    title: string;
    message: string;
    context?: string;
    patientId: string;
    medicineId?: string;
    isRead: boolean;
    createdAt: Date;
}
