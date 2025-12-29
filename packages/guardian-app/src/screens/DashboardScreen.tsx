import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen({ navigation }: any) {
    const patients = [
        {
            id: 'p1',
            name: 'Ram Kumar',
            status: 'good',
            adherence: 95,
            lastUpdate: '10 mins ago',
            nextDose: 'BP Medicine at 2:00 PM',
            alerts: 0,
        },
        {
            id: 'p2',
            name: 'Lakshmi Devi',
            status: 'warning',
            adherence: 82,
            lastUpdate: '1 hour ago',
            nextDose: 'Diabetes Pill at 1:00 PM',
            alerts: 1,
        }
    ];

    const alerts = [
        {
            id: 'a1',
            type: 'warning',
            message: 'Lakshmi Devi missed morning dose',
            time: '2 hours ago',
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Family</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Alerts</Text>
                        {alerts.map(alert => (
                            <View key={alert.id} style={styles.alertCard}>
                                <Text style={styles.alertIcon}>⚠️</Text>
                                <View style={styles.alertInfo}>
                                    <Text style={styles.alertMsg}>{alert.message}</Text>
                                    <Text style={styles.alertTime}>{alert.time}</Text>
                                </View>
                                <TouchableOpacity style={styles.callBtn}>
                                    <Text style={styles.callBtnText}>📞</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Patients List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monitoring</Text>
                    {patients.map(patient => (
                        <TouchableOpacity
                            key={patient.id}
                            style={[styles.patientCard, { borderLeftColor: patient.status === 'good' ? '#10B981' : '#F59E0B' }]}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.patientName}>{patient.name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: patient.status === 'good' ? '#D1FAE5' : '#FEF3C7' }]}>
                                    <Text style={[styles.statusText, { color: patient.status === 'good' ? '#065F46' : '#92400E' }]}>
                                        {patient.status === 'good' ? 'On Track' : 'Needs Attention'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View>
                                    <Text style={styles.statLabel}>Adherence</Text>
                                    <Text style={styles.statValue}>{patient.adherence}%</Text>
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Last Active</Text>
                                    <Text style={styles.statValue}>{patient.lastUpdate}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.nextDose}>
                                <Text style={styles.nextDoseLabel}>Up Next</Text>
                                <Text style={styles.nextDoseValue}>{patient.nextDose}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
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
        padding: 24,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#059669',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 12,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    alertIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    alertInfo: {
        flex: 1,
    },
    alertMsg: {
        color: '#991B1B',
        fontWeight: '600',
        fontSize: 15,
    },
    alertTime: {
        color: '#B91C1C',
        fontSize: 12,
        marginTop: 2,
    },
    callBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    callBtnText: {
        fontSize: 18,
    },
    patientCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    patientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginBottom: 12,
    },
    nextDose: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextDoseLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginRight: 8,
    },
    nextDoseValue: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '500',
    },
});
