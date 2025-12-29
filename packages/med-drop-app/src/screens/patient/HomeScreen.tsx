import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { database } from '../../services/DatabaseService';
import { notificationService } from '../../services/NotificationService';
import { Patient, AdherenceLog } from '../../types';
import ReminderModal from './ReminderModal';

export default function HomeScreen() {
    const { userId } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [todaysMeds, setTodaysMeds] = useState<any[]>([]);
    const [currentMed, setCurrentMed] = useState<any | null>(null);
    const [nextMed, setNextMed] = useState<any | null>(null);
    const [adherenceRate, setAdherenceRate] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showReminder, setShowReminder] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [userId])
    );

    useEffect(() => {
        // Active refresh every minute when in foreground
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, [userId]);

    const loadData = async () => {
        try {
            // Find patient by userId (which is phone)
            const patients = await database.getAllPatients();
            const currentPatient = patients.find(p => p.id === userId || p.phone === userId);

            if (currentPatient) {
                setPatient(currentPatient);

                const schedule = await database.getTodaysSchedule(currentPatient.id);
                setTodaysMeds(schedule);

                const current = await database.getCurrentMedicine(currentPatient.id);
                setCurrentMed(current);

                const next = await database.getNextMedicine(currentPatient.id);
                setNextMed(next);

                const rate = await database.getAdherenceRate(currentPatient.id);
                setAdherenceRate(rate);

                // Sync notifications
                await notificationService.syncAllReminders(currentPatient.id);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to load data:', error);
            setLoading(false);
        }
    };

    const handleTakeMedicine = async () => {
        if (!currentMed || !patient) return;

        const today = new Date();
        const [hours, minutes] = currentMed.schedule.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const newLog: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId: patient.id,
            medicineId: currentMed.medicine.id,
            medicineName: currentMed.medicine.name,
            scheduledTime,
            actualTime: new Date(),
            status: 'taken',
            confirmedBy: 'patient',
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(newLog);

        setShowReminder(false);
        await loadData(); // Refresh to update status
    };

    const handleSnoozeMedicine = async () => {
        if (!currentMed || !patient) return;

        const today = new Date();
        const [hours, minutes] = currentMed.schedule.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const newLog: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId: patient.id,
            medicineId: currentMed.medicine.id,
            medicineName: currentMed.medicine.name,
            scheduledTime,
            status: 'snoozed',
            notes: 'Snoozed for 15 minutes',
            confirmedBy: 'patient',
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(newLog);
        setShowReminder(false);
        await loadData();
    };

    const handleNotWell = async () => {
        if (!currentMed || !patient) return;

        const today = new Date();
        const [hours, minutes] = currentMed.schedule.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const newLog: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId: patient.id,
            medicineId: currentMed.medicine.id,
            medicineName: currentMed.medicine.name,
            scheduledTime,
            status: 'missed', // Mapping 'unwell' to 'missed' for adherence rate, or add 'skipped'
            notes: 'Patient reported not feeling well',
            confirmedBy: 'patient',
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(newLog);
        setShowReminder(false);
        await loadData();
    };

    const getMealIcon = (meal: string) => {
        switch (meal) {
            case 'morning': return '🌅';
            case 'afternoon': return '☀️';
            case 'evening': return '🌙';
            case 'night': return '😴';
            default: return '⏰';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'taken': return '#10B981';
            case 'missed': return '#EF4444';
            case 'snoozed': return '#F59E0B';
            case 'unwell': return '#F59E0B';
            case 'pending': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const takenCount = todaysMeds.filter(m => m.status === 'taken').length;
    const totalCount = todaysMeds.length;
    const progressPercentage = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>💊 MED DROP</Text>
                <Text style={styles.subtitle}>Patient Dashboard</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressRing}>
                        <Text style={styles.progressNumber}>{takenCount}/{totalCount}</Text>
                        <Text style={styles.progressLabel}>Today</Text>
                    </View>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressTitle}>Daily Progress</Text>
                        <Text style={styles.progressText}>
                            {progressPercentage === 100
                                ? '🎉 All done for today!'
                                : `${takenCount} of ${totalCount} medicines taken`}
                        </Text>
                        {patient && (
                            <Text style={styles.adherenceText}>
                                Weekly adherence: {Math.round(adherenceRate * 100)}%
                            </Text>
                        )}
                    </View>
                </View>

                {/* Current Medicine Alert */}
                {currentMed && (
                    <View style={styles.alertCard}>
                        <View style={styles.alertHeader}>
                            <Text style={styles.alertIcon}>⏰</Text>
                            <Text style={styles.alertTitle}>Time to take medicine!</Text>
                        </View>
                        <View style={styles.medicineCard}>
                            {currentMed.medicine.photo ? (
                                <Image source={{ uri: currentMed.medicine.photo }} style={styles.medicineImage} />
                            ) : (
                                <Text style={styles.medicineIcon}>💊</Text>
                            )}
                            <View style={styles.medicineInfo}>
                                <Text style={styles.medicineName}>{currentMed.medicine.name}</Text>
                                <Text style={styles.medicineDosage}>{currentMed.medicine.dosage}</Text>
                                <Text style={styles.medicineInstructions}>
                                    {getMealIcon(currentMed.schedule.timeOfDay)} {currentMed.medicine.instructions}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.takeButton}
                            onPress={() => setShowReminder(true)}
                        >
                            <Text style={styles.takeButtonText}>✓ OPEN REMINDER</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Next Medicine */}
                {nextMed && !currentMed && (
                    <View style={styles.nextCard}>
                        <Text style={styles.nextLabel}>Next Medicine</Text>
                        <Text style={styles.nextName}>{nextMed.medicine.name}</Text>
                        <Text style={styles.nextTime}>{nextMed.timeUntil}</Text>
                    </View>
                )}

                {/* Today's Schedule */}
                <View style={styles.scheduleSection}>
                    <Text style={styles.sectionTitle}>Today's Schedule</Text>

                    {['morning', 'afternoon', 'evening', 'night'].map(meal => {
                        const mealMeds = todaysMeds.filter(m => m.schedule.timeOfDay === meal);
                        if (mealMeds.length === 0) return null;

                        return (
                            <View key={meal} style={styles.mealGroup}>
                                <Text style={styles.mealTitle}>
                                    {getMealIcon(meal)} {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                </Text>
                                {mealMeds.map((item, index) => (
                                    <View key={index} style={styles.scheduleItem}>
                                        <View style={styles.scheduleLeft}>
                                            {item.medicine.photo ? (
                                                <Image source={{ uri: item.medicine.photo }} style={styles.scheduleImage} />
                                            ) : (
                                                <Text style={styles.scheduleIcon}>💊</Text>
                                            )}
                                            <View>
                                                <Text style={styles.scheduleName}>{item.medicine.name}</Text>
                                                <Text style={styles.scheduleTime}>
                                                    {item.schedule.time} • {item.medicine.instructions}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                            <Text style={styles.statusText}>
                                                {item.status === 'pending' ? '⏳' : item.status === 'taken' ? '✓' : '✗'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Reminder Modal */}
            <ReminderModal
                visible={showReminder}
                medicine={currentMed?.medicine || null}
                onTakeNow={handleTakeMedicine}
                onSnooze={handleSnoozeMedicine}
                onNotWell={handleNotWell}
                onDismiss={() => setShowReminder(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        flex: 1,
        textAlign: 'center',
        marginTop: 100,
        fontSize: 18,
        color: '#6B7280',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    progressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    progressRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        borderWidth: 4,
        borderColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    progressNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    progressLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    progressInfo: {
        flex: 1,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    adherenceText: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '500',
    },
    alertCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#92400E',
    },
    medicineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    medicineIcon: {
        fontSize: 48,
        marginRight: 16,
    },
    medicineImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 16,
    },
    medicineInfo: {
        flex: 1,
    },
    medicineName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    medicineDosage: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 4,
    },
    medicineInstructions: {
        fontSize: 14,
        color: '#92400E',
    },
    takeButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    takeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    nextCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#3B82F6',
        alignItems: 'center',
    },
    nextLabel: {
        fontSize: 14,
        color: '#1E40AF',
        marginBottom: 4,
    },
    nextName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    nextTime: {
        fontSize: 16,
        color: '#3B82F6',
    },
    scheduleSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    mealGroup: {
        marginBottom: 20,
    },
    mealTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    scheduleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scheduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    scheduleIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    scheduleImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
    },
    scheduleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    scheduleTime: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
