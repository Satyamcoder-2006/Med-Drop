import * as admin from 'firebase-admin';

const db = admin.firestore();

interface AdherenceRiskPatient {
    patientId: string;
    patientName: string;
    missedDoses: number;
    consecutiveMisses: number;
    criticalMedicines: string[];
    guardianIds: string[];
    lastActivity: Date;
}

export async function detectAdherenceRisk(context: any) {
    console.log('Starting adherence risk detection...');

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
        // Get all patients
        const patientsSnapshot = await db.collection('patients').get();

        for (const patientDoc of patientsSnapshot.docs) {
            const patient = patientDoc.data();
            const patientId = patientDoc.id;

            // Get today's adherence logs
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const adherenceLogsSnapshot = await db
                .collection('adherence_logs')
                .where('patientId', '==', patientId)
                .where('scheduledTime', '>=', admin.firestore.Timestamp.fromDate(today))
                .get();

            const logs = adherenceLogsSnapshot.docs.map(doc => doc.data());

            // Calculate missed doses
            const missedLogs = logs.filter(log => log.status === 'missed');
            const consecutiveMisses = calculateConsecutiveMisses(logs);

            // Get critical medicines
            const medicinesSnapshot = await db
                .collection('medicines')
                .where('patientId', '==', patientId)
                .where('isCritical', '==', true)
                .get();

            const criticalMedicines = medicinesSnapshot.docs.map(doc => doc.data().name);

            // Check for critical medicine misses
            const criticalMedicineMissed = missedLogs.some(log =>
                criticalMedicines.includes(log.medicineName)
            );

            // Determine risk level and send alerts
            if (criticalMedicineMissed || consecutiveMisses >= 3) {
                await sendUrgentAlert(patient, patientId, {
                    missedDoses: missedLogs.length,
                    consecutiveMisses,
                    criticalMedicines,
                });
            } else if (missedLogs.length >= 2) {
                await sendImportantAlert(patient, patientId, {
                    missedDoses: missedLogs.length,
                    consecutiveMisses,
                });
            }

            // Check for app inactivity (no logs in 48 hours)
            const lastLogSnapshot = await db
                .collection('adherence_logs')
                .where('patientId', '==', patientId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (!lastLogSnapshot.empty) {
                const lastLog = lastLogSnapshot.docs[0].data();
                const lastActivity = lastLog.createdAt.toDate();
                const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

                if (hoursSinceActivity >= 48) {
                    await sendInactivityAlert(patient, patientId, hoursSinceActivity);
                }
            }
        }

        console.log('Adherence risk detection completed');
        return { success: true };
    } catch (error) {
        console.error('Error in adherence risk detection:', error);
        throw error;
    }
}

function calculateConsecutiveMisses(logs: any[]): number {
    // Sort logs by scheduled time
    const sortedLogs = logs.sort((a, b) =>
        a.scheduledTime.toDate().getTime() - b.scheduledTime.toDate().getTime()
    );

    let consecutiveMisses = 0;
    let maxConsecutiveMisses = 0;

    for (const log of sortedLogs) {
        if (log.status === 'missed') {
            consecutiveMisses++;
            maxConsecutiveMisses = Math.max(maxConsecutiveMisses, consecutiveMisses);
        } else if (log.status === 'taken') {
            consecutiveMisses = 0;
        }
    }

    return maxConsecutiveMisses;
}

async function sendUrgentAlert(patient: any, patientId: string, riskData: any) {
    const guardianIds = patient.guardians || [];

    for (const guardianId of guardianIds) {
        const alert = {
            patientId,
            patientName: patient.name,
            guardianId,
            type: 'urgent',
            title: '🚨 URGENT: Medicine Adherence Risk',
            message: `${patient.name} has missed ${riskData.missedDoses} doses today`,
            context: `Consecutive misses: ${riskData.consecutiveMisses}. ${riskData.criticalMedicines.length > 0
                    ? `Critical medicines: ${riskData.criticalMedicines.join(', ')}`
                    : ''
                }`,
            actionTaken: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('alerts').add(alert);

        // Send FCM notification
        await sendFCMNotification(guardianId, {
            title: alert.title,
            body: alert.message,
            data: {
                type: 'urgent',
                patientId,
                alertId: alert.toString(),
            },
        });
    }
}

async function sendImportantAlert(patient: any, patientId: string, riskData: any) {
    const guardianIds = patient.guardians || [];

    for (const guardianId of guardianIds) {
        const alert = {
            patientId,
            patientName: patient.name,
            guardianId,
            type: 'important',
            title: '⚠️ Attention Needed',
            message: `${patient.name} missed ${riskData.missedDoses} doses today`,
            context: `This is the ${riskData.consecutiveMisses}${getOrdinalSuffix(riskData.consecutiveMisses)} consecutive miss`,
            actionTaken: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('alerts').add(alert);

        await sendFCMNotification(guardianId, {
            title: alert.title,
            body: alert.message,
            data: {
                type: 'important',
                patientId,
            },
        });
    }
}

async function sendInactivityAlert(patient: any, patientId: string, hoursSinceActivity: number) {
    const guardianIds = patient.guardians || [];
    const days = Math.floor(hoursSinceActivity / 24);

    for (const guardianId of guardianIds) {
        const alert = {
            patientId,
            patientName: patient.name,
            guardianId,
            type: 'urgent',
            title: '🔴 Patient App Inactive',
            message: `${patient.name}'s app has been inactive for ${days} days`,
            context: 'Patient may need help or phone may be off',
            actionTaken: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('alerts').add(alert);

        await sendFCMNotification(guardianId, {
            title: alert.title,
            body: alert.message,
            data: {
                type: 'urgent',
                patientId,
            },
        });
    }
}

async function sendFCMNotification(userId: string, payload: any) {
    try {
        // Get user's FCM token
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
                    channelId: 'alerts',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        });
    } catch (error) {
        console.error('Error sending FCM notification:', error);
    }
}

function getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}
