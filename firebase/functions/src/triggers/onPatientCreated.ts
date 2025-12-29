import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function onPatientCreated(snap: admin.firestore.QueryDocumentSnapshot, context: any) {
    const patient = snap.data();
    const patientId = snap.id;

    console.log(`New patient created: ${patientId}`);

    // Send welcome notification to patient
    await sendFCMNotification(patientId, {
        title: '💊 Welcome to MED DROP!',
        body: `Hi ${patient.name}, your medicine reminders are now active.`,
        data: {
            type: 'welcome',
        },
    });

    // Notify guardians
    const guardianIds = patient.guardians || [];
    for (const guardianId of guardianIds) {
        await sendFCMNotification(guardianId, {
            title: '👤 New Patient Added',
            body: `You are now monitoring ${patient.name}`,
            data: {
                type: 'patient_added',
                patientId,
            },
        });
    }

    return null;
}

export async function onMedicineAdded(snap: admin.firestore.QueryDocumentSnapshot, context: any) {
    const medicine = snap.data();
    const medicineId = snap.id;

    console.log(`New medicine added: ${medicineId}`);

    // Notify patient
    await sendFCMNotification(medicine.patientId, {
        title: '💊 New Medicine Added',
        body: `${medicine.name} has been added to your schedule`,
        data: {
            type: 'medicine_added',
            medicineId,
        },
    });

    // Get patient to notify guardians
    const patientDoc = await db.collection('patients').doc(medicine.patientId).get();
    const patient = patientDoc.data();

    if (patient) {
        const guardianIds = patient.guardians || [];
        for (const guardianId of guardianIds) {
            await sendFCMNotification(guardianId, {
                title: '💊 Medicine Added',
                body: `${medicine.name} added for ${patient.name}`,
                data: {
                    type: 'medicine_added',
                    patientId: medicine.patientId,
                    medicineId,
                },
            });
        }
    }

    return null;
}

export async function onAdherenceLogged(snap: admin.firestore.QueryDocumentSnapshot, context: any) {
    const log = snap.data();

    console.log(`Adherence logged: ${log.medicineName} - ${log.status}`);

    // Get patient
    const patientDoc = await db.collection('patients').doc(log.patientId).get();
    const patient = patientDoc.data();

    if (!patient) return null;

    // Notify guardians only for certain statuses
    if (log.status === 'missed' || (log.symptoms && log.symptoms.length > 0)) {
        const guardianIds = patient.guardians || [];

        let title = '';
        let body = '';

        if (log.status === 'missed') {
            title = '❌ Medicine Missed';
            body = `${patient.name} missed ${log.medicineName}`;
        } else if (log.symptoms) {
            title = '⚕️ Symptoms Reported';
            body = `${patient.name} reported symptoms after ${log.medicineName}`;
        }

        for (const guardianId of guardianIds) {
            await sendFCMNotification(guardianId, {
                title,
                body,
                data: {
                    type: 'adherence_update',
                    patientId: log.patientId,
                    status: log.status,
                },
            });
        }
    }

    return null;
}

async function sendFCMNotification(userId: string, payload: any) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) return;

        await admin.messaging().send({
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
        });
    } catch (error) {
        console.error('Error sending FCM notification:', error);
    }
}
