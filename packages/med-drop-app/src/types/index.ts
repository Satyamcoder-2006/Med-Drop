export interface Patient {
  id: string;
  medDropId: string; // Format: MD-XXXX-XXXX
  name: string;
  phone: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  guardians: string[]; // Guardian IDs
  linkedPharmacy?: string;
  language: string; // ISO code: hi, en, ta, te, bn, mr, gu, kn, ml, pa
  emergencyContact?: string;
  photo?: string;
  aadhaar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  genericName?: string;
  photo?: string;
  dosage: string;
  schedule: MedicineSchedule[];
  isCritical: boolean;
  color: string; // Hex color for visual identification
  daysRemaining: number;
  totalDays: number;
  addedBy: 'pharmacy' | 'patient' | 'guardian';
  addedByName?: string;
  sideEffects?: string[];
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineSchedule {
  time: string; // HH:mm format
  frequency: 'OD' | 'BD' | 'TDS' | 'QID' | 'custom';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  daysOfWeek?: number[]; // 0-6, if not daily
}

export interface AdherenceLog {
  id: string;
  patientId: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'taken' | 'missed' | 'snoozed' | 'skipped';
  symptoms?: Symptom[];
  notes?: string;
  confirmedBy: 'patient' | 'guardian' | 'family';
  location?: {
    lat: number;
    lng: number;
  };
  snoozeCount?: number;
  createdAt: Date;
}

export interface Symptom {
  type: string;
  label: string;
  icon: string;
}

export interface SymptomReport {
  id: string;
  patientId: string;
  symptoms: string[]; // List of symptom IDs
  notes?: string;
  createdAt: Date;
}

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  role: 'family' | 'asha' | 'friend' | 'healthcare';
  patients: string[]; // Patient IDs
  preferredContact: 'app' | 'sms' | 'call';
  language: string;
  doNotDisturb?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Pharmacy {
  id: string;
  name: string;
  license: string;
  address: string;
  phone: string;
  pharmacistName: string;
  pharmacistPhone: string;
  patientsHelped: number;
  averageAdherence: number;
  incentiveBalance: number;
  partnershipCode?: string; // For government partnerships
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  patientId: string;
  guardianId: string;
  type: 'urgent' | 'important' | 'info';
  title: string;
  message: string;
  context?: string; // Additional context for guardian
  actionTaken: boolean;
  actionNotes?: string;
  medicineId?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Intervention {
  id: string;
  guardianId: string;
  guardianName: string;
  patientId: string;
  type: 'call' | 'sms' | 'visit' | 'video' | 'other';
  notes: string;
  outcome: 'resolved' | 'pending' | 'escalated';
  createdAt: Date;
}

export interface SyncQueueItem {
  id: string;
  type: 'adherence' | 'medicine' | 'patient' | 'intervention' | 'symptom_report';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
  retryCount: number;
}

export interface NotificationConfig {
  enabled: boolean;
  sound: string;
  vibration: boolean;
  fullScreen: boolean;
  customRingtone?: string;
}

export interface AppSettings {
  language: string;
  textSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  voiceEnabled: boolean;
  hapticFeedback: boolean;
  notifications: NotificationConfig;
  pin?: string;
  biometricEnabled: boolean;
}
