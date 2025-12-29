import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// Twilio configuration (optional - set via environment variables)
const TWILIO_ACCOUNT_SID = functions.config().twilio?.account_sid;
const TWILIO_AUTH_TOKEN = functions.config().twilio?.auth_token;
const TWILIO_PHONE_NUMBER = functions.config().twilio?.phone_number;

export async function sendSMSFallback(context: any) {
    console.log('Starting SMS fallback check...');

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
        // Get all patients
        const patientsSnapshot = await db.collection('patients').get();

        for (const patientDoc of patientsSnapshot.docs) {
            const patient = patientDoc.data();
            const patientId = patientDoc.id;

            // Check last sync time
            const lastSyncDoc = await db
                .collection('sync_status')
                .doc(patientId)
                .get();

            const lastSyncTime = lastSyncDoc.exists
                ? lastSyncDoc.data()?.lastSyncTime?.toDate()
                : null;

            // If no sync in 24 hours, send SMS
            if (!lastSyncTime || lastSyncTime < twentyFourHoursAgo) {
                await sendSMSToGuardians(patient, patientId, lastSyncTime);
            }

            // Check for critical missed medicines
            const criticalAlertsSnapshot = await db
                .collection('alerts')
                .where('patientId', '==', patientId)
                .where('type', '==', 'urgent')
                .where('actionTaken', '==', false)
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
                .get();

            if (!criticalAlertsSnapshot.empty) {
                await sendCriticalAlertSMS(patient, criticalAlertsSnapshot.docs);
            }
        }

        console.log('SMS fallback check completed');
        return { success: true };
    } catch (error) {
        console.error('Error in SMS fallback:', error);
        throw error;
    }
}

async function sendSMSToGuardians(patient: any, patientId: string, lastSyncTime: Date | null) {
    const guardianIds = patient.guardians || [];

    const hoursSinceSync = lastSyncTime
        ? Math.floor((Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60))
        : 'unknown';

    const message = `MED DROP Alert: ${patient.name}'s app has been offline for ${hoursSinceSync} hours. Last sync: ${lastSyncTime ? lastSyncTime.toLocaleString('en-IN') : 'Never'
        }. Please check on them. Call: ${patient.phone}`;

    for (const guardianId of guardianIds) {
        const guardianDoc = await db.collection('guardians').doc(guardianId).get();
        const guardian = guardianDoc.data();

        if (guardian && guardian.phone) {
            await sendSMS(guardian.phone, message);

            // Log SMS sent
            await db.collection('sms_logs').add({
                to: guardian.phone,
                message,
                type: 'offline_alert',
                patientId,
                guardianId,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
}

async function sendCriticalAlertSMS(patient: any, alertDocs: any[]) {
    const guardianIds = patient.guardians || [];

    const alertMessages = alertDocs.map(doc => {
        const alert = doc.data();
        return `${alert.title}: ${alert.message}`;
    }).join('. ');

    const message = `URGENT - MED DROP: ${patient.name} - ${alertMessages}. Please call immediately: ${patient.phone}`;

    for (const guardianId of guardianIds) {
        const guardianDoc = await db.collection('guardians').doc(guardianId).get();
        const guardian = guardianDoc.data();

        if (guardian && guardian.phone) {
            await sendSMS(guardian.phone, message);

            // Log SMS sent
            await db.collection('sms_logs').add({
                to: guardian.phone,
                message,
                type: 'critical_alert',
                patientId: patient.id,
                guardianId,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
}

async function sendSMS(to: string, message: string): Promise<void> {
    // If Twilio is not configured, log instead
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.log(`SMS (not sent - Twilio not configured): To: ${to}, Message: ${message}`);
        return;
    }

    try {
        // Dynamic import of Twilio
        const twilio = require('twilio');
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        await client.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: `+91${to}`, // Assuming Indian phone numbers
        });

        console.log(`SMS sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send SMS to ${to}:`, error);
        throw error;
    }
}

export async function syncOfflineActions(data: any, context: any) {
    console.log('Processing offline sync...');

    const { patientId, actions } = data;

    if (!patientId || !actions || !Array.isArray(actions)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid sync data');
    }

    try {
        const results = [];

        for (const action of actions) {
            try {
                await processAction(action);
                results.push({ id: action.id, status: 'success' });
            } catch (error) {
                console.error(`Failed to process action ${action.id}:`, error);
                results.push({ id: action.id, status: 'failed', error: String(error) });
            }
        }

        // Update last sync time
        await db.collection('sync_status').doc(patientId).set({
            lastSyncTime: admin.firestore.FieldValue.serverTimestamp(),
            itemsSynced: actions.length,
        }, { merge: true });

        return { success: true, results };
    } catch (error) {
        console.error('Error in offline sync:', error);
        throw new functions.https.HttpsError('internal', 'Sync failed');
    }
}

async function processAction(action: any): Promise<void> {
    const { type, data: actionData } = action;

    switch (type) {
        case 'adherence':
            await db.collection('adherence_logs').add({
                ...actionData,
                syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            break;

        case 'medicine':
            await db.collection('medicines').doc(actionData.id).set(actionData, { merge: true });
            break;

        case 'patient':
            await db.collection('patients').doc(actionData.id).set(actionData, { merge: true });
            break;

        default:
            throw new Error(`Unknown action type: ${type}`);
    }
}
