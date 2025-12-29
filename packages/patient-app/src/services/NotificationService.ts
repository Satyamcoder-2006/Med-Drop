import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Medicine, MedicineSchedule } from '../types';
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
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });

            await Notifications.setNotificationChannelAsync('critical-reminders', {
                name: 'Critical Medicine Reminders',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500],
                lightColor: '#FF0000',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });
        }

        console.log('Notification service initialized');
    }

    async scheduleMedicineReminders(medicine: Medicine): Promise<void> {
        // Cancel existing notifications for this medicine
        await this.cancelMedicineReminders(medicine.id);

        const notifications: ScheduledNotification[] = [];

        for (const schedule of medicine.schedule) {
            const notificationId = await this.scheduleReminder(medicine, schedule);

            if (notificationId) {
                const time = this.parseTime(schedule.time);
                notifications.push({
                    medicineId: medicine.id,
                    medicineName: medicine.name,
                    time,
                    notificationId,
                });
            }
        }

        this.scheduledNotifications.set(medicine.id, notifications);
    }

    private async scheduleReminder(
        medicine: Medicine,
        schedule: MedicineSchedule
    ): Promise<string | null> {
        try {
            const [hours, minutes] = schedule.time.split(':').map(Number);

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
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    vibrate: [0, 250, 250, 250],
                    categoryIdentifier: 'MEDICINE_REMINDER',
                },
                trigger: {
                    hour: hours,
                    minute: minutes,
                    repeats: true,
                    channelId: medicine.isCritical ? 'critical-reminders' : 'medicine-reminders',
                },
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
        await Notifications.cancelAllScheduledNotificationsAsync();
        this.scheduledNotifications.clear();
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
                seconds: minutes * 60,
            },
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
