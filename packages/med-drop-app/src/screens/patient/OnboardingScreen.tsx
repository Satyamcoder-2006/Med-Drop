import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { voiceService } from '../services/VoiceService';

const { width } = Dimensions.get('window');

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

const LANGUAGES: Language[] = [
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

interface OnboardingScreenProps {
    onComplete: (language: string) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [selectedLanguage, setSelectedLanguage] = useState<string>('hi');
    const [step, setStep] = useState<number>(0);

    const handleLanguageSelect = async (languageCode: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedLanguage(languageCode);
        voiceService.setLanguage(languageCode);

        // Play voice preview
        const language = LANGUAGES.find(l => l.code === languageCode);
        if (language) {
            await voiceService.speak(language.nativeName);
        }
    };

    const handleContinue = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (step === 0) {
            setStep(1);
        } else {
            onComplete(selectedLanguage);
        }
    };

    if (step === 0) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />

                <View style={styles.header}>
                    <Text style={styles.logo}>💊 MED DROP</Text>
                    <Text style={styles.title}>Welcome to MED DROP</Text>
                    <Text style={styles.subtitle}>Choose your language / अपनी भाषा चुनें</Text>
                </View>

                <ScrollView style={styles.languageList} contentContainerStyle={styles.languageListContent}>
                    {LANGUAGES.map((language) => (
                        <TouchableOpacity
                            key={language.code}
                            style={[
                                styles.languageCard,
                                selectedLanguage === language.code && styles.languageCardSelected,
                            ]}
                            onPress={() => handleLanguageSelect(language.code)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.flag}>{language.flag}</Text>
                            <View style={styles.languageInfo}>
                                <Text style={styles.languageName}>{language.nativeName}</Text>
                                <Text style={styles.languageNameEn}>{language.name}</Text>
                            </View>
                            {selectedLanguage === language.code && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>Continue / जारी रखें</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <ScrollView contentContainerStyle={styles.welcomeContent}>
                <Text style={styles.welcomeTitle}>Welcome! स्वागत है!</Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>⏰</Text>
                        <Text style={styles.featureText}>Get reminders for your medicines</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>🔊</Text>
                        <Text style={styles.featureText}>Voice instructions in your language</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>📱</Text>
                        <Text style={styles.featureText}>Works without internet</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>👨‍👩‍👧‍👦</Text>
                        <Text style={styles.featureText}>Family can help monitor</Text>
                    </View>
                </View>

                <View style={styles.permissionsInfo}>
                    <Text style={styles.permissionsTitle}>We need your permission for:</Text>

                    <View style={styles.permissionItem}>
                        <Text style={styles.permissionIcon}>🔔</Text>
                        <Text style={styles.permissionText}>Notifications - To remind you about medicines</Text>
                    </View>

                    <View style={styles.permissionItem}>
                        <Text style={styles.permissionIcon}>📸</Text>
                        <Text style={styles.permissionText}>Camera - To add medicine photos</Text>
                    </View>

                    <View style={styles.permissionItem}>
                        <Text style={styles.permissionIcon}>🎤</Text>
                        <Text style={styles.permissionText}>Microphone - To talk to the app</Text>
                    </View>
                </View>
            </ScrollView>

            <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
            >
                <Text style={styles.continueButtonText}>Get Started / शुरू करें</Text>
            </TouchableOpacity>
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
    logo: {
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    languageList: {
        flex: 1,
    },
    languageListContent: {
        padding: 16,
    },
    languageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    languageCardSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    flag: {
        fontSize: 40,
        marginRight: 16,
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    languageNameEn: {
        fontSize: 16,
        color: '#6B7280',
    },
    checkmark: {
        fontSize: 28,
        color: '#2563EB',
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: '#2563EB',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    welcomeContent: {
        padding: 24,
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 32,
        marginTop: 40,
    },
    featureList: {
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
    },
    featureIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    featureText: {
        fontSize: 18,
        color: '#1F2937',
        flex: 1,
    },
    permissionsInfo: {
        backgroundColor: '#FEF3C7',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    permissionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 16,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    permissionIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    permissionText: {
        fontSize: 16,
        color: '#78350F',
        flex: 1,
    },
});
