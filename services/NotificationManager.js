import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import dbManager from '../database/DatabaseManager';
import voiceManager from './VoiceManager';
import CONSTANTS from '../config/constants';

const MEDICINE_REMINDER_TASK = 'MEDICINE_REMINDER_TASK';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH
    })
});

class NotificationManager {
    constructor() {
        this.notificationListener = null;
        this.responseListener = null;
    }

    /**
     * Request notification permissions
     */
    async requestPermissions() {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Notification permission not granted');
            return false;
        }

        return true;
    }

    /**
     * Schedule medicine reminder notification
     */
    async scheduleMedicineReminder(medicine, patientLanguage) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        // Parse scheduled time
        const [hours, minutes] = medicine.scheduled_time.split(':').map(Number);
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledDate <= now) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const trigger = {
            hour: hours,
            minute: minutes,
            repeats: true
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '💊 Medicine Time',
                body: `Time to take ${medicine.name}`,
                data: {
                    medicineId: medicine.id,
                    type: 'medicine_reminder',
                    language: patientLanguage
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH
            },
            trigger
        });

        return notificationId;
    }

    /**
     * Schedule follow-up reminder (30 minutes after missed)
     */
    async scheduleFollowUpReminder(medicine, patientLanguage) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        const trigger = {
            seconds: CONSTANTS.NOTIFICATION_TIMING.SECOND_REMINDER * 60
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Reminder',
                body: `Don't forget to take ${medicine.name}`,
                data: {
                    medicineId: medicine.id,
                    type: 'follow_up_reminder',
                    language: patientLanguage
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH
            },
            trigger
        });

        return notificationId;
    }

    /**
     * Send caregiver alert (2 hours after still missed)
     */
    async sendCaregiverAlert(patientId, medicineName) {
        // This would typically send via Firebase Cloud Messaging to caregiver's device
        // For now, we'll log it and add to intervention queue
        console.log(`Caregiver alert: Patient ${patientId} missed ${medicineName}`);

        // In production, this would call Firebase Cloud Function
        // await firebaseFunctions.httpsCallable('sendCaregiverAlert')({
        //   patientId,
        //   medicineName,
        //   timestamp: Date.now()
        // });
    }

    /**
     * Schedule evening summary notification
     */
    async scheduleEveningSummary(patientId, patientLanguage) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        const trigger = {
            hour: 20, // 8 PM
            minute: 0,
            repeats: true
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '📊 Daily Summary',
                body: 'Tap to see how you did today',
                data: {
                    patientId,
                    type: 'evening_summary',
                    language: patientLanguage
                },
                sound: false
            },
            trigger
        });

        return notificationId;
    }

    /**
     * Schedule weekly encouragement
     */
    async scheduleWeeklyEncouragement(streak, patientLanguage) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        const trigger = {
            weekday: 1, // Monday
            hour: 9,
            minute: 0,
            repeats: true
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '🎉 Great Job!',
                body: `You've maintained a ${streak}-day streak!`,
                data: {
                    type: 'weekly_encouragement',
                    streak,
                    language: patientLanguage
                },
                sound: false
            },
            trigger
        });

        return notificationId;
    }

    /**
     * Schedule refill reminder
     */
    async scheduleRefillReminder(medicine, daysRemaining) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        const trigger = {
            seconds: daysRemaining * 24 * 60 * 60
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '🔔 Refill Reminder',
                body: `${medicine.name} will run out in ${daysRemaining} days`,
                data: {
                    medicineId: medicine.id,
                    type: 'refill_reminder'
                },
                sound: true
            },
            trigger
        });

        return notificationId;
    }

    /**
     * Cancel a scheduled notification
     */
    async cancelNotification(notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    }

    /**
     * Cancel all notifications
     */
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get all scheduled notifications
     */
    async getAllScheduledNotifications() {
        return await Notifications.getAllScheduledNotificationsAsync();
    }

    /**
     * Setup notification listeners
     */
    setupListeners(onNotificationReceived, onNotificationResponse) {
        // Listener for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            const { data } = notification.request.content;

            // Play voice prompt if it's a medicine reminder
            if (data.type === 'medicine_reminder' && data.language) {
                voiceManager.setLanguage(data.language);
                // Voice will be played when user opens the notification
            }

            if (onNotificationReceived) {
                onNotificationReceived(notification);
            }
        });

        // Listener for user interactions with notifications
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const { data } = response.notification.request.content;

            // Handle different notification types
            if (data.type === 'medicine_reminder') {
                // Navigate to medicine detail or log screen
                if (onNotificationResponse) {
                    onNotificationResponse(response);
                }
            }
        });
    }

    /**
     * Remove notification listeners
     */
    removeListeners() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

    /**
     * Schedule all medicine reminders for a patient
     */
    async scheduleAllMedicineReminders(patientId) {
        const medicines = await dbManager.getTodaysMedicines(patientId);
        const patient = await dbManager.getPatient(patientId);
        const notificationIds = [];

        for (const medicine of medicines) {
            const notificationId = await this.scheduleMedicineReminder(medicine, patient.language_code);
            if (notificationId) {
                notificationIds.push({ medicineId: medicine.id, notificationId });
            }
        }

        return notificationIds;
    }
}

const notificationManager = new NotificationManager();
export default notificationManager;
