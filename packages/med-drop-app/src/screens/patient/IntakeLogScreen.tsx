import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../services/DatabaseService';
import { FirestoreService } from '../../services/FirestoreService';
import { Timestamp } from 'firebase/firestore';
import { Patient, AdherenceLog, Medicine } from '../../types';

const { width } = Dimensions.get('window');

const DonutChart = ({ taken, missed, total, size = 80, strokeWidth = 8 }: { taken: number; missed: number; total: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate total actioned doses (taken + missed)
    const actionedTotal = taken + missed;
    const takenPercentage = actionedTotal > 0 ? (taken / actionedTotal) * 100 : 0;
    const takenOffset = circumference - (circumference * takenPercentage) / 100;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    {/* Background Circle (Gray) */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#F3F4F6"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Base Actioned Circle (Red for Missed) */}
                    {actionedTotal > 0 && (
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#EF4444"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                    )}

                    {/* Progress Circle (Green for Taken) */}
                    {taken > 0 && (
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#10B981"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={takenOffset}
                            strokeLinecap="round"
                        />
                    )}
                </G>
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: size * 0.18, fontWeight: 'bold', color: actionedTotal > 0 ? '#1F2937' : '#9CA3AF' }}>
                        {actionedTotal > 0 ? Math.round(takenPercentage) : 0}%
                    </Text>
                </View>
            </Svg>
        </View>
    );
};

export default function IntakeLogScreen() {
    const { userId } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [logs, setLogs] = useState<AdherenceLog[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [adherenceRate, setAdherenceRate] = useState(1);
    const [misses, setMisses] = useState(0);
    const [loading, setLoading] = useState(true);

    const [medStats, setMedStats] = useState<{ [key: string]: { taken: number; missed: number; total: number; name: string } }>({});

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [userId])
    );

    const loadData = async () => {
        try {
            // Fetch User
            const currentPatient = await FirestoreService.getUser(userId);

            if (currentPatient) {
                setPatient(currentPatient);

                // Fetch Logs (All logs for now, or we could filter by date in query)
                // For simplicity, fetching all and filtering locally, or we could add date filters to getLogs
                const allLogs = await FirestoreService.getLogs(userId);

                // Filter for last 30 days
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                const start = new Date();
                start.setDate(start.getDate() - 30);
                start.setHours(0, 0, 0, 0);

                const recentLogs = allLogs.filter(log => {
                    const logDate = new Date(log.scheduledTime); // Firestore timestamps might need conversion if not handled by converter
                    // Note: Firestore returns Timestamps, but we might want to ensure they are Date objects for comparison
                    // If using matching types, it should be fine. E.g. log.scheduledTime.toDate() if it's a Firestore Timestamp
                    // But our type definition says Date. We'll assume the converter handles it or we cast it.
                    // Ideally, we handle Timestamp conversion in the Service.
                    // For now, let's assume standard Date or ISO string if coming from JSON.
                    // If it is a string/number, new Date() handles it. 
                    // If it is a Firestore Timestamp object, it has .toDate().

                    // Safe conversion:
                    const d = log.scheduledTime instanceof Timestamp ? (log.scheduledTime as any).toDate() : new Date(log.scheduledTime);
                    return d >= start && d <= end;
                });

                setLogs(recentLogs.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()));

                // Fetch Medicines
                const meds = await FirestoreService.getMedicines(userId);
                setMedicines(meds);

                // Calculate stats per medicine
                const stats: { [key: string]: { taken: number; missed: number; total: number; name: string } } = {};
                meds.forEach(m => {
                    const medLogs = recentLogs.filter(l => l.medicineId === m.id);
                    const taken = medLogs.filter(l => l.status === 'taken').length;
                    const missed = medLogs.filter(l => l.status === 'missed').length;

                    // Only add if there's at least one log or it's a current medicine
                    stats[m.id] = {
                        name: m.name,
                        taken,
                        missed,
                        total: medLogs.length
                    };
                });
                setMedStats(stats);

                // Calculate Adherence Rate (Taken / Total Actioned)
                const totalActioned = recentLogs.filter(l => l.status === 'taken' || l.status === 'missed').length;
                const totalTaken = recentLogs.filter(l => l.status === 'taken').length;
                const rate = totalActioned > 0 ? totalTaken / totalActioned : 1;
                setAdherenceRate(rate);

                // Calculate Consecutive Misses (Risk)
                // Sort by time desc
                const sortedLogs = [...recentLogs].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
                let consecutiveMisses = 0;
                for (const log of sortedLogs) {
                    if (log.status === 'missed') {
                        consecutiveMisses++;
                    } else if (log.status === 'taken') {
                        break;
                    }
                }
                setMisses(consecutiveMisses);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to load logs:', error);
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'taken': return '#10B981';
            case 'missed': return '#EF4444';
            case 'snoozed': return '#F59E0B';
            case 'unwell': return '#F59E0B';
            case 'confused': return '#8B5CF6';
            case 'wrong-time': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'taken': return '✓';
            case 'missed': return '✗';
            case 'snoozed': return '⏰';
            case 'unwell': return '😵';
            case 'confused': return '🤔';
            case 'wrong-time': return '⏱️';
            default: return '•';
        }
    };

    const toDate = (date: any): Date => {
        if (!date) return new Date();
        if (date instanceof Timestamp) return date.toDate();
        return new Date(date);
    };

    const formatDate = (date: any) => {
        const d = toDate(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (d.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const formatTime = (date: any) => {
        const d = toDate(date);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Group logs by date
    const groupedLogs: { [key: string]: AdherenceLog[] } = {};
    logs.forEach(log => {
        const d = toDate(log.scheduledTime);
        const dateKey = d.toDateString();
        if (!groupedLogs[dateKey]) {
            groupedLogs[dateKey] = [];
        }
        groupedLogs[dateKey].push(log);
    });

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
                <Text style={styles.headerTitle}>📊 Medicine Log</Text>
                <Text style={styles.subtitle}>Your adherence history</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Summary Stats */}
                {patient && (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNumber}>{Math.round(adherenceRate * 100)}%</Text>
                            <Text style={styles.summaryLabel}>Adherence Rate</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNumber}>{misses}</Text>
                            <Text style={styles.summaryLabel}>Consecutive Misses</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNumber}>{logs.length}</Text>
                            <Text style={styles.summaryLabel}>Total Logs</Text>
                        </View>
                    </View>
                )}

                {/* Medicine Breakdown Section */}
                {Object.keys(medStats).length > 0 ? (
                    <View style={styles.breakdownSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Adherence by Medicine (30d)</Text>
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={styles.legendText}>Taken</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                                    <Text style={styles.legendText}>Missed</Text>
                                </View>
                            </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medStatsScroll}>
                            {Object.values(medStats).map((stat, idx) => (
                                <View key={idx} style={styles.medStatCard}>
                                    <DonutChart
                                        taken={stat.taken}
                                        missed={stat.missed}
                                        total={stat.total}
                                        size={70}
                                    />
                                    <Text style={styles.medStatName} numberOfLines={1}>{stat.name}</Text>
                                    <View style={styles.miniStats}>
                                        <Text style={[styles.miniStatText, { color: '#10B981' }]}>✓ {stat.taken}</Text>
                                        <Text style={[styles.miniStatText, { color: '#EF4444' }]}>✗ {stat.missed}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ) : !loading && (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No medicines found to track adherence history.</Text>
                    </View>
                )}

                {/* Grouped Logs */}
                {Object.keys(groupedLogs).map(dateKey => (
                    <View key={dateKey} style={styles.dateGroup}>
                        <Text style={styles.dateHeader}>
                            {formatDate(groupedLogs[dateKey][0].scheduledTime)}
                        </Text>
                        {groupedLogs[dateKey].map(log => (
                            <View key={log.id} style={styles.logCard}>
                                <View style={styles.logHeader}>
                                    <View style={styles.logLeft}>
                                        <Text style={styles.medicineName}>{log.medicineName}</Text>
                                        <Text style={styles.logTime}>
                                            Scheduled: {formatTime(log.scheduledTime)}
                                        </Text>
                                        {log.actualTime && (
                                            <Text style={styles.logTime}>
                                                Taken: {formatTime(log.actualTime)}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.status) }]}>
                                        <Text style={styles.statusIcon}>{getStatusIcon(log.status)}</Text>
                                        <Text style={styles.statusText}>{log.status}</Text>
                                    </View>
                                </View>
                                {log.notes && (
                                    <View style={styles.notesSection}>
                                        <Text style={styles.notesLabel}>Note:</Text>
                                        <Text style={styles.notesText}>{log.notes}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
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
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    },
    dateGroup: {
        marginBottom: 20,
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    logCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    logLeft: {
        flex: 1,
    },
    medicineName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    logTime: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    statusIcon: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    notesSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: '#1F2937',
        fontStyle: 'italic',
    },
    breakdownSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    legend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#6B7280',
    },
    medStatsScroll: {
        flexDirection: 'row',
    },
    medStatCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        alignItems: 'center',
        width: 120,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    medStatName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 8,
        textAlign: 'center',
    },
    miniStats: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    miniStatText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyStateContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
    },
    emptyStateText: {
        color: '#6B7280',
        fontSize: 14,
    },
});
