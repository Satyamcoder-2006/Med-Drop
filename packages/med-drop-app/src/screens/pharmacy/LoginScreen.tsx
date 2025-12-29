import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';

// Mock pharmacy for login bypass in MVP
const DEMO_PHARMACY = {
    id: 'pharmacy_001',
    phone: '9876543210',
    otp: '123456'
};

export default function LoginScreen({ navigation }: any) {
    const { login } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = async () => {
        if (phoneNumber.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            Alert.alert('OTP Sent', 'Use 123456 for demo');
        }, 1500);
    };

    const handleVerifyOtp = async () => {
        if (otp !== '123456') {
            Alert.alert('Invalid OTP', 'Please enter correct OTP');
            return;
        }

        setIsLoading(true);
        try {
            // Authenticate with the unified AuthContext
            await login(phoneNumber, 'pharmacy');

            setIsLoading(false);
            navigation.replace('Dashboard');
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Error', 'Login failed. Please try again.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar style="dark" />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.appName}>MED DROP</Text>
                    <Text style={styles.appRole}>Pharmacist Portal</Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.title}>
                        {step === 'phone' ? 'Pharmacist Login' : 'Verify OTP'}
                    </Text>

                    <Text style={styles.subtitle}>
                        {step === 'phone'
                            ? 'Enter your registered mobile number to access the portal'
                            : `Enter the 6-digit code sent to +91 ${phoneNumber}`
                        }
                    </Text>

                    {step === 'phone' ? (
                        <View style={styles.inputContainer}>
                            <Text style={styles.prefix}>+91</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Mobile Number"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                editable={!isLoading}
                            />
                        </View>
                    ) : (
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, styles.otpInput]}
                                placeholder="000000"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                                editable={!isLoading}
                                autoFocus
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={step === 'phone' ? handleSendOtp : handleVerifyOtp}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {step === 'phone' ? 'Send OTP' : 'Verify & Login'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {step === 'otp' && (
                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => setStep('phone')}
                            disabled={isLoading}
                        >
                            <Text style={styles.backLinkText}>Change Number</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        New Pharmacy? <Text style={styles.link}>Register Here</Text>
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 8,
    },
    appRole: {
        fontSize: 18,
        color: '#4B5563',
        fontWeight: '600',
        backgroundColor: '#EBF5FF',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 16,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        marginBottom: 24,
        paddingHorizontal: 12,
        height: 56,
    },
    prefix: {
        fontSize: 18,
        color: '#374151',
        fontWeight: '600',
        marginRight: 8,
        paddingRight: 8,
        borderRightWidth: 1,
        borderRightColor: '#D1D5DB',
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: '#1F2937',
    },
    otpInput: {
        textAlign: 'center',
        letterSpacing: 8,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#2563EB',
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    backLinkText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        color: '#6B7280',
        fontSize: 14,
    },
    link: {
        color: '#2563EB',
        fontWeight: '600',
    },
});
