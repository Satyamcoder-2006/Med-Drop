import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    Linking
} from 'react-native';
import MedicineCard from '../components/MedicineCard';
import SymptomCapture from '../components/SymptomCapture';
import dbManager from '../database/DatabaseManager';
import voiceManager from '../services/VoiceManager';
import notificationManager from '../services/NotificationManager';
import syncManager from '../services/SyncManager';
import theme from '../styles/theme';
import { getGreeting } from '../utils/helpers';

const PatientHomeScreen = ({ route, navigation }) => {
    const { patientId } = route.params;

    const [patient, setPatient] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [symptomModalVisible, setSymptomModalVisible] = useState(false);
    const [selectedMedicineForSymptom, setSelectedMedicineForSymptom] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);

    useEffect(() => {
        loadData();
        setupNotifications();

        // Update sync status every 30 seconds
        const syncInterval = setInterval(() => {
            setSyncStatus(syncManager.getSyncStatus());
        }, 30000);

        return () => clearInterval(syncInterval);
    }, []);

    const loadData = async () => {
        try {
            // Load patient data
            const patientData = await dbManager.getPatient(patientId);
            setPatient(patientData);

            // Set voice language
            voiceManager.setLanguage(patientData.language_code);

            // Load today's medicines
            const todaysMedicines = await dbManager.getTodaysMedicines(patientId);
            setMedicines(todaysMedicines);

            // Load streak
            const currentStreak = await dbManager.getAdherenceStreak(patientId);
            setStreak(currentStreak);

            // Get sync status
            setSyncStatus(syncManager.getSyncStatus());

            setLoading(false);

            // Welcome voice prompt
            const greeting = getGreeting(patientData.language_code);
            await voiceManager.speak(greeting);
        } catch (error) {
            console.error('Error loading data:', error);
            setLoading(false);
        }
    };

    const setupNotifications = async () => {
        await notificationManager.requestPermissions();
        await notificationManager.scheduleAllMedicineReminders(patientId);
    };

    const handleMedicineTaken = async (medicine) => {
        try {
            // Log adherence
            const logId = await dbManager.logAdherence({
                medicineId: medicine.id,
                patientId: patientId,
                scheduledTime: Math.floor(Date.now() / 1000),
                actualTime: Math.floor(Date.now() / 1000),
                status: 'taken'
            });

            // Queue for sync
            await syncManager.queueSync('adherence_logs', logId, 'insert', {
                medicine_id: medicine.id,
                patient_id: patientId,
                status: 'taken'
            });

            // Play encouragement
            await voiceManager.speak('बहुत अच्छा! / Very good!');

            // Reload data to update streak
            await loadData();

            Alert.alert('✓', 'Medicine logged successfully!', [{ text: 'OK' }]);
        } catch (error) {
            console.error('Error logging medicine:', error);
            Alert.alert('Error', 'Failed to log medicine');
        }
    };

    const handleMedicineMissed = async (medicine) => {
        try {
            const logId = await dbManager.logAdherence({
                medicineId: medicine.id,
                patientId: patientId,
                scheduledTime: Math.floor(Date.now() / 1000),
                status: 'missed'
            });

            await syncManager.queueSync('adherence_logs', logId, 'insert', {
                medicine_id: medicine.id,
                patient_id: patientId,
                status: 'missed'
            });

            // Schedule follow-up reminder
            await notificationManager.scheduleFollowUpReminder(medicine, patient.language_code);

            await loadData();
            Alert.alert('Missed', 'We\'ll remind you again soon', [{ text: 'OK' }]);
        } catch (error) {
            console.error('Error logging missed medicine:', error);
        }
    };

    const handleMedicineUnwell = async (medicine) => {
        setSelectedMedicineForSymptom(medicine);
        setSymptomModalVisible(true);
    };

    const handleSymptomSubmit = async (symptomData) => {
        try {
            // Log as unwell
            const logId = await dbManager.logAdherence({
                medicineId: selectedMedicineForSymptom.id,
                patientId: patientId,
                scheduledTime: Math.floor(Date.now() / 1000),
                status: 'unwell',
                notes: 'Reported symptoms'
            });

            // Log symptoms
            for (const symptomType of symptomData.symptoms) {
                await dbManager.logSymptom({
                    adherenceLogId: logId,
                    patientId: patientId,
                    symptomType: symptomType,
                    audioUri: symptomData.audioUri
                });
            }

            // Queue for sync
            await syncManager.queueSync('adherence_logs', logId, 'insert');

            // Alert caregiver
            await notificationManager.sendCaregiverAlert(
                patientId,
                selectedMedicineForSymptom.name
            );

            setSymptomModalVisible(false);
            setSelectedMedicineForSymptom(null);
            await loadData();

            Alert.alert(
                'Reported',
                'Your caregiver has been notified',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error logging symptoms:', error);
        }
    };

    const handleSOS = async () => {
        if (!patient?.emergency_contact_phone) {
            Alert.alert('No Emergency Contact', 'Please set up an emergency contact');
            return;
        }

        Alert.alert(
            '🚨 Emergency',
            'Call emergency contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call Now',
                    style: 'destructive',
                    onPress: () => {
                        Linking.openURL(`tel:${patient.emergency_contact_phone}`);
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with greeting and streak */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        {getGreeting(patient?.language_code)}
                    </Text>
                    <Text style={styles.patientName}>{patient?.name}</Text>
                </View>

                {streak > 0 && (
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakIcon}>🔥</Text>
                        <Text style={styles.streakText}>{streak} days</Text>
                    </View>
                )}
            </View>

            {/* Sync status indicator */}
            {syncStatus && !syncStatus.isOnline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>📵 Offline - Changes will sync later</Text>
                </View>
            )}

            {/* Today's Medicines */}
            <Text style={styles.sectionTitle}>Today's Medicines</Text>

            {medicines.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>✓</Text>
                    <Text style={styles.emptyText}>No medicines for today!</Text>
                </View>
            ) : (
                <FlatList
                    data={medicines}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <MedicineCard
                            medicine={item}
                            onTaken={() => handleMedicineTaken(item)}
                            onMissed={() => handleMedicineMissed(item)}
                            onUnwell={() => handleMedicineUnwell(item)}
                            isAnimating={false} // Can add logic to check if it's medicine time
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Helper Mode Button */}
            <TouchableOpacity
                style={styles.helperButton}
                onPress={() => navigation.navigate('FamilyProxy', { patientId })}
                activeOpacity={0.8}
            >
                <Text style={styles.helperText}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.helperLabel}>Helper</Text>
            </TouchableOpacity>

            {/* Emergency SOS Button */}
            <TouchableOpacity
                style={styles.sosButton}
                onPress={handleSOS}
                activeOpacity={0.8}
            >
                <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            {/* Symptom Capture Modal */}
            <SymptomCapture
                visible={symptomModalVisible}
                onClose={() => {
                    setSymptomModalVisible(false);
                    setSelectedMedicineForSymptom(null);
                }}
                onSubmit={handleSymptomSubmit}
            />
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
        alignItems: 'center',
        backgroundColor: theme.colors.background
    },
    loadingText: {
        fontSize: theme.typography.fontSizeXL,
        color: theme.colors.textSecondary
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.backgroundSecondary
    },
    greeting: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.fontWeightMedium
    },
    patientName: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    streakBadge: {
        backgroundColor: theme.colors.success,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.md
    },
    streakIcon: {
        fontSize: 32
    },
    streakText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    },
    offlineBanner: {
        backgroundColor: theme.colors.warning,
        padding: theme.spacing.sm,
        alignItems: 'center'
    },
    offlineText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightSemiBold
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md
    },
    listContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        paddingBottom: 100 // Space for SOS button
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
        color: theme.colors.textSecondary,
        textAlign: 'center'
    },
    helperButton: {
        position: 'absolute',
        bottom: theme.spacing.lg,
        left: theme.spacing.lg,
        backgroundColor: theme.colors.primary,
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.xl
    },
    helperText: {
        fontSize: 32
    },
    helperLabel: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeSM,
        fontWeight: theme.typography.fontWeightBold,
        marginTop: 2
    },
    sosButton: {
        position: 'absolute',
        bottom: theme.spacing.lg,
        right: theme.spacing.lg,
        backgroundColor: theme.colors.danger,
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.xl
    },
    sosText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold
    }
});

export default PatientHomeScreen;
