import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Symptom, AdherenceLog } from '../types';
import { database } from '../services/DatabaseService';
import { voiceService } from '../services/VoiceService';

interface SymptomReportScreenProps {
    patientId: string;
    medicineId: string;
    medicineName: string;
    onComplete: () => void;
}

interface SymptomOption {
    type: Symptom['type'];
    icon: string;
    label: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
    { type: 'stomach', icon: '🤢', label: 'Stomach Problem' },
    { type: 'dizzy', icon: '😵', label: 'Feeling Dizzy' },
    { type: 'rash', icon: '🔴', label: 'Skin Rash' },
    { type: 'weak', icon: '😓', label: 'Feeling Weak' },
    { type: 'pain', icon: '🤕', label: 'Pain' },
    { type: 'other', icon: '❓', label: 'Something Else' },
];

export default function SymptomReportScreen({
    patientId,
    medicineId,
    medicineName,
    onComplete,
}: SymptomReportScreenProps) {
    const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom['type'][]>([]);
    const [step, setStep] = useState<'symptoms' | 'tookMedicine'>('symptoms');
    const [tookMedicine, setTookMedicine] = useState<boolean | null>(null);

    const handleSymptomSelect = async (symptomType: Symptom['type']) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (selectedSymptoms.includes(symptomType)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptomType));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptomType]);
        }
    };

    const handleContinue = async () => {
        if (selectedSymptoms.length === 0) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setStep('tookMedicine');
    };

    const handleMedicineResponse = async (took: boolean) => {
        await Haptics.notificationAsync(
            took ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );

        setTookMedicine(took);

        // Save adherence log with symptoms
        const symptoms: Symptom[] = selectedSymptoms.map(type => ({ type }));

        const log: AdherenceLog = {
            id: `log_${Date.now()}`,
            patientId,
            medicineId,
            medicineName,
            scheduledTime: new Date(),
            actualTime: took ? new Date() : undefined,
            status: took ? 'taken' : 'skipped',
            symptoms,
            confirmedBy: 'patient',
            notes: took
                ? 'Patient felt unwell but took medicine'
                : 'Patient felt unwell and skipped medicine',
            createdAt: new Date(),
        };

        await database.saveAdherenceLog(log);

        // Show confirmation message
        setTimeout(() => {
            onComplete();
        }, 2000);
    };

    if (step === 'symptoms') {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />

                <View style={styles.header}>
                    <Text style={styles.title}>How are you feeling?</Text>
                    <Text style={styles.subtitle}>Select all that apply</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.symptomGrid}>
                        {SYMPTOM_OPTIONS.map((symptom) => (
                            <TouchableOpacity
                                key={symptom.type}
                                style={[
                                    styles.symptomCard,
                                    selectedSymptoms.includes(symptom.type) && styles.symptomCardSelected,
                                ]}
                                onPress={() => handleSymptomSelect(symptom.type)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                                <Text style={styles.symptomLabel}>{symptom.label}</Text>
                                {selectedSymptoms.includes(symptom.type) && (
                                    <View style={styles.checkmarkBadge}>
                                        <Text style={styles.checkmark}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.continueButton, selectedSymptoms.length === 0 && styles.continueButtonDisabled]}
                        onPress={handleContinue}
                        disabled={selectedSymptoms.length === 0}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (tookMedicine === null) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />

                <View style={styles.header}>
                    <Text style={styles.title}>Did you still take the medicine?</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.medicineInfo}>
                        <Text style={styles.medicineName}>{medicineName}</Text>
                    </View>

                    <View style={styles.yesNoButtons}>
                        <TouchableOpacity
                            style={[styles.yesNoButton, styles.yesButton]}
                            onPress={() => handleMedicineResponse(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.yesNoIcon}>✓</Text>
                            <Text style={styles.yesNoText}>YES, I TOOK IT</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.yesNoButton, styles.noButton]}
                            onPress={() => handleMedicineResponse(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.yesNoIcon}>✗</Text>
                            <Text style={styles.yesNoText}>NO, I DIDN'T</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationIcon}>
                    {tookMedicine ? '✓' : '⚠️'}
                </Text>
                <Text style={styles.confirmationTitle}>
                    {tookMedicine ? 'Medicine Recorded' : 'Guardian Will Call You'}
                </Text>
                <Text style={styles.confirmationMessage}>
                    {tookMedicine
                        ? 'Your symptoms have been noted. Take care!'
                        : 'Your guardian will be notified to help you.'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#6B7280',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    symptomGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    symptomCard: {
        width: '47%',
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    symptomCardSelected: {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
    },
    symptomIcon: {
        fontSize: 64,
        marginBottom: 12,
    },
    symptomLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    checkmarkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    continueButton: {
        backgroundColor: '#2563EB',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    medicineInfo: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    medicineName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
    },
    yesNoButtons: {
        gap: 16,
    },
    yesNoButton: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    yesButton: {
        backgroundColor: '#10B981',
    },
    noButton: {
        backgroundColor: '#EF4444',
    },
    yesNoIcon: {
        fontSize: 40,
        color: '#FFFFFF',
    },
    yesNoText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    confirmationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmationIcon: {
        fontSize: 80,
        marginBottom: 24,
    },
    confirmationTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    confirmationMessage: {
        fontSize: 20,
        color: '#6B7280',
        textAlign: 'center',
    },
});
