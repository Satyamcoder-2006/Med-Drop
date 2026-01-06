import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../services/DatabaseService';
import { FirestoreService } from '../../services/FirestoreService';
import { Patient, Medicine } from '../../types';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
    const { userName } = useAuth();
    const navigation = useNavigation();
    const [patients, setPatients] = useState<(Patient & { medicines: Medicine[] })[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            // Fetch patients from Firestore
            const patientsData = await FirestoreService.getAllPatients();

            // Enrich patients with their medicines from Firestore
            const enrichedPatients = await Promise.all(patientsData.map(async (p) => {
                const meds = await FirestoreService.getMedicines(p.id);
                return { ...p, medicines: meds };
            }));

            setPatients(enrichedPatients);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load data:', error);
            setLoading(false);
        }
    };

    const handleDeletePatient = async (id: string, name: string) => {
        Alert.alert(
            'Delete Patient',
            `Are you sure you want to delete ${name}? All their medicines and logs will be removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await database.deletePatient(id);
                        loadData();
                    }
                }
            ]
        );
    };

    const handleDeleteMedicine = async (id: string, name: string) => {
        Alert.alert(
            'Delete Medicine',
            `Are you sure you want to delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await database.deleteMedicine(id);
                        loadData();
                    }
                }
            ]
        );
    };

    const totalPrescriptions = patients.reduce((sum, p) => sum + p.medicines.length, 0);
    const activePrescriptions = patients.filter(p => p.medicines.length > 0).length;

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
                <Text style={styles.headerTitle}>💊 Pharmacy Dashboard</Text>
                <Text style={styles.subtitle}>Welcome, {userName}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={styles.statNumber}>{patients.length}</Text>
                        <Text style={styles.statLabel}>Registered Patients</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.statNumber}>{totalPrescriptions}</Text>
                        <Text style={styles.statLabel}>Total Prescriptions</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={styles.statNumber}>{activePrescriptions}</Text>
                        <Text style={styles.statLabel}>Active Today</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                        onPress={() => {
                            (navigation as any).navigate('Register');
                        }}
                    >
                        <Text style={styles.actionIcon}>➕</Text>
                        <Text style={styles.actionText}>Register New Patient</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                        onPress={() => {
                            (navigation as any).navigate('AddMedicine');
                        }}
                    >
                        <Text style={styles.actionIcon}>💊</Text>
                        <Text style={styles.actionText}>Add Medicine to Patient</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                        onPress={() => {
                            // Navigate to scan prescription
                            console.log('Scan prescription');
                        }}
                    >
                        <Text style={styles.actionIcon}>📸</Text>
                        <Text style={styles.actionText}>Scan Prescription</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Patients */}
                <View style={styles.patientsSection}>
                    <Text style={styles.sectionTitle}>👥 Recent Patients</Text>
                    {patients.map(patient => (
                        <View key={patient.id} style={styles.patientCard}>
                            <View style={styles.patientHeader}>
                                <View>
                                    <Text style={styles.patientName}>{patient.name}</Text>
                                    <Text style={styles.patientPhone}>{patient.phone}</Text>
                                </View>
                                <View style={styles.patientActions}>
                                    <TouchableOpacity
                                        style={styles.actionIconBtn}
                                        onPress={() => (navigation as any).navigate('Register', { patient })}
                                    >
                                        <Text style={styles.iconBtnText}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionIconBtn}
                                        onPress={() => handleDeletePatient(patient.id, patient.name)}
                                    >
                                        <Text style={styles.iconBtnText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.medicineCount}>
                                    <Text style={styles.countNumber}>{patient.medicines.length}</Text>
                                    <Text style={styles.countLabel}>medicines</Text>
                                </View>
                            </View>

                            <View style={styles.medicineList}>
                                {patient.medicines.slice(0, 3).map((medicine, idx) => (
                                    <View key={idx} style={styles.medicineItem}>
                                        <View style={styles.medicineMain}>
                                            {medicine.photo ? (
                                                <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                                            ) : (
                                                <Text style={styles.medicineIcon}>💊</Text>
                                            )}
                                            <View>
                                                <Text style={styles.medicineName}>{medicine.name}</Text>
                                                <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.medicineActions}>
                                            <TouchableOpacity
                                                style={styles.medicineEditBtn}
                                                onPress={() => (navigation as any).navigate('AddMedicine', { medicine: medicine, patient: patient })}
                                            >
                                                <Text style={styles.editIconText}>✏️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.medicineDeleteBtn}
                                                onPress={() => handleDeleteMedicine(medicine.id, medicine.name)}
                                            >
                                                <Text style={styles.deleteIconText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                {patient.medicines.length > 3 && (
                                    <Text style={styles.moreText}>
                                        +{patient.medicines.length - 3} more
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
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
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    actionsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    actionIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    patientsSection: {
        marginBottom: 20,
    },
    patientCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    patientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    patientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    patientPhone: {
        fontSize: 14,
        color: '#6B7280',
    },
    medicineCount: {
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    patientActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionIconBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    iconBtnText: {
        fontSize: 16,
    },
    countNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    countLabel: {
        fontSize: 10,
        color: '#1E40AF',
    },
    medicineList: {
        gap: 8,
    },
    medicineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 8,
    },
    medicineMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    medicineActions: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    medicineEditBtn: {
        padding: 4,
    },
    editIconText: {
        fontSize: 14,
    },
    medicineIcon: {
        fontSize: 20,
    },
    medicineImage: {
        width: 24,
        height: 24,
        borderRadius: 4,
    },
    medicineName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    medicineDosage: {
        fontSize: 12,
        color: '#6B7280',
    },
    medicineDeleteBtn: {
        padding: 4,
    },
    deleteIconText: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: 'bold',
    },
    moreText: {
        fontSize: 12,
        color: '#3B82F6',
        fontStyle: 'italic',
        marginTop: 4,
    },
});
