import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Import all cloud functions
import { detectAdherenceRisk } from './adherence/detectAdherenceRisk';
import { calculateRefillDates } from './medicines/calculateRefillDates';
import { generateWeeklySummary } from './reports/generateWeeklySummary';
import { syncOfflineActions } from './sync/syncOfflineActions';
import { sendSMSFallback } from './notifications/sendSMSFallback';
import { calculatePharmacistIncentive } from './incentives/calculatePharmacistIncentive';
import { onPatientCreated } from './triggers/onPatientCreated';
import { onMedicineAdded } from './triggers/onMedicineAdded';
import { onAdherenceLogged } from './triggers/onAdherenceLogged';

// Scheduled functions
export const detectAdherenceRiskScheduled = functions.pubsub
    .schedule('every 30 minutes')
    .onRun(detectAdherenceRisk);

export const calculateRefillDatesScheduled = functions.pubsub
    .schedule('every day 09:00')
    .timeZone('Asia/Kolkata')
    .onRun(calculateRefillDates);

export const generateWeeklySummaryScheduled = functions.pubsub
    .schedule('every sunday 20:00')
    .timeZone('Asia/Kolkata')
    .onRun(generateWeeklySummary);

export const sendSMSFallbackScheduled = functions.pubsub
    .schedule('every 6 hours')
    .onRun(sendSMSFallback);

export const calculatePharmacistIncentiveScheduled = functions.pubsub
    .schedule('0 0 1 * *') // First day of every month
    .timeZone('Asia/Kolkata')
    .onRun(calculatePharmacistIncentive);

// HTTP callable functions
export const syncOfflineActionsCallable = functions.https.onCall(syncOfflineActions);

// Firestore triggers
export const onPatientCreatedTrigger = functions.firestore
    .document('patients/{patientId}')
    .onCreate(onPatientCreated);

export const onMedicineAddedTrigger = functions.firestore
    .document('medicines/{medicineId}')
    .onCreate(onMedicineAdded);

export const onAdherenceLoggedTrigger = functions.firestore
    .document('adherence_logs/{logId}')
    .onCreate(onAdherenceLogged);
