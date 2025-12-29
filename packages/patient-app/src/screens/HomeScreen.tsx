import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Medicine, AdherenceLog } from '../types';
import { database } from '../services/DatabaseService';
import { voiceService } from '../services/VoiceService';
import { notificationService } from '../services/NotificationService';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
    patientId: string;
    onNavigate: (screen: string, params?: any) => void;
}

export default function HomeScreen({ patientId, onNavigate }: HomeScreenProps) {
    const [currentMedicine, setCurrentMedicine] = useState<Medicine | null>(null);
    const [todayProgress, setTodayProgress] = useState({ taken: 0, total: 0 });
    const [nextMedicine, setNextMedicine] = useState<{ medicine: Medicine; time: string } | null>(null);

    useEffect(() => {
        loadTodayData();

        // Refresh every minute
        const interval = setInterval(loadTodayData, 60000);

        return () => clearInterval(interval);
    }, [patientId]);

    const loadTodayData = async () => {
        try {
            const medicines = await database.getMedicinesByPatient(patientId);
            const logs = await database.getTodayAdherence(patientId);

            // Calculate progress
            const totalDoses = medicines.reduce((sum, med) => sum + med.schedule.length, 0);
            const takenDoses = logs.filter(log => log.status === 'taken').length;

            setTodayProgress({ taken: takenDoses, total: totalDoses });

            // Find current medicine (due now or overdue)
            const current = findCurrentMedicine(medicines, logs);
            setCurrentMedicine(current);

            // Find next medicine
            const next = findNextMedicine(medicines, logs);
            setNextMedicine(next);

            // Play voice if medicine is due
            if (current) {
                await voiceService.speakMedicineTime(current.name);
            }
        } catch (error) {
            console.error('Failed to load today data:', error);
        }
    };

    const findCurrentMedicine = (medicines: Medicine[], logs: AdherenceLog[]): Medicine | null => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        for (const medicine of medicines) {
            for (const schedule of medicine.schedule) {
                const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);

                // Check if this dose is due (within 30 minutes window)
                const scheduledTime = new Date(now);
                scheduledTime.setHours(scheduleHour, scheduleMinute, 0, 0);

                const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

                // If within -5 to +30 minutes window
                if (diffMinutes >= -5 && diffMinutes <= 30) {
                    // Check if not already taken
                    const alreadyTaken = logs.some(
                        log => log.medicineId === medicine.id &&
                            log.scheduledTime.getHours() === scheduleHour &&
                            log.scheduledTime.getMinutes() === scheduleMinute &&
                            log.status === 'taken'
                    );

                    if (!alreadyTaken) {
                        return medicine;
                    }
                }
            }
        }

        return null;
    };

    const findNextMedicine = (medicines: Medicine[], logs: AdherenceLog[]): { medicine: Medicine; time: string } | null => {
        const now = new Date();
        let nextMed: { medicine: Medicine; time: string; date: Date } | null = null;

        for (const medicine of medicines) {
            for (const schedule of medicine.schedule) {
                const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
                const scheduledTime = new Date(now);
                scheduledTime.setHours(scheduleHour, scheduleMinute, 0, 0);

                // If in the future today
                if (scheduledTime > now) {
                    if (!nextMed || scheduledTime < nextMed.date) {
                        const diffMinutes = Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
                        const timeUntil = diffMinutes < 60
                            ? `in ${diffMinutes} minutes`
                            : `at ${schedule.time}`;

                        nextMed = { medicine, time: timeUntil, date: scheduledTime };
                    }
                }
            }
        }

        return nextMed ? { medicine: nextMed.medicine, time: nextMed.time } : null;
    };

    const handleTookIt = async () => {
        if (!currentMedicine) return;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Save adherence log
        const log: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId,
            medicineId: currentMedicine.id,
            medicineName: currentMedicine.name,
            scheduledTime: new Date(),
            actualTime: new Date(),
            status: 'taken',
            confirmedBy: 'patient',
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(log);
        await voiceService.speakGoodJob();

        // Refresh data
        await loadTodayData();
    };

    const handleRemindMe = async () => {
        if (!currentMedicine) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await notificationService.snoozeReminder(currentMedicine.id, 15);
        await voiceService.speakSnoozeConfirm();

        // Update snooze count
        const log: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId,
            medicineId: currentMedicine.id,
            medicineName: currentMedicine.name,
            scheduledTime: new Date(),
            status: 'snoozed',
            confirmedBy: 'patient',
            snoozeCount: 1,
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(log);
        setCurrentMedicine(null);
    };

    const handleNotFeelingWell = () => {
        if (!currentMedicine) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onNavigate('SymptomReport', { medicineId: currentMedicine.id });
    };

    const progressPercentage = todayProgress.total > 0
        ? (todayProgress.taken / todayProgress.total) * 100
        : 0;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>💊 MED DROP</Text>
                <TouchableOpacity style={styles.sosButton}>
                    <Text style={styles.sosText}>🆘</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {currentMedicine ? (
                    <View style={styles.medicineAlert}>
                        <View style={[styles.medicineCard, { borderColor: currentMedicine.color }]}>
                            {currentMedicine.photo && (
                                <Image source={{ uri: currentMedicine.photo }} style={styles.medicineImage} />
                            )}
                            <View style={styles.medicineInfo}>
                                <Text style={styles.timeIcon}>
                                    {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
                                </Text>
                                <Text style={styles.medicineName}>{currentMedicine.name}</Text>
                                <Text style={styles.medicineDosage}>{currentMedicine.dosage}</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.tookItButton]}
                                onPress={handleTookIt}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionButtonText}>✓ I TOOK IT</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.remindButton]}
                                onPress={handleRemindMe}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionButtonText}>⏰ REMIND ME IN 15 MIN</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.unwellButton]}
                                onPress={handleNotFeelingWell}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionButtonText}>⚠ I'M NOT FEELING WELL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.progressSection}>
                        <View style={styles.progressRing}>
                            <Text style={styles.progressNumber}>{todayProgress.taken}/{todayProgress.total}</Text>
                            <Text style={styles.progressLabel}>Medicines Today</Text>
                        </View>

                        {progressPercentage === 100 ? (
                            <Text style={styles.congratsText}>🎉 Perfect! All medicines taken!</Text>
                        ) : (
                            <Text style={styles.progressText}>
                                Good job! You took {todayProgress.taken} medicines today
                            </Text>
                        )}

                        {nextMedicine && (
                            <View style={styles.nextMedicineCard}>
                                <Text style={styles.nextMedicineLabel}>Next Medicine</Text>
                                <Text style={styles.nextMedicineName}>{nextMedicine.medicine.name}</Text>
                                <Text style={styles.nextMedicineTime}>{nextMedicine.time}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => onNavigate('AllMedicines')}
                    >
                        <Text style={styles.quickActionIcon}>🏥</Text>
                        <Text style={styles.quickActionText}>All My Medicines</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => onNavigate('CallGuardian')}
                    >
                        <Text style={styles.quickActionIcon}>📞</Text>
                        <Text style={styles.quickActionText}>Call Guardian</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => onNavigate('AddMedicine')}
                    >
                        <Text style={styles.quickActionIcon}>➕</Text>
                        <Text style={styles.quickActionText}>Add Medicine</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    sosButton: {
        backgroundColor: '#EF4444',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosText: {
        fontSize: 24,
    },
    content: {
        padding: 16,
    },
    medicineAlert: {
        marginBottom: 24,
    },
    medicineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 4,
        alignItems: 'center',
        marginBottom: 20,
    },
    medicineImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
        marginBottom: 16,
    },
    medicineInfo: {
        alignItems: 'center',
    },
    timeIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    medicineName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    medicineDosage: {
        fontSize: 20,
        color: '#6B7280',
    },
    actionButtons: {
        gap: 12,
    },
    actionButton: {
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    tookItButton: {
        backgroundColor: '#10B981',
    },
    remindButton: {
        backgroundColor: '#F59E0B',
    },
    unwellButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    progressSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    progressRing: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#FFFFFF',
        borderWidth: 8,
        borderColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    progressNumber: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    progressLabel: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
    },
    congratsText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10B981',
        textAlign: 'center',
        marginBottom: 16,
    },
    progressText: {
        fontSize: 20,
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    nextMedicineCard: {
        backgroundColor: '#EFF6FF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#2563EB',
        width: '100%',
        alignItems: 'center',
    },
    nextMedicineLabel: {
        fontSize: 16,
        color: '#1E40AF',
        marginBottom: 8,
    },
    nextMedicineName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    nextMedicineTime: {
        fontSize: 18,
        color: '#2563EB',
    },
    quickActions: {
        gap: 12,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quickActionIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    quickActionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
});
