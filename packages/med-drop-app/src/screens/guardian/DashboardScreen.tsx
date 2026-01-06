import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../services/DatabaseService';
import { FirestoreService } from '../../services/FirestoreService';
import { Patient, Alert as AlertType } from '../../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
    const { userName, userId } = useAuth();
    const navigation = useNavigation();
    const [patients, setPatients] = useState<(Patient & {
        riskLevel: 'low' | 'medium' | 'high';
        adherenceRate: number;
        consecutiveMisses: number;
        medicinesCount: number;
        dailyStats: { taken: number; missed: number; pending: number; total: number; lastTakenTime?: string }
    })[]>([]);
    const [alerts, setAlerts] = useState<AlertType[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
            const interval = setInterval(loadData, 30000); // More frequent update for live feel
            return () => clearInterval(interval);
        }, [userId])
    );

    const loadData = async () => {
        try {
            // Fetch patients linked to this guardian directly
            const myPatients = await FirestoreService.getPatientsByGuardian(userId);

            // Enrich patient data in parallel
            const enrichedPatients = await Promise.all(myPatients.map(async (p) => {
                // Run these 4 checks in parallel for each patient
                const [risk, rate, meds, dailyStats] = await Promise.all([
                    FirestoreService.getRiskLevel(p.id),
                    FirestoreService.getAdherenceRate(p.id),
                    FirestoreService.getMedicines(p.id),
                    FirestoreService.getDailyAdherenceStats(p.id)
                ]);

                return {
                    ...p,
                    riskLevel: risk.level,
                    consecutiveMisses: risk.misses,
                    adherenceRate: rate,
                    medicinesCount: meds.length,
                    dailyStats: dailyStats
                };
            }));

            // Fetch persisted alerts and process missed doses in parallel
            const allAlerts = (await FirestoreService.getAlertsByGuardian(userId)) as any[];

            // Generate or Resolve alerts for missed doses today in Firestore
            // We can do this in background without waiting
            Promise.all(enrichedPatients.map(async (p) => {
                const todayStr = new Date().toDateString();
                const alertId = `missed_${p.id}_${todayStr.replace(/\s/g, '_')}`;

                if (p.dailyStats.missed > 0) {
                    await FirestoreService.saveAlert({
                        id: alertId,
                        patientId: p.id,
                        guardianId: userId,
                        type: 'urgent',
                        title: 'Missed Dose Alert',
                        message: `${p.name} missed ${p.dailyStats.missed} dose(s) today!`,
                        actionTaken: false,
                        createdAt: new Date(),
                    });
                } else {
                    const existingAlert = allAlerts.find(a => a.id === alertId);
                    if (existingAlert && !existingAlert.actionTaken) {
                        await FirestoreService.resolveAlert(alertId);
                    }
                }
            })).then(async () => {
                // Update alerts state after background processing
                const updatedAlerts = await FirestoreService.getAlertsByGuardian(userId);
                setAlerts(updatedAlerts as any);
            });

            setPatients(enrichedPatients);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load data:', error);
            setLoading(false);
        }
    };

    const handleNudge = async (patientName: string) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Nudge Sent', `A reminder notification has been sent to ${patientName}.`);
        // Logic to trigger real notification could go here
    };

    const handleResolveAlert = async (alertId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await FirestoreService.resolveAlert(alertId);
            // Optimistic update
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, actionTaken: true } : a));
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high':
            case 'urgent': return '#EF4444';
            case 'medium':
            case 'important': return '#F59E0B';
            case 'low':
            case 'info': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    };

    const highRiskCount = patients.filter(p => p.riskLevel === 'high').length;
    const mediumRiskCount = patients.filter(p => p.riskLevel === 'medium').length;
    const unacknowledgedAlerts = alerts.filter(a => !a.actionTaken).length;

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
                <Text style={styles.headerTitle}>👨‍⚕️ Guardian Dashboard</Text>
                <Text style={styles.subtitle}>Welcome, {userName}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={styles.statNumber}>{highRiskCount}</Text>
                        <Text style={styles.statLabel}>High Risk</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={styles.statNumber}>{mediumRiskCount}</Text>
                        <Text style={styles.statLabel}>Medium Risk</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.statNumber}>{patients.length}</Text>
                        <Text style={styles.statLabel}>Total Patients</Text>
                    </View>
                </View>

                {/* Alerts Section */}
                {unacknowledgedAlerts > 0 && (
                    <View style={styles.alertsSection}>
                        <Text style={styles.sectionTitle}>⚠️ Active Alerts ({unacknowledgedAlerts})</Text>
                        {alerts.filter(a => !a.actionTaken).map(alert => {
                            const patient = patients.find(p => p.id === alert.patientId);
                            return (
                                <View key={alert.id} style={styles.alertCard}>
                                    <View style={styles.alertHeader}>
                                        <View style={styles.alertHeaderLeft}>
                                            <Text style={styles.alertPatient}>{patient?.name || 'Unknown'}</Text>
                                            <View style={[styles.severityBadge, { backgroundColor: getRiskColor(alert.type) }]}>
                                                <Text style={styles.severityText}>{alert.type.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.resolveButton}
                                            onPress={() => handleResolveAlert(alert.id)}
                                        >
                                            <Text style={styles.resolveButtonIcon}>✅</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.alertMessage}>{alert.message}</Text>
                                    <Text style={styles.alertTime}>
                                        {new Date(alert.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Patient List */}
                <View style={styles.patientsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>👥 Patients</Text>
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => (navigation as any).navigate('LinkPatient')}
                        >
                            <Text style={styles.linkButtonText}>+ Link New</Text>
                        </TouchableOpacity>
                    </View>
                    {patients.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No patients linked yet.</Text>
                            <Text style={styles.emptySubtext}>Tap "+ Link New" to connect with a patient.</Text>
                        </View>
                    ) : (
                        patients.map(patient => (
                            <TouchableOpacity
                                key={patient.id}
                                style={styles.patientCard}
                                onPress={() => {
                                    (navigation as any).navigate('PatientDetail', { patient });
                                }}
                            >
                                <View style={styles.patientHeader}>
                                    <View style={styles.patientInfo}>
                                        <Text style={styles.patientName}>
                                            {getRiskIcon(patient.riskLevel)} {patient.name}
                                        </Text>
                                        <Text style={styles.patientAge}>{patient.age} years old</Text>
                                    </View>
                                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(patient.riskLevel) }]}>
                                        <Text style={styles.riskText}>{patient.riskLevel.toUpperCase()}</Text>
                                    </View>
                                </View>

                                <View style={styles.patientStats}>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: '#10B981' }]}>{patient.dailyStats.taken}</Text>
                                        <Text style={styles.statText}>Taken Today</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: patient.dailyStats.missed > 0 ? '#EF4444' : '#1F2937' }]}>
                                            {patient.dailyStats.missed}
                                        </Text>
                                        <Text style={styles.statText}>Missed Today</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{patient.dailyStats.pending}</Text>
                                        <Text style={styles.statText}>Remaining</Text>
                                    </View>
                                </View>

                                <View style={styles.patientFooter}>
                                    <View style={styles.footerLeft}>
                                        <Text style={styles.lastActivity}>
                                            Weekly Adherence: {Math.round(patient.adherenceRate * 100)}%
                                        </Text>
                                        {patient.dailyStats.lastTakenTime && (
                                            <Text style={styles.lastTakenLabel}>
                                                Last Taken: {patient.dailyStats.lastTakenTime}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.nudgeButton}
                                        onPress={() => handleNudge(patient.name)}
                                    >
                                        <Text style={styles.nudgeButtonText}>🔔 Nudge</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )))}
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
    alertsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    alertCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertPatient: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    resolveButton: {
        backgroundColor: '#FFFFFF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    resolveButtonIcon: {
        fontSize: 16,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    severityText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    alertMessage: {
        fontSize: 14,
        color: '#92400E',
        marginBottom: 4,
    },
    alertTime: {
        fontSize: 12,
        color: '#78350F',
    },
    patientsSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    linkButton: {
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    linkButtonText: {
        color: '#8B5CF6',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
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
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    patientAge: {
        fontSize: 14,
        color: '#6B7280',
    },
    riskBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    riskText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    patientStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    statText: {
        fontSize: 12,
        color: '#6B7280',
    },
    lastActivity: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    footerLeft: {
        flex: 1,
    },
    lastTakenLabel: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 2,
    },
    patientFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    nudgeButton: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    nudgeButtonText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600',
    },
});
