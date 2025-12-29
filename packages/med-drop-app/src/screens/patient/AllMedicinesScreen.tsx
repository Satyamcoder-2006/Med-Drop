import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../services/DatabaseService';
import { Patient, Medicine } from '../../types';

export default function AllMedicinesScreen() {
    const { userId } = useAuth();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        try {
            const meds = await database.getMedicinesByPatient(userId);
            setMedicines(meds);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load medicines:', error);
            setLoading(false);
        }
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
                <Text style={styles.headerTitle}>🏥 All Medicines</Text>
                <Text style={styles.subtitle}>{medicines.length} active medicines</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {medicines.map((medicine, index) => (
                    <View key={medicine.id} style={styles.medicineCard}>
                        <View style={styles.medicineHeader}>
                            {medicine.photo ? (
                                <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                            ) : (
                                <Text style={styles.medicineIcon}>💊</Text>
                            )}
                            <View style={styles.medicineInfo}>
                                <Text style={styles.medicineName}>{medicine.name}</Text>
                                <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                                <Text style={styles.medicineShape}>
                                    {medicine.color}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.scheduleSection}>
                            <Text style={styles.scheduleTitle}>Schedule:</Text>
                            {medicine.schedule.map((sched, idx) => (
                                <View key={idx} style={styles.scheduleItem}>
                                    <Text style={styles.scheduleText}>
                                        {getMealIcon(sched.timeOfDay)} {sched.time} - {sched.timeOfDay}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {medicine.instructions && (
                            <View style={styles.instructionsSection}>
                                <Text style={styles.instructionsLabel}>Instructions:</Text>
                                <Text style={styles.instructionsText}>{medicine.instructions}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    medicineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    medicineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    medicineIcon: {
        fontSize: 48,
        marginRight: 16,
    },
    medicineImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 16,
    },
    medicineInfo: {
        flex: 1,
    },
    medicineName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    medicineDosage: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 2,
    },
    medicineShape: {
        fontSize: 14,
        color: '#9CA3AF',
        textTransform: 'capitalize',
    },
    scheduleSection: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    scheduleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    scheduleItem: {
        marginBottom: 4,
    },
    scheduleText: {
        fontSize: 14,
        color: '#6B7280',
    },
    instructionsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    instructionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    instructionsText: {
        fontSize: 14,
        color: '#6B7280',
        fontStyle: 'italic',
    },
});
