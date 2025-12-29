import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function calculateRefillDates(context: any) {
    console.log('Starting refill date calculation...');

    const now = new Date();

    try {
        // Get all medicines
        const medicinesSnapshot = await db.collection('medicines').get();

        for (const medicineDoc of medicinesSnapshot.docs) {
            const medicine = medicineDoc.data();
            const medicineId = medicineDoc.id;

            // Calculate days remaining
            const daysRemaining = medicine.daysRemaining || 0;

            // Get patient and guardians
            const patientDoc = await db.collection('patients').doc(medicine.patientId).get();
            const patient = patientDoc.data();

            if (!patient) continue;

            // Send alerts based on days remaining
            if (daysRemaining <= 3 && daysRemaining > 0) {
                // Critical: 3 days or less
                await sendRefillAlert(patient, medicine, 'urgent', daysRemaining);

                // Also notify pharmacy
                if (patient.linkedPharmacy) {
                    await notifyPharmacy(patient.linkedPharmacy, patient, medicine);
                }
            } else if (daysRemaining <= 7 && daysRemaining > 3) {
                // Warning: 7 days or less
                await sendRefillAlert(patient, medicine, 'important', daysRemaining);
            }

            // Update days remaining (decrement by 1)
            if (daysRemaining > 0) {
                await medicineDoc.ref.update({
                    daysRemaining: daysRemaining - 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }

        console.log('Refill date calculation completed');
        return { success: true };
    } catch (error) {
        console.error('Error in refill date calculation:', error);
        throw error;
    }
}

async function sendRefillAlert(patient: any, medicine: any, type: string, daysRemaining: number) {
    const guardianIds = patient.guardians || [];

    const alertTitle = type === 'urgent'
        ? '🔴 Medicine Running Out Soon'
        : '⚠️ Medicine Refill Needed';

    const alertMessage = `${medicine.name} for ${patient.name} has only ${daysRemaining} days remaining`;

    // Send to patient
    const patientAlert = {
        patientId: patient.id,
        patientName: patient.name,
        type: 'info',
        title: alertTitle,
        message: `Your ${medicine.name} has ${daysRemaining} days remaining`,
        context: 'Please arrange for refill soon',
        medicineId: medicine.id,
        actionTaken: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('alerts').add(patientAlert);

    // Send to guardians
    for (const guardianId of guardianIds) {
        const guardianAlert = {
            patientId: patient.id,
            patientName: patient.name,
            guardianId,
            type,
            title: alertTitle,
            message: alertMessage,
            context: `Medicine: ${medicine.name}, Dosage: ${medicine.dosage}`,
            medicineId: medicine.id,
            actionTaken: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('alerts').add(guardianAlert);

        // Send FCM notification
        await sendFCMNotification(guardianId, {
            title: alertTitle,
            body: alertMessage,
            data: {
                type,
                patientId: patient.id,
                medicineId: medicine.id,
            },
        });
    }
}

async function notifyPharmacy(pharmacyId: string, patient: any, medicine: any) {
    const pharmacyDoc = await db.collection('pharmacies').doc(pharmacyId).get();
    const pharmacy = pharmacyDoc.data();

    if (!pharmacy) return;

    // Create refill request
    await db.collection('refill_requests').add({
        pharmacyId,
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        daysRemaining: medicine.daysRemaining,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send notification to pharmacy
    await sendFCMNotification(pharmacy.pharmacistPhone, {
        title: '📋 Refill Request',
        body: `${patient.name} needs refill for ${medicine.name}`,
        data: {
            type: 'refill',
            patientId: patient.id,
            medicineId: medicine.id,
        },
    });
}

async function sendFCMNotification(userId: string, payload: any) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
            console.log(`No FCM token for user ${userId}`);
            return;
        }

        await admin.messaging().send({
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                },
            },
        });
    } catch (error) {
        console.error('Error sending FCM notification:', error);
    }
}
