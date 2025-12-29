import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import dbManager from '../database/DatabaseManager';
import patternDetector from '../services/PatternDetector';
import theme from '../styles/theme';
import { getRiskColor, formatPhoneNumber } from '../utils/helpers';

const CaregiverDashboardScreen = ({ route, navigation }) => {
    const { caregiverId } = route.params;

    const [patients, setPatients] = useState([]);
    const [patientRisks, setPatientRisks] = useState({});
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const patientList = await dbManager.getCaregiverPatients(caregiverId);
            setPatients(patientList);

            // Analyze risk for each patient
            const risks = {};
            for (const patient of patientList) {
                const riskAssessment = await patternDetector.analyzePatient(patient.id);
                risks[patient.id] = riskAssessment;
            }
            setPatientRisks(risks);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPatients();
        setRefreshing(false);
    };

    const renderPatientCard = ({ item: patient }) => {
        const risk = patientRisks[patient.id];
        const riskColor = risk ? getRiskColor(risk.riskLevel) : theme.colors.textLight;

        return (
            <TouchableOpacity
                style={[styles.patientCard, { borderLeftColor: riskColor }]}
                onPress={() => navigation.navigate('PatientDetail', { patientId: patient.id })}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        {patient.phone && (
                            <Text style={styles.patientPhone}>
                                📞 {formatPhoneNumber(patient.phone)}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                        <Text style={styles.riskText}>
                            {risk?.riskLevel.toUpperCase() || 'N/A'}
                        </Text>
                    </View>
                </View>

                {risk && risk.alerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                        <Text style={styles.alertsTitle}>⚠️ Alerts:</Text>
                        {risk.alerts.slice(0, 2).map((alert, index) => (
                            <Text key={index} style={styles.alertText}>
                                • {alert.message}
                            </Text>
                        ))}
                        {risk.alerts.length > 2 && (
                            <Text style={styles.moreAlerts}>
                                +{risk.alerts.length - 2} more
                            </Text>
                        )}
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <Text style={styles.relationship}>
                        {patient.relationship || 'Patient'}
                    </Text>
                    <Text style={styles.viewDetails}>View Details →</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Patients</Text>
                <Text style={styles.subtitle}>{patients.length} patients</Text>
            </View>

            <FlatList
                data={patients}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPatientCard}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>👥</Text>
                        <Text style={styles.emptyText}>No patients yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    header: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.backgroundSecondary
    },
    title: {
        fontSize: theme.typography.fontSize3XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    subtitle: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    listContent: {
        padding: theme.spacing.lg
    },
    patientCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 6,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md
    },
    patientName: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    patientPhone: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    riskBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md
    },
    riskText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeSM,
        fontWeight: theme.typography.fontWeightBold
    },
    alertsContainer: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md
    },
    alertsTitle: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs
    },
    alertText: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    moreAlerts: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeightSemiBold,
        marginTop: theme.spacing.xs
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    relationship: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary
    },
    viewDetails: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.primary,
        fontWeight: theme.typography.fontWeightSemiBold
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.xxxl
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: theme.spacing.md
    },
    emptyText: {
        fontSize: theme.typography.fontSizeXL,
        color: theme.colors.textSecondary
    }
});

export default CaregiverDashboardScreen;
