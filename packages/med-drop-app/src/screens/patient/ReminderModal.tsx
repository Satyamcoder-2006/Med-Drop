import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Medicine } from '../../types';
import MedicineImageSelector from '../../components/MedicineImageSelector';

interface ReminderModalProps {
    visible: boolean;
    medicine: Medicine | null;
    onTakeNow: () => void;
    onSnooze: () => void;
    onNotWell: () => void;
    onDismiss: () => void;
}

export default function ReminderModal({
    visible,
    medicine,
    onTakeNow,
    onSnooze,
    onNotWell,
    onDismiss,
}: ReminderModalProps) {
    const [showImageSelector, setShowImageSelector] = useState(false);

    useEffect(() => {
        if (visible && medicine) {
            // Play haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            // Speak reminder
            const message = `Time to take ${medicine.name}. ${medicine.dosage}.`;
            Speech.speak(message, {
                language: 'en-US',
                pitch: 1.0,
                rate: 0.9,
            });
        }

        return () => {
            Speech.stop();
        };
    }, [visible, medicine]);

    if (!medicine) return null;

    const handleTakeItPress = () => {
        // Show image selector first
        setShowImageSelector(true);
    };

    const handleCorrectMedicine = () => {
        // User selected correct medicine
        setShowImageSelector(false);
        onTakeNow();
    };

    const handleWrongMedicine = () => {
        // User selected wrong medicine - show warning and keep modal open
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShowImageSelector(false);
        // Could show an error message here
        alert('⚠️ Wrong medicine selected! Please look carefully and try again.');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onDismiss}
        >
            <View style={styles.container}>
                <StatusBar style="light" />

                {showImageSelector ? (
                    // Show medicine image selector
                    <View style={styles.selectorContainer}>
                        <MedicineImageSelector
                            correctMedicine={medicine}
                            onCorrect={handleCorrectMedicine}
                            onWrong={handleWrongMedicine}
                        />
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowImageSelector(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Show reminder modal
                    <>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>⏰ Medicine Reminder</Text>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.medicineCard}>
                                {medicine.photo ? (
                                    <View style={styles.medicineImageContainer}>
                                        <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                                    </View>
                                ) : (
                                    <View style={styles.medicineIconPlaceholder}>
                                        <Text style={styles.medicineIcon}>💊</Text>
                                    </View>
                                )}
                                <View style={styles.medicineInfo}>
                                    <Text style={styles.medicineName}>{medicine.name}</Text>
                                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                                    <View style={styles.timeBadge}>
                                        <Text style={styles.medicineTime}>
                                            {new Date().toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                </View>

                                {medicine.instructions && (
                                    <View style={styles.instructionsContainer}>
                                        <Text style={styles.medicineInstructions}>
                                            📋 {medicine.instructions}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.primaryButton]}
                                    onPress={handleTakeItPress}
                                >
                                    <View style={styles.primaryButtonContent}>
                                        <Text style={styles.primaryButtonText}>I TOOK IT</Text>
                                        <Text style={styles.buttonSubtext}>Verify medicine first</Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.subActions}>
                                    <TouchableOpacity
                                        style={[styles.subActionButton, styles.secondaryButton]}
                                        onPress={async () => {
                                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onSnooze();
                                        }}
                                    >
                                        <Text style={styles.subActionText}>Snooze 15m</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.subActionButton, styles.warningButton]}
                                        onPress={async () => {
                                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            onNotWell();
                                        }}
                                    >
                                        <Text style={styles.subActionText}>Not Well</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                                    <Text style={styles.dismissText}>Dismiss</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    selectorContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: 60,
    },
    cancelButton: {
        margin: 20,
        padding: 16,
        backgroundColor: '#4B5563',
        borderRadius: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F9FAFB',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    medicineCard: {
        backgroundColor: '#1F2937',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    medicineImageContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
        marginBottom: 20,
    },
    medicineImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#3B82F6',
    },
    medicineIconPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    medicineIcon: {
        fontSize: 48,
    },
    medicineInfo: {
        alignItems: 'center',
        width: '100%',
    },
    medicineName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
        textAlign: 'center',
    },
    medicineDosage: {
        fontSize: 18,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 12,
    },
    timeBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    medicineTime: {
        fontSize: 15,
        color: '#60A5FA',
        fontWeight: '700',
    },
    instructionsContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        width: '100%',
    },
    medicineInstructions: {
        fontSize: 14,
        color: '#D1D5DB',
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    actions: {
        marginTop: 32,
        gap: 16,
    },
    actionButton: {
        borderRadius: 24,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    primaryButtonContent: {
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    buttonSubtext: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    subActions: {
        flexDirection: 'row',
        gap: 12,
    },
    subActionButton: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    subActionText: {
        color: '#F3F4F6',
        fontSize: 15,
        fontWeight: '600',
    },
    warningButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    dismissButton: {
        marginTop: 8,
        alignSelf: 'center',
        padding: 12,
    },
    dismissText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
