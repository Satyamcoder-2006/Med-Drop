import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { database } from '../../services/DatabaseService';
import { Patient, Medicine, AdherenceLog, SymptomReport, Alert } from '../../types';

export default function PatientDetailScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const initialPatient = (route.params as any)?.patient;
    const [patient, setPatient] = useState<any>(initialPatient);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
    const [adherenceByDay, setAdherenceByDay] = useState<{ date: string; rate: number; hasData: boolean }[]>([]);
    const [symptomReports, setSymptomReports] = useState<SymptomReport[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }, [initialPatient?.id])
    );

    const loadData = async () => {
        if (!initialPatient?.id) return;
        try {
            // Fetch updated patient data to get live stats/risk
            const allPatients = await database.getAllPatients();
            const p = allPatients.find(acc => acc.id === initialPatient.id);
            if (p) {
                const risk = await database.getRiskLevel(p.id);
                const rate = await database.getAdherenceRate(p.id);
                setPatient({ ...p, riskLevel: risk.level, consecutiveMisses: risk.misses, adherenceRate: rate });
            }

            const meds = await database.getMedicinesByPatient(initialPatient.id);
            setMedicines(meds);

            const end = new Date();
            end.setHours(23, 59, 59, 999);
            const start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);

            const logs = await database.getAdherenceLogs(initialPatient.id, start, end);
            setAdherenceLogs(logs);

            // Calculate adherence for last 7 days
            const chartData = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayLogs = logs.filter(log =>
                    new Date(log.scheduledTime).toDateString() === date.toDateString()
                );
                const taken = dayLogs.filter(l => l.status === 'taken').length;
                const total = dayLogs.length;
                return {
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    rate: total > 0 ? taken / total : 0,
                    hasData: total > 0
                };
            }).reverse();
            setAdherenceByDay(chartData);

            const reports = await database.getSymptomReportsByPatient(initialPatient.id);
            setSymptomReports(reports);

            const alertHistory = await database.getAlertsByPatient(initialPatient.id);
            setAlerts(alertHistory);

            setLoading(false);
        } catch (error) {
            console.error('Failed to load patient details:', error);
            setLoading(false);
        }
    };

    if (!initialPatient) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Patient not found</Text>
            </View>
        );
    }

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

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{patient.name}</Text>
                <Text style={styles.subtitle}>{patient.age} years old</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Risk Alert */}
                {patient.riskLevel !== 'low' && (
                    <View style={[styles.alertCard, { backgroundColor: patient.riskLevel === 'high' ? '#FEE2E2' : '#FEF3C7' }]}>
                        <Text style={styles.alertTitle}>⚠️ Adherence Risk Detected</Text>
                        <Text style={styles.alertText}>
                            {patient.consecutiveMisses} consecutive missed doses
                        </Text>
                        <Text style={styles.alertSubtext}>
                            Consider reaching out to check on the patient
                        </Text>
                    </View>
                )}

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text
                            style={styles.statNumber}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {Math.round(patient.adherenceRate * 100)}%
                        </Text>
                        <Text style={styles.statLabel}>Adherence</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text
                            style={styles.statNumber}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {patient.consecutiveMisses}
                        </Text>
                        <Text style={styles.statLabel}>Missed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text
                            style={styles.statNumber}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {medicines.length}
                        </Text>
                        <Text style={styles.statLabel}>Medicines</Text>
                    </View>
                </View>

                {/* 7-Day Adherence Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>7-Day Adherence</Text>
                    <View style={styles.chart}>
                        {adherenceByDay.map((day, index) => (
                            <View key={index} style={styles.chartBar}>
                                <View style={styles.barContainer}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: day.hasData ? `${Math.max(day.rate * 100, 8)}%` : '15%',
                                                backgroundColor: day.hasData
                                                    ? (day.rate > 0.8 ? '#059669' : day.rate > 0.4 ? '#D97706' : '#DC2626')
                                                    : '#F3F4F6',
                                                borderWidth: day.hasData ? 0 : 1,
                                                borderColor: '#E5E7EB',
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.chartLabel}>{day.date}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Medicines List */}
                <View style={styles.medicinesSection}>
                    <Text style={styles.sectionTitle}>Current Medicines</Text>
                    {medicines.map(medicine => (
                        <View key={medicine.id} style={styles.medicineCard}>
                            {medicine.photo ? (
                                <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                            ) : (
                                <Text style={styles.medicineIcon}>💊</Text>
                            )}
                            <View style={styles.medicineInfo}>
                                <Text style={styles.medicineName}>{medicine.name}</Text>
                                <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                                <Text style={styles.medicineSchedule}>
                                    {medicine.schedule.length} dose(s) per day
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Symptom Reports Section */}
                <View style={styles.symptomsSection}>
                    <Text style={styles.sectionTitle}>Recent Symptom Reports</Text>
                    {symptomReports.length > 0 ? (
                        symptomReports.map(report => (
                            <View key={report.id} style={styles.symptomReportCard}>
                                <View style={styles.symptomHeader}>
                                    <View style={styles.symptomList}>
                                        {report.symptoms.map(s => {
                                            const sInfo = {
                                                nausea: '🤢', headache: '🤕', dizziness: '😵',
                                                fatigue: '😴', rash: '🔴', stomach: '😖',
                                                confusion: '🤔', other: '⚠️'
                                            }[s] || '❓';
                                            return (
                                                <View key={s} style={styles.symptomTag}>
                                                    <Text style={styles.symptomTagText}>{sInfo} {s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.reportDate}>
                                        {new Date(report.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                {report.notes && (
                                    <Text style={styles.reportNotes}>"{report.notes}"</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No symptoms reported recently</Text>
                        </View>
                    )}
                </View>

                {/* Alert History Section */}
                {alerts.filter(a => !a.id.startsWith('sym_')).length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>Alert History</Text>
                        {alerts.filter(a => !a.id.startsWith('sym_')).map(alert => (
                            <View key={alert.id} style={[styles.historyCard, alert.actionTaken && styles.resolvedHistoryCard]}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyTitle}>{alert.title}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: alert.actionTaken ? '#D1D5DB' : getRiskColor(alert.type) }]}>
                                        <Text style={styles.statusText}>{alert.actionTaken ? 'RESOLVED' : alert.type.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={styles.historyMessage}>{alert.message}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(alert.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.actionIcon}>📞</Text>
                        <Text style={styles.actionText}>Call Patient</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}>
                        <Text style={styles.actionIcon}>📅</Text>
                        <Text style={styles.actionText}>Schedule Visit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.actionIcon}>📝</Text>
                        <Text style={styles.actionText}>Add Note</Text>
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
    errorText: {
        flex: 1,
        textAlign: 'center',
        marginTop: 100,
        fontSize: 18,
        color: '#EF4444',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginBottom: 12,
    },
    backText: {
        fontSize: 16,
        color: '#3B82F6',
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
    alertCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 8,
    },
    alertText: {
        fontSize: 14,
        color: '#92400E',
        marginBottom: 4,
    },
    alertSubtext: {
        fontSize: 12,
        color: '#78350F',
        fontStyle: 'italic',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12, // Reduced padding
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        minHeight: 85,
    },
    statNumber: {
        fontSize: 24, // Slightly reduced
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    chartSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    chart: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 150,
    },
    chartBar: {
        flex: 1,
        alignItems: 'center',
    },
    barContainer: {
        width: '80%',
        height: 120,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 4,
    },
    chartLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
    },
    medicinesSection: {
        marginBottom: 20,
    },
    medicineCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    medicineIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    medicineImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
    },
    medicineInfo: {
        flex: 1,
    },
    medicineName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    medicineDosage: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    medicineSchedule: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    actionsSection: {
        marginBottom: 20,
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
    symptomsSection: {
        marginBottom: 24,
    },
    symptomReportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    symptomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    symptomList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    symptomTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    symptomTagText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },
    reportDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginLeft: 8,
    },
    reportNotes: {
        fontSize: 14,
        color: '#4B5563',
        fontStyle: 'italic',
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 6,
        marginTop: 4,
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
    },
    emptyStateText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    historySection: {
        marginBottom: 24,
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    resolvedHistoryCard: {
        opacity: 0.7,
        backgroundColor: '#F9FAFB',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    historyMessage: {
        fontSize: 13,
        color: '#4B5563',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
});
