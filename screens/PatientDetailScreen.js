import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Dimensions
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import dbManager from '../database/DatabaseManager';
import patternDetector from '../services/PatternDetector';
import theme from '../styles/theme';
import { formatDate, getRiskColor } from '../utils/helpers';

const PatientDetailScreen = ({ route, navigation }) => {
    const { patientId } = route.params;

    const [patient, setPatient] = useState(null);
    const [riskAssessment, setRiskAssessment] = useState(null);
    const [adherenceStats, setAdherenceStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [interventions, setInterventions] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const patientData = await dbManager.getPatient(patientId);
            setPatient(patientData);

            const risk = await patternDetector.analyzePatient(patientId);
            setRiskAssessment(risk);

            const stats = await patternDetector.getAdherenceStats(patientId, 30);
            setAdherenceStats(stats);

            const interventionList = await dbManager.getPatientInterventions(patientId);
            setInterventions(interventionList);

            // Prepare chart data (last 7 days)
            const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            const logs = await dbManager.getAdherenceLogs(patientId, sevenDaysAgo, Math.floor(Date.now() / 1000));

            // Group by day
            const dayData = {};
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                dayData[dateStr] = { total: 0, taken: 0 };
            }

            logs.forEach(log => {
                const dateStr = new Date(log.scheduled_time * 1000).toISOString().split('T')[0];
                if (dayData[dateStr]) {
                    dayData[dateStr].total++;
                    if (log.status === 'taken') {
                        dayData[dateStr].taken++;
                    }
                }
            });

            const labels = Object.keys(dayData).map(d => d.split('-')[2]);
            const data = Object.values(dayData).map(d =>
                d.total > 0 ? (d.taken / d.total) * 100 : 0
            );

            setChartData({
                labels,
                datasets: [{ data }]
            });
        } catch (error) {
            console.error('Error loading patient detail:', error);
        }
    };

    if (!patient) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const riskColor = riskAssessment ? getRiskColor(riskAssessment.riskLevel) : theme.colors.textLight;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Patient Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        {patient.phone && (
                            <Text style={styles.patientPhone}>📞 {patient.phone}</Text>
                        )}
                    </View>

                    <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                        <Text style={styles.riskText}>
                            {riskAssessment?.riskLevel.toUpperCase() || 'N/A'}
                        </Text>
                    </View>
                </View>

                {/* Adherence Stats */}
                {adherenceStats && (
                    <View style={styles.statsCard}>
                        <Text style={styles.cardTitle}>30-Day Adherence</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{adherenceStats.taken}</Text>
                                <Text style={styles.statLabel}>Taken</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{adherenceStats.missed}</Text>
                                <Text style={styles.statLabel}>Missed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {Math.round(adherenceStats.adherenceRate)}%
                                </Text>
                                <Text style={styles.statLabel}>Rate</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Adherence Chart */}
                {chartData && (
                    <View style={styles.chartCard}>
                        <Text style={styles.cardTitle}>7-Day Trend</Text>
                        <LineChart
                            data={chartData}
                            width={Dimensions.get('window').width - 48}
                            height={220}
                            chartConfig={{
                                backgroundColor: theme.colors.background,
                                backgroundGradientFrom: theme.colors.backgroundSecondary,
                                backgroundGradientTo: theme.colors.backgroundSecondary,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                    borderRadius: theme.borderRadius.lg
                                },
                                propsForDots: {
                                    r: '6',
                                    strokeWidth: '2',
                                    stroke: theme.colors.primary
                                }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                )}

                {/* Risk Alerts */}
                {riskAssessment && riskAssessment.alerts.length > 0 && (
                    <View style={styles.alertsCard}>
                        <Text style={styles.cardTitle}>⚠️ Risk Alerts</Text>
                        {riskAssessment.alerts.map((alert, index) => (
                            <View key={index} style={styles.alertItem}>
                                <Text style={styles.alertMessage}>{alert.message}</Text>
                                <Text style={styles.alertDetails}>{alert.details}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recent Interventions */}
                <View style={styles.interventionsCard}>
                    <Text style={styles.cardTitle}>Recent Interventions</Text>
                    {interventions.length > 0 ? (
                        interventions.map((intervention) => (
                            <View key={intervention.id} style={styles.interventionItem}>
                                <Text style={styles.interventionType}>
                                    {intervention.intervention_type.toUpperCase()}
                                </Text>
                                <Text style={styles.interventionDate}>
                                    {formatDate(intervention.created_at)}
                                </Text>
                                <Text style={styles.interventionNotes}>{intervention.notes}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No interventions yet</Text>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsCard}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonIcon}>📞</Text>
                            <Text style={styles.actionButtonText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonIcon}>💬</Text>
                            <Text style={styles.actionButtonText}>SMS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonIcon}>📝</Text>
                            <Text style={styles.actionButtonText}>Log</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: theme.typography.fontSizeXL,
        color: theme.colors.textSecondary
    },
    content: {
        padding: theme.spacing.lg
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg
    },
    patientName: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    patientPhone: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    riskBadge: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg
    },
    riskText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightBold
    },
    statsCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md
    },
    cardTitle: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    statItem: {
        alignItems: 'center'
    },
    statValue: {
        fontSize: theme.typography.fontSize3XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.primary
    },
    statLabel: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    chartCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md
    },
    chart: {
        marginVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg
    },
    alertsCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md
    },
    alertItem: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm
    },
    alertMessage: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs
    },
    alertDetails: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary
    },
    interventionsCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md
    },
    interventionItem: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        paddingLeft: theme.spacing.md,
        marginBottom: theme.spacing.md
    },
    interventionType: {
        fontSize: theme.typography.fontSizeSM,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.primary
    },
    interventionDate: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    interventionNotes: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.text,
        marginTop: theme.spacing.xs
    },
    emptyText: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.lg
    },
    actionsCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        minHeight: theme.minTapTarget
    },
    actionButtonIcon: {
        fontSize: 32,
        marginBottom: theme.spacing.xs
    },
    actionButtonText: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    }
});

export default PatientDetailScreen;
