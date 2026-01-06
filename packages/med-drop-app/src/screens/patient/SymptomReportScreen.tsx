import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { database } from '../../services/DatabaseService';
import { FirestoreService } from '../../services/FirestoreService';
import { useAuth } from '../../context/AuthContext';
import { SymptomReport } from '../../types';

export default function SymptomReportScreen() {
    const { userId } = useAuth();
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const symptoms = [
        { id: 'nausea', label: 'Nausea', icon: '🤢' },
        { id: 'headache', label: 'Headache', icon: '🤕' },
        { id: 'dizziness', label: 'Dizziness', icon: '😵' },
        { id: 'fatigue', label: 'Fatigue', icon: '😴' },
        { id: 'rash', label: 'Skin Rash', icon: '🔴' },
        { id: 'stomach', label: 'Stomach Pain', icon: '😖' },
        { id: 'confusion', label: 'Confusion', icon: '🤔' },
        { id: 'other', label: 'Other', icon: '⚠️' },
    ];

    const toggleSymptom = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedSymptoms.includes(id)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== id));
        } else {
            setSelectedSymptoms([...selectedSymptoms, id]);
        }
    };

    const handleSubmit = async () => {
        if (!userId) return;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const report: SymptomReport = {
            id: `sym_${Date.now()}`,
            patientId: userId,
            symptoms: selectedSymptoms,
            notes,
            createdAt: new Date(),
        };

        try {
            await database.saveSymptomReport(report);

            // Sync to Firestore
            await FirestoreService.saveSymptomReport(report);

            // Notify Guardians via Alerts
            const patientData = await FirestoreService.getUser(userId);
            if (patientData && patientData.guardians) {
                for (const guardianId of patientData.guardians) {
                    await FirestoreService.saveAlert({
                        id: `sym_${report.id}_${guardianId}`,
                        patientId: userId,
                        guardianId: guardianId,
                        type: 'important',
                        title: 'Symptom Reported',
                        message: `${patientData.name} reported: ${selectedSymptoms.join(', ')}`,
                        actionTaken: false,
                        createdAt: new Date(),
                    });
                }
            }

            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setSelectedSymptoms([]);
                setNotes('');
            }, 3000);
        } catch (error) {
            console.error('Failed to submit symptom report:', error);
            alert('Failed to submit report. Please try again.');
        }
    };

    if (submitted) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>Report Submitted</Text>
                    <Text style={styles.successText}>
                        Your guardian has been notified about your symptoms.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>⚠️ Report Symptoms</Text>
                <Text style={styles.subtitle}>Let us know how you're feeling</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Select any symptoms you're experiencing. Your guardian will be notified.
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Select Symptoms</Text>
                <View style={styles.symptomsGrid}>
                    {symptoms.map(symptom => (
                        <TouchableOpacity
                            key={symptom.id}
                            style={[
                                styles.symptomCard,
                                selectedSymptoms.includes(symptom.id) && styles.symptomCardSelected
                            ]}
                            onPress={() => toggleSymptom(symptom.id)}
                        >
                            <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                            <Text style={[
                                styles.symptomLabel,
                                selectedSymptoms.includes(symptom.id) && styles.symptomLabelSelected
                            ]}>
                                {symptom.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <TextInput
                    style={styles.notesInput}
                    placeholder="Describe how you're feeling..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={notes}
                    onChangeText={setNotes}
                    textAlignVertical="top"
                />

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        selectedSymptoms.length === 0 && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={selectedSymptoms.length === 0}
                >
                    <Text style={styles.submitButtonText}>
                        Submit Report
                    </Text>
                </TouchableOpacity>

                <View style={styles.emergencyCard}>
                    <Text style={styles.emergencyTitle}>🚨 Emergency?</Text>
                    <Text style={styles.emergencyText}>
                        If you're experiencing severe symptoms, call emergency services immediately.
                    </Text>
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
    infoCard: {
        backgroundColor: '#DBEAFE',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    infoText: {
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    symptomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    symptomCard: {
        width: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    symptomCardSelected: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    symptomIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    symptomLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    symptomLabelSelected: {
        color: '#92400E',
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
        minHeight: 100,
    },
    submitButton: {
        backgroundColor: '#EF4444',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emergencyCard: {
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    emergencyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#991B1B',
        marginBottom: 8,
    },
    emergencyText: {
        fontSize: 14,
        color: '#991B1B',
        lineHeight: 20,
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
});
