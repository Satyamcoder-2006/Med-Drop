import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Medicine, AdherenceLog } from '../types';
import { database } from '../services/DatabaseService';
import { format, startOfDay, endOfDay } from 'date-fns';

interface AllMedicinesScreenProps {
    patientId: string;
    onBack: () => void;
    onMedicinePress: (medicine: Medicine) => void;
}

export default function AllMedicinesScreen({
    patientId,
    onBack,
    onMedicinePress,
}: AllMedicinesScreenProps) {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
    const [groupBy, setGroupBy] = useState<'time' | 'all'>('time');

    useEffect(() => {
        loadMedicines();
    }, [patientId]);

    const loadMedicines = async () => {
        const meds = await database.getMedicinesByPatient(patientId);
        setMedicines(meds);

        const today = new Date();
        const logs = await database.getAdherenceLogs(
            patientId,
            startOfDay(today),
            endOfDay(today)
        );
        setAdherenceLogs(logs);
    };

    const getMedicineStatus = (medicine: Medicine): 'taken' | 'missed' | 'upcoming' => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        for (const schedule of medicine.schedule) {
            const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);

            // Check if this dose was taken
            const taken = adherenceLogs.some(
                log =>
                    log.medicineId === medicine.id &&
                    log.scheduledTime.getHours() === scheduleHour &&
                    log.scheduledTime.getMinutes() === scheduleMinute &&
                    log.status === 'taken'
            );

            if (taken) return 'taken';

            // Check if this dose is overdue
            const scheduledTime = new Date(now);
            scheduledTime.setHours(scheduleHour, scheduleMinute, 0, 0);

            if (scheduledTime < now) return 'missed';
        }

        return 'upcoming';
    };

    const groupedMedicines = groupBy === 'time'
        ? {
            morning: medicines.filter(m => m.schedule.some(s => s.timeOfDay === 'morning')),
            afternoon: medicines.filter(m => m.schedule.some(s => s.timeOfDay === 'afternoon')),
            evening: medicines.filter(m => m.schedule.some(s => s.timeOfDay === 'evening')),
            night: medicines.filter(m => m.schedule.some(s => s.timeOfDay === 'night')),
        }
        : { all: medicines };

    const renderMedicineCard = (medicine: Medicine) => {
        const status = getMedicineStatus(medicine);
        const statusConfig = {
            taken: { icon: '✓', color: '#10B981', label: 'Taken' },
            missed: { icon: '✗', color: '#EF4444', label: 'Missed' },
            upcoming: { icon: '⏰', color: '#6B7280', label: 'Upcoming' },
        };

        const config = statusConfig[status];

        return (
            <TouchableOpacity
                key={medicine.id}
                style={[styles.medicineCard, { borderLeftColor: medicine.color }]}
                onPress={() => onMedicinePress(medicine)}
                activeOpacity={0.7}
            >
                {medicine.photo && (
                    <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                )}

                <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                    <Text style={styles.medicineSchedule}>
                        {medicine.schedule.map(s => s.time).join(', ')}
                    </Text>

                    {medicine.daysRemaining <= 7 && (
                        <View style={styles.warningBadge}>
                            <Text style={styles.warningText}>
                                ⚠️ {medicine.daysRemaining} days left
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                    <Text style={styles.statusIcon}>{config.icon}</Text>
                    <Text style={styles.statusLabel}>{config.label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All My Medicines</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, groupBy === 'time' && styles.toggleButtonActive]}
                    onPress={() => setGroupBy('time')}
                >
                    <Text style={[styles.toggleText, groupBy === 'time' && styles.toggleTextActive]}>
                        By Time
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, groupBy === 'all' && styles.toggleButtonActive]}
                    onPress={() => setGroupBy('all')}
                >
                    <Text style={[styles.toggleText, groupBy === 'all' && styles.toggleTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {groupBy === 'time' ? (
                    <>
                        {groupedMedicines.morning.length > 0 && (
                            <View style={styles.timeGroup}>
                                <Text style={styles.timeGroupTitle}>🌅 Morning</Text>
                                {groupedMedicines.morning.map(renderMedicineCard)}
                            </View>
                        )}

                        {groupedMedicines.afternoon.length > 0 && (
                            <View style={styles.timeGroup}>
                                <Text style={styles.timeGroupTitle}>☀️ Afternoon</Text>
                                {groupedMedicines.afternoon.map(renderMedicineCard)}
                            </View>
                        )}

                        {groupedMedicines.evening.length > 0 && (
                            <View style={styles.timeGroup}>
                                <Text style={styles.timeGroupTitle}>🌆 Evening</Text>
                                {groupedMedicines.evening.map(renderMedicineCard)}
                            </View>
                        )}

                        {groupedMedicines.night.length > 0 && (
                            <View style={styles.timeGroup}>
                                <Text style={styles.timeGroupTitle}>🌙 Night</Text>
                                {groupedMedicines.night.map(renderMedicineCard)}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.timeGroup}>
                        {medicines.map(renderMedicineCard)}
                    </View>
                )}

                {medicines.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💊</Text>
                        <Text style={styles.emptyTitle}>No Medicines Yet</Text>
                        <Text style={styles.emptyMessage}>
                            Your medicines will appear here once added by the pharmacy
                        </Text>
                    </View>
                )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        fontSize: 28,
        color: '#1F2937',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    placeholder: {
        width: 44,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    toggleButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    content: {
        padding: 16,
    },
    timeGroup: {
        marginBottom: 24,
    },
    timeGroupTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    medicineCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        alignItems: 'center',
    },
    medicineImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    medicineInfo: {
        flex: 1,
    },
    medicineName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    medicineDosage: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    medicineSchedule: {
        fontSize: 14,
        color: '#2563EB',
    },
    warningBadge: {
        marginTop: 8,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    warningText: {
        fontSize: 12,
        color: '#92400E',
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 80,
    },
    statusIcon: {
        fontSize: 20,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
