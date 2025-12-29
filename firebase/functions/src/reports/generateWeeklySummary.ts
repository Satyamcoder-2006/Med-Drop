import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function generateWeeklySummary(context: any) {
    console.log('Starting weekly summary generation...');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        // Get all patients
        const patientsSnapshot = await db.collection('patients').get();

        for (const patientDoc of patientsSnapshot.docs) {
            const patient = patientDoc.data();
            const patientId = patientDoc.id;

            // Get week's adherence logs
            const adherenceLogsSnapshot = await db
                .collection('adherence_logs')
                .where('patientId', '==', patientId)
                .where('scheduledTime', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
                .get();

            const logs = adherenceLogsSnapshot.docs.map(doc => doc.data());

            if (logs.length === 0) continue;

            // Calculate statistics
            const totalDoses = logs.length;
            const takenDoses = logs.filter(log => log.status === 'taken').length;
            const missedDoses = logs.filter(log => log.status === 'missed').length;
            const adherencePercentage = Math.round((takenDoses / totalDoses) * 100);

            // Calculate streak
            const streak = calculateStreak(logs);

            // Identify patterns
            const patterns = identifyPatterns(logs);

            // Generate insights
            const insights = generateInsights(adherencePercentage, patterns, logs);

            // Create summary document
            const summary = {
                patientId,
                patientName: patient.name,
                weekStart: admin.firestore.Timestamp.fromDate(oneWeekAgo),
                weekEnd: admin.firestore.Timestamp.fromDate(now),
                totalDoses,
                takenDoses,
                missedDoses,
                adherencePercentage,
                streak,
                patterns,
                insights,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await db.collection('weekly_summaries').add(summary);

            // Send summary to guardians
            const guardianIds = patient.guardians || [];
            for (const guardianId of guardianIds) {
                await sendWeeklySummaryToGuardian(guardianId, patient, summary);
            }

            // Send summary to patient
            await sendWeeklySummaryToPatient(patientId, summary);
        }

        console.log('Weekly summary generation completed');
        return { success: true };
    } catch (error) {
        console.error('Error in weekly summary generation:', error);
        throw error;
    }
}

function calculateStreak(logs: any[]): number {
    const sortedLogs = logs.sort((a, b) =>
        b.scheduledTime.toDate().getTime() - a.scheduledTime.toDate().getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);

        const dayLogs = sortedLogs.filter(log => {
            const logDate = log.scheduledTime.toDate();
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === checkDate.getTime();
        });

        if (dayLogs.length === 0) break;

        const allTaken = dayLogs.every(log => log.status === 'taken');
        if (allTaken) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

function identifyPatterns(logs: any[]): any {
    const patterns: any = {
        missedDays: [],
        missedTimes: {},
        symptoms: {},
    };

    // Identify which days medicines were missed
    const dayOfWeekMisses: Record<number, number> = {};

    logs.filter(log => log.status === 'missed').forEach(log => {
        const dayOfWeek = log.scheduledTime.toDate().getDay();
        dayOfWeekMisses[dayOfWeek] = (dayOfWeekMisses[dayOfWeek] || 0) + 1;
    });

    // Find most problematic days
    const sortedDays = Object.entries(dayOfWeekMisses)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 2);

    patterns.missedDays = sortedDays.map(([day, count]) => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
        count,
    }));

    // Identify which times are most missed
    const timeMisses: Record<string, number> = {};

    logs.filter(log => log.status === 'missed').forEach(log => {
        const hour = log.scheduledTime.toDate().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        timeMisses[timeOfDay] = (timeMisses[timeOfDay] || 0) + 1;
    });

    patterns.missedTimes = timeMisses;

    // Track symptoms
    logs.forEach(log => {
        if (log.symptoms && log.symptoms.length > 0) {
            log.symptoms.forEach((symptom: any) => {
                patterns.symptoms[symptom.type] = (patterns.symptoms[symptom.type] || 0) + 1;
            });
        }
    });

    return patterns;
}

function generateInsights(adherencePercentage: number, patterns: any, logs: any[]): string[] {
    const insights: string[] = [];

    // Overall adherence insight
    if (adherencePercentage >= 95) {
        insights.push('🎉 Excellent adherence! Keep up the great work!');
    } else if (adherencePercentage >= 85) {
        insights.push('👍 Good adherence, but there\'s room for improvement');
    } else if (adherencePercentage >= 70) {
        insights.push('⚠️ Adherence needs attention. Consider setting more reminders');
    } else {
        insights.push('🚨 Low adherence detected. Immediate intervention recommended');
    }

    // Pattern-based insights
    if (patterns.missedDays.length > 0) {
        const topDay = patterns.missedDays[0];
        insights.push(`📅 Most misses on ${topDay.day}. Consider extra reminders on this day`);
    }

    if (patterns.missedTimes.evening > (patterns.missedTimes.morning || 0)) {
        insights.push('🌆 Evening medicines are often missed. Set stronger evening reminders');
    }

    if (Object.keys(patterns.symptoms).length > 0) {
        const topSymptom = Object.entries(patterns.symptoms)
            .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        insights.push(`⚕️ Frequent symptom: ${topSymptom[0]}. Consider consulting doctor`);
    }

    return insights;
}

async function sendWeeklySummaryToGuardian(guardianId: string, patient: any, summary: any) {
    const message = generateGuardianMessage(patient.name, summary);

    const alert = {
        guardianId,
        patientId: patient.id,
        patientName: patient.name,
        type: 'info',
        title: '📊 Weekly Adherence Report',
        message,
        context: JSON.stringify(summary),
        actionTaken: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('alerts').add(alert);

    // Send FCM notification
    await sendFCMNotification(guardianId, {
        title: '📊 Weekly Report',
        body: message,
        data: {
            type: 'weekly_summary',
            patientId: patient.id,
        },
    });
}

async function sendWeeklySummaryToPatient(patientId: string, summary: any) {
    let message = '';

    if (summary.adherencePercentage >= 95) {
        message = `🎉 Perfect week! You took ${summary.takenDoses} out of ${summary.totalDoses} medicines!`;
    } else {
        message = `You took ${summary.takenDoses} out of ${summary.totalDoses} medicines this week (${summary.adherencePercentage}%)`;
    }

    // Send notification to patient
    await sendFCMNotification(patientId, {
        title: '📊 Your Weekly Progress',
        body: message,
        data: {
            type: 'weekly_summary',
        },
    });
}

function generateGuardianMessage(patientName: string, summary: any): string {
    return `${patientName}: ${summary.adherencePercentage}% adherence (${summary.takenDoses}/${summary.totalDoses} doses). ${summary.streak > 0 ? `${summary.streak}-day streak!` : 'No current streak'
        }`;
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
