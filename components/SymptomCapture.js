import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import theme from '../styles/theme';
import CONSTANTS from '../config/constants';

const SymptomCapture = ({ visible, onClose, onSubmit }) => {
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioUri, setAudioUri] = useState(null);

    const symptoms = [
        { id: 'nausea', icon: '🤢', label: 'Stomach\nupset', color: '#10B981' },
        { id: 'dizzy', icon: '😵', label: 'Feeling\ndizzy', color: '#F59E0B' },
        { id: 'rash', icon: '🔴', label: 'Skin\nrash', color: '#EF4444' },
        { id: 'weakness', icon: '😓', label: 'Weakness', color: '#8B5CF6' },
        { id: 'other', icon: '🎤', label: 'Something\nelse', color: '#6B7280' }
    ];

    const toggleSymptom = (symptomId) => {
        if (selectedSymptoms.includes(symptomId)) {
            setSelectedSymptoms(selectedSymptoms.filter(id => id !== symptomId));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptomId]);
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access microphone is required!');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);

            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, CONSTANTS.MAX_VOICE_RECORDING_DURATION * 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setAudioUri(uri);
            setRecording(null);
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    const handleSubmit = () => {
        onSubmit({
            symptoms: selectedSymptoms,
            audioUri: audioUri
        });

        // Reset state
        setSelectedSymptoms([]);
        setAudioUri(null);
        setRecording(null);
        setIsRecording(false);
    };

    const handleClose = () => {
        // Clean up recording if active
        if (recording) {
            recording.stopAndUnloadAsync();
            setRecording(null);
            setIsRecording(false);
        }
        setSelectedSymptoms([]);
        setAudioUri(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>How are you feeling?</Text>
                    <Text style={styles.subtitle}>Tap what you're experiencing</Text>

                    <ScrollView contentContainerStyle={styles.symptomsContainer}>
                        {symptoms.map((symptom) => (
                            <TouchableOpacity
                                key={symptom.id}
                                style={[
                                    styles.symptomButton,
                                    selectedSymptoms.includes(symptom.id) && {
                                        backgroundColor: symptom.color,
                                        borderColor: symptom.color
                                    }
                                ]}
                                onPress={() => {
                                    if (symptom.id === 'other') {
                                        if (!isRecording && !audioUri) {
                                            startRecording();
                                        } else if (isRecording) {
                                            stopRecording();
                                        }
                                    }
                                    toggleSymptom(symptom.id);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                                <Text
                                    style={[
                                        styles.symptomLabel,
                                        selectedSymptoms.includes(symptom.id) && styles.symptomLabelSelected
                                    ]}
                                >
                                    {symptom.label}
                                </Text>

                                {symptom.id === 'other' && isRecording && (
                                    <View style={styles.recordingIndicator}>
                                        <Text style={styles.recordingText}>🔴 Recording...</Text>
                                    </View>
                                )}

                                {symptom.id === 'other' && audioUri && (
                                    <View style={styles.recordingIndicator}>
                                        <Text style={styles.recordingText}>✓ Recorded</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleClose}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.submitButton,
                                selectedSymptoms.length === 0 && styles.buttonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={selectedSymptoms.length === 0}
                        >
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: theme.colors.overlay,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        width: '90%',
        maxHeight: '80%',
        ...theme.shadows.xl
    },
    title: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.xs
    },
    subtitle: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md
    },
    symptomButton: {
        width: '48%',
        aspectRatio: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 3,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        padding: theme.spacing.sm,
        ...theme.shadows.sm
    },
    symptomIcon: {
        fontSize: 56,
        marginBottom: theme.spacing.xs
    },
    symptomLabel: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightSemiBold,
        color: theme.colors.text,
        textAlign: 'center'
    },
    symptomLabelSelected: {
        color: theme.colors.textInverse
    },
    recordingIndicator: {
        marginTop: theme.spacing.xs
    },
    recordingText: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textInverse,
        fontWeight: theme.typography.fontWeightBold
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md
    },
    button: {
        flex: 1,
        minHeight: theme.minTapTarget,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    cancelButton: {
        backgroundColor: theme.colors.textSecondary
    },
    submitButton: {
        backgroundColor: theme.colors.primary
    },
    buttonDisabled: {
        backgroundColor: theme.colors.borderLight,
        opacity: 0.5
    },
    buttonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightBold
    }
});

export default SymptomCapture;
