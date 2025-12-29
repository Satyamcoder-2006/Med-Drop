import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    FlatList
} from 'react-native';
import dbManager from '../database/DatabaseManager';
import theme from '../styles/theme';
import { formatDate, formatTime } from '../utils/helpers';

const FamilyProxyScreen = ({ route, navigation }) => {
    const { patientId } = route.params;

    const [patient, setPatient] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const patientData = await dbManager.getPatient(patientId);
            setPatient(patientData);

            const medicineList = await dbManager.getPatientMedicines(patientId);
            setMedicines(medicineList);

            const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            const logs = await dbManager.getAdherenceLogs(
                patientId,
                sevenDaysAgo,
                Math.floor(Date.now() / 1000)
            );
            setRecentLogs(logs);
        } catch (error) {
            console.error('Error loading family proxy data:', error);
        }
    };

    const handleReturnToPatientView = () => {
        navigation.goBack();
    };

    const renderMedicineItem = ({ item }) => (
        <View style={styles.medicineItem}>
            <View style={[styles.colorIndicator, { backgroundColor: getColorValue(item.color) }]} />
            <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{item.name}</Text>
                <Text style={styles.medicineSchedule}>
                    {item.time_slot} - {item.scheduled_time}
                </Text>
                <Text style={styles.medicineDuration}>
                    {item.duration_days} days ({formatDate(item.start_date)} to {formatDate(item.end_date)})
                </Text>
            </View>
        </View>
    );

    const renderLogItem = ({ item }) => (
        <View style={styles.logItem}>
            <View style={styles.logHeader}>
                <Text style={styles.logMedicine}>{item.medicine_name}</Text>
                <Text style={[
                    styles.logStatus,
                    { color: getStatusColor(item.status) }
                ]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.logTime}>
                {formatDate(item.scheduled_time)} at {formatTime(item.scheduled_time)}
            </Text>
        </View>
    );

    const getColorValue = (color) => {
        const colorMap = {
            red: theme.colors.medicineRed,
            blue: theme.colors.medicineBlue,
            green: theme.colors.medicineGreen,
            yellow: theme.colors.medicineYellow,
            purple: theme.colors.medicinePurple,
            orange: theme.colors.medicineOrange,
            pink: theme.colors.medicinePink
        };
        return colorMap[color] || theme.colors.primary;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'taken':
                return theme.colors.success;
            case 'missed':
                return theme.colors.warning;
            case 'unwell':
                return theme.colors.danger;
            default:
                return theme.colors.textSecondary;
        }
    };

    if (!patient) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Helper Mode</Text>
                    <Text style={styles.subtitle}>Viewing {patient.name}'s medicines</Text>
                </View>

                <TouchableOpacity
                    style={styles.returnButton}
                    onPress={handleReturnToPatientView}
                >
                    <Text style={styles.returnButtonText}>Return to Patient View</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Patient Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Patient Information</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name:</Text>
                            <Text style={styles.infoValue}>{patient.name}</Text>
                        </View>
                        {patient.phone && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone:</Text>
                                <Text style={styles.infoValue}>{patient.phone}</Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Language:</Text>
                            <Text style={styles.infoValue}>{patient.language_code}</Text>
                        </View>
                        {patient.emergency_contact_name && (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Emergency Contact:</Text>
                                    <Text style={styles.infoValue}>{patient.emergency_contact_name}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Emergency Phone:</Text>
                                    <Text style={styles.infoValue}>{patient.emergency_contact_phone}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Medicine List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Medicines</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => navigation.navigate('AddMedicine', { patientId })}
                        >
                            <Text style={styles.addButtonText}>+ Add Medicine</Text>
                        </TouchableOpacity>
                    </View>

                    {medicines.length > 0 ? (
                        <FlatList
                            data={medicines}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderMedicineItem}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.emptyText}>No medicines added yet</Text>
                    )}
                </View>

                {/* Recent History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent History (7 days)</Text>
                    {recentLogs.length > 0 ? (
                        <FlatList
                            data={recentLogs.slice(0, 10)}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderLogItem}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.emptyText}>No history yet</Text>
                    )}
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
    header: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.textInverse
    },
    subtitle: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textInverse,
        marginTop: theme.spacing.xs
    },
    returnButton: {
        backgroundColor: theme.colors.textInverse,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md
    },
    returnButtonText: {
        color: theme.colors.primary,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    },
    content: {
        padding: theme.spacing.lg
    },
    section: {
        marginBottom: theme.spacing.xl
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md
    },
    sectionTitle: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md
    },
    addButton: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md
    },
    addButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    },
    infoCard: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm
    },
    infoLabel: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.textSecondary,
        width: 150
    },
    infoValue: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.text,
        flex: 1
    },
    medicineItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm
    },
    colorIndicator: {
        width: 8,
        borderRadius: 4,
        marginRight: theme.spacing.md
    },
    medicineInfo: {
        flex: 1
    },
    medicineName: {
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    medicineSchedule: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs
    },
    medicineDuration: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textLight,
        marginTop: theme.spacing.xs
    },
    logItem: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs
    },
    logMedicine: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    logStatus: {
        fontSize: theme.typography.fontSizeSM,
        fontWeight: theme.typography.fontWeightBold
    },
    logTime: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary
    },
    emptyText: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.lg
    }
});

export default FamilyProxyScreen;
