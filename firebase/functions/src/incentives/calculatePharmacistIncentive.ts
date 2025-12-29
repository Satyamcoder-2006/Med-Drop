import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function calculatePharmacistIncentive(context: any) {
    console.log('Starting pharmacist incentive calculation...');

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
        // Get all pharmacies
        const pharmaciesSnapshot = await db.collection('pharmacies').get();

        for (const pharmacyDoc of pharmaciesSnapshot.docs) {
            const pharmacy = pharmacyDoc.data();
            const pharmacyId = pharmacyDoc.id;

            // Get patients onboarded last month
            const patientsSnapshot = await db
                .collection('patients')
                .where('linkedPharmacy', '==', pharmacyId)
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(lastMonth))
                .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thisMonth))
                .get();

            const patientsOnboarded = patientsSnapshot.size;

            // Calculate adherence-based bonuses
            let adherenceBonuses = 0;

            for (const patientDoc of patientsSnapshot.docs) {
                const patientId = patientDoc.id;

                // Get adherence for last 30 days
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const adherenceLogsSnapshot = await db
                    .collection('adherence_logs')
                    .where('patientId', '==', patientId)
                    .where('scheduledTime', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
                    .get();

                const logs = adherenceLogsSnapshot.docs.map(doc => doc.data());

                if (logs.length > 0) {
                    const takenDoses = logs.filter(log => log.status === 'taken').length;
                    const adherencePercentage = (takenDoses / logs.length) * 100;

                    // ₹5 bonus if patient maintains >85% adherence for 30 days
                    if (adherencePercentage >= 85) {
                        adherenceBonuses += 5;
                    }
                }
            }

            // Calculate total incentive
            const onboardingIncentive = patientsOnboarded * 10; // ₹10 per patient
            const totalIncentive = onboardingIncentive + adherenceBonuses;

            // Update pharmacy incentive balance
            await pharmacyDoc.ref.update({
                incentiveBalance: admin.firestore.FieldValue.increment(totalIncentive),
                patientsHelped: admin.firestore.FieldValue.increment(patientsOnboarded),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Create incentive record
            await db.collection('incentive_records').add({
                pharmacyId,
                pharmacyName: pharmacy.name,
                month: lastMonth.toISOString().substring(0, 7), // YYYY-MM format
                patientsOnboarded,
                onboardingIncentive,
                adherenceBonuses,
                totalIncentive,
                status: 'pending_payout',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Send notification to pharmacy
            await sendIncentiveNotification(pharmacyId, pharmacy, totalIncentive, patientsOnboarded);

            // Update badge level
            await updatePharmacyBadge(pharmacyDoc.ref, pharmacy);
        }

        console.log('Pharmacist incentive calculation completed');
        return { success: true };
    } catch (error) {
        console.error('Error in pharmacist incentive calculation:', error);
        throw error;
    }
}

async function sendIncentiveNotification(
    pharmacyId: string,
    pharmacy: any,
    totalIncentive: number,
    patientsOnboarded: number
) {
    const message = `🎉 Monthly Incentive: ₹${totalIncentive} earned! You helped ${patientsOnboarded} patients last month.`;

    // Send FCM notification
    await sendFCMNotification(pharmacy.pharmacistPhone, {
        title: '💰 Monthly Incentive Ready',
        body: message,
        data: {
            type: 'incentive',
            amount: totalIncentive.toString(),
        },
    });
}

async function updatePharmacyBadge(pharmacyRef: any, pharmacy: any) {
    const patientsHelped = pharmacy.patientsHelped || 0;

    let badge = 'bronze';

    if (patientsHelped >= 500) {
        badge = 'platinum';
    } else if (patientsHelped >= 200) {
        badge = 'gold';
    } else if (patientsHelped >= 50) {
        badge = 'silver';
    }

    if (pharmacy.badge !== badge) {
        await pharmacyRef.update({
            badge,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send badge upgrade notification
        await sendFCMNotification(pharmacy.pharmacistPhone, {
            title: `🏆 Badge Upgraded to ${badge.toUpperCase()}!`,
            body: `Congratulations! You've helped ${patientsHelped} patients.`,
            data: {
                type: 'badge_upgrade',
                badge,
            },
        });
    }
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
