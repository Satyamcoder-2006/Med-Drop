import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Medicine, MedicineSchedule, AdherenceLog } from '../types';
import { database } from './DatabaseService';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
    }),
});

interface ScheduledNotification {
    medicineId: string;
    medicineName: string;
    time: Date;
    notificationId: string;
}

class NotificationService {
    private scheduledNotifications: Map<string, ScheduledNotification[]> = new Map();

    async initialize(): Promise<void> {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Notification permissions not granted');
            return;
        }

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('medicine-reminders', {
                name: 'Medicine Reminders',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF5733',
                sound: 'reminder', // Refers to reminder.wav in res/raw
                enableVibrate: true,
                showBadge: true,
            });

            await Notifications.setNotificationChannelAsync('critical-reminders', {
                name: 'Critical Medicine Reminders',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500],
                lightColor: '#FF0000',
                sound: 'reminder',
                enableVibrate: true,
                showBadge: true,
            });
        }

        console.log('Notification service initialized');
    }

    async scheduleMedicineReminders(medicine: Medicine, todayLogs: AdherenceLog[] = []): Promise<void> {
        // Cancel existing notifications for this medicine in our local map
        // (Though syncAllReminders calls cancelAllReminders, this is for safety)
        await this.cancelMedicineReminders(medicine.id);

        const notifications: ScheduledNotification[] = [];

        for (const schedule of medicine.schedule) {
            // Schedule for the next 7 days to handle the "already taken" logic precisely
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const targetDate = this.getTargetDate(schedule.time, dayOffset);
                const now = new Date();

                // Skip if target time is in the past
                if (targetDate <= now) continue;

                // If it's today, check if already taken
                if (dayOffset === 0) {
                    const isTaken = todayLogs.some(log =>
                        log.medicineId === medicine.id &&
                        log.status === 'taken' &&
                        this.isSameTimeSlot(log.scheduledTime, targetDate)
                    );
                    if (isTaken) {
                        console.log(`Skipping dose for ${medicine.name} at ${schedule.time} (Already taken today)`);
                        continue;
                    }
                }

                const notificationId = await this.scheduleReminder(medicine, schedule, targetDate);

                if (notificationId) {
                    console.log(`[SCHEDULED] ${medicine.name} for ${targetDate.toDateString()} ${targetDate.toTimeString().split(' ')[0]}`);
                    notifications.push({
                        medicineId: medicine.id,
                        medicineName: medicine.name,
                        time: targetDate,
                        notificationId,
                    });
                }
            }
        }

        this.scheduledNotifications.set(medicine.id, notifications);
    }

    private isSameTimeSlot(date1: Date, date2: Date): boolean {
        return date1.getHours() === date2.getHours() &&
            date1.getMinutes() === date2.getMinutes();
    }

    private getTargetDate(timeString: string, dayOffset: number): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    private async scheduleReminder(
        medicine: Medicine,
        schedule: MedicineSchedule,
        targetDate: Date
    ): Promise<string | null> {
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💊 Time to take your medicine',
                    body: `${medicine.name} - ${schedule.timeOfDay}`,
                    data: {
                        medicineId: medicine.id,
                        medicineName: medicine.name,
                        scheduledTime: schedule.time,
                        isCritical: medicine.isCritical,
                    },
                    sound: Platform.OS === 'ios' ? 'reminder.wav' : 'reminder',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    vibrate: [0, 250, 250, 250],
                    categoryIdentifier: 'MEDICINE_REMINDER',
                },
                trigger: Platform.OS === 'android'
                    ? {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: Math.max(1, Math.floor((targetDate.getTime() - Date.now()) / 1000)),
                    } as any
                    : targetDate,
            });

            return notificationId;
        } catch (error) {
            console.error('Failed to schedule notification:', error);
            return null;
        }
    }

    async cancelMedicineReminders(medicineId: string): Promise<void> {
        const notifications = this.scheduledNotifications.get(medicineId);

        if (notifications) {
            for (const notification of notifications) {
                await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
            }
            this.scheduledNotifications.delete(medicineId);
        }
    }

    async cancelAllReminders(): Promise<void> {
        // Total purge to clear any legacy/repeating notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        this.scheduledNotifications.clear();
        console.log('Cleared all scheduled notifications.');
    }

    async sendImmediateReminder(medicine: Medicine, message?: string): Promise<void> {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Medicine Reminder',
                body: message || `Time to take ${medicine.name}`,
                data: {
                    medicineId: medicine.id,
                    medicineName: medicine.name,
                    immediate: true,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // Immediate
        });
    }

    async snoozeReminder(medicineId: string, minutes: number = 15): Promise<void> {
        const medicine = await database.getMedicine(medicineId);

        if (!medicine) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Snoozed Reminder',
                body: `Time to take ${medicine.name}`,
                data: {
                    medicineId: medicine.id,
                    medicineName: medicine.name,
                    snoozed: true,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: minutes * 60,
            } as any,
        });
    }

    async sendMissedMedicineAlert(medicineName: string): Promise<void> {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '❌ Missed Medicine',
                body: `You missed ${medicineName}. Take it now if possible.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null,
        });
    }

    async sendDailySummary(taken: number, total: number): Promise<void> {
        const percentage = Math.round((taken / total) * 100);
        let emoji = '👍';
        let message = 'Good job!';

        if (percentage === 100) {
            emoji = '🎉';
            message = 'Perfect! You took all your medicines today!';
        } else if (percentage >= 80) {
            emoji = '👍';
            message = `Great! You took ${taken} out of ${total} medicines.`;
        } else {
            emoji = '⚠️';
            message = `You took ${taken} out of ${total} medicines. Try to do better tomorrow!`;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${emoji} Daily Summary`,
                body: message,
                sound: false,
            },
            trigger: null,
        });
    }

    async sendWeeklyEncouragement(adherencePercentage: number, streak: number): Promise<void> {
        let message = '';

        if (adherencePercentage >= 95) {
            message = `🔥 Amazing! ${streak} days streak! You're doing fantastic!`;
        } else if (adherencePercentage >= 85) {
            message = `👏 Great week! ${adherencePercentage}% adherence. Keep it up!`;
        } else if (adherencePercentage >= 70) {
            message = `💪 Good effort! ${adherencePercentage}% this week. You can do better!`;
        } else {
            message = `⚠️ ${adherencePercentage}% this week. Let's improve together!`;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📊 Weekly Progress',
                body: message,
                sound: false,
            },
            trigger: null,
        });
    }

    async syncAllReminders(patientId: string): Promise<void> {
        try {
            const medicines = await database.getMedicinesByPatient(patientId);
            const todayLogs = await database.getTodayAdherence(patientId);

            console.log(`Syncing reminders for ${medicines.length} medicines. Today's logs:`, todayLogs.length);

            // Cancel all first to ensure clean state
            await this.cancelAllReminders();

            let scheduledCount = 0;
            for (const medicine of medicines) {
                await this.scheduleMedicineReminders(medicine, todayLogs);
                scheduledCount += (this.scheduledNotifications.get(medicine.id)?.length || 0);
            }

            console.log(`Successfully synced ${scheduledCount} future doses across ${medicines.length} medicines.`);
        } catch (error) {
            console.error('Failed to sync reminders:', error);
        }
    }

    private parseTime(timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
        return await Notifications.getAllScheduledNotificationsAsync();
    }

    // Set up notification response listeners
    addNotificationResponseListener(
        callback: (response: Notifications.NotificationResponse) => void
    ): Notifications.Subscription {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }

    addNotificationReceivedListener(
        callback: (notification: Notifications.Notification) => void
    ): Notifications.Subscription {
        return Notifications.addNotificationReceivedListener(callback);
    }
}

export const notificationService = new NotificationService();
