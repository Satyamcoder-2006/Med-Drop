import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import dbManager from '../database/DatabaseManager';
import voiceManager from '../services/VoiceManager';
import theme from '../styles/theme';
import CONSTANTS from '../config/constants';

const OnboardingScreen = ({ navigation }) => {
    const [step, setStep] = useState(1);
    const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    const languages = Object.values(CONSTANTS.LANGUAGES);

    const handleLanguageSelect = async (languageCode) => {
        setSelectedLanguage(languageCode);
        voiceManager.setLanguage(languageCode);
        await voiceManager.speakWelcome();
    };

    const handleNext = () => {
        if (step === 1 && !selectedLanguage) {
            Alert.alert('Please select a language');
            return;
        }
        if (step === 2 && !patientName) {
            Alert.alert('Please enter your name');
            return;
        }
        setStep(step + 1);
    };

    const handleComplete = async () => {
        try {
            // Create patient record
            const patientId = await dbManager.createPatient({
                name: patientName,
                phone: patientPhone,
                languageCode: selectedLanguage,
                emergencyContactName: emergencyName,
                emergencyContactPhone: emergencyPhone
            });

            // Navigate to patient home
            navigation.replace('PatientHome', { patientId });
        } catch (error) {
            console.error('Error creating patient:', error);
            Alert.alert('Error', 'Failed to create profile');
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Choose Your Language</Text>
            <Text style={styles.subtitle}>अपनी भाषा चुनें</Text>

            <ScrollView contentContainerStyle={styles.languageGrid}>
                {languages.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[
                            styles.languageButton,
                            selectedLanguage === lang.code && styles.languageButtonSelected
                        ]}
                        onPress={() => handleLanguageSelect(lang.code)}
                    >
                        <Text style={styles.languageText}>{lang.name}</Text>
                        {selectedLanguage === lang.code && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Information</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Your Name *</Text>
                <TextInput
                    style={styles.input}
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.textLight}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={theme.colors.textLight}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Emergency Contact</Text>
            <Text style={styles.subtitle}>Who should we call in emergency?</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Contact Name</Text>
                <TextInput
                    style={styles.input}
                    value={emergencyName}
                    onChangeText={setEmergencyName}
                    placeholder="Family member or friend"
                    placeholderTextColor={theme.colors.textLight}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Contact Phone</Text>
                <TextInput
                    style={styles.input}
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={theme.colors.textLight}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
                {[1, 2, 3].map((num) => (
                    <View
                        key={num}
                        style={[
                            styles.progressDot,
                            step >= num && styles.progressDotActive
                        ]}
                    />
                ))}
            </View>

            {/* Step Content */}
            <ScrollView contentContainerStyle={styles.content}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                {step > 1 && (
                    <TouchableOpacity
                        style={[styles.button, styles.backButton]}
                        onPress={() => setStep(step - 1)}
                    >
                        <Text style={styles.buttonText}>Back</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.button, styles.nextButton, step === 1 && { flex: 1 }]}
                    onPress={step === 3 ? handleComplete : handleNext}
                >
                    <Text style={styles.buttonText}>
                        {step === 3 ? 'Complete' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.md
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.borderLight
    },
    progressDotActive: {
        backgroundColor: theme.colors.primary,
        width: 16,
        height: 16,
        borderRadius: 8
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing.lg
    },
    stepContainer: {
        flex: 1
    },
    title: {
        fontSize: theme.typography.fontSize3XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center'
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: theme.spacing.md
    },
    languageButton: {
        width: '48%',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 3,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm
    },
    languageButtonSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    languageText: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    checkmark: {
        fontSize: 32,
        color: theme.colors.textInverse,
        marginTop: theme.spacing.xs
    },
    inputContainer: {
        marginBottom: theme.spacing.lg
    },
    label: {
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightSemiBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm
    },
    input: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.text,
        minHeight: theme.minTapTarget
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md
    },
    button: {
        flex: 1,
        minHeight: theme.minTapTarget,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    backButton: {
        backgroundColor: theme.colors.textSecondary
    },
    nextButton: {
        backgroundColor: theme.colors.primary
    },
    buttonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold
    }
});

export default OnboardingScreen;
