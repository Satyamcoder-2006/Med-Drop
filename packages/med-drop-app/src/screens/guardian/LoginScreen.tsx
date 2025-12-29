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

export default function LoginScreen({ navigation }: any) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp' | 'link'>('phone');
    const [patientId, setPatientId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = () => {
        if (phone.length !== 10) return;
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            Alert.alert('OTP Sent', 'Use 123456');
        }, 1000);
    };

    const handleVerifyOtp = () => {
        if (otp !== '123456') return;
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            // Check if user has linked patients. For demo: first time user
            setStep('link');
        }, 1000);
    };

    const handleLinkPatient = () => {
        if (!patientId) return;
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            navigation.replace('Dashboard');
        }, 1500);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar style="dark" />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>MED DROP</Text>
                    <Text style={styles.subtitle}>Guardian Portal</Text>
                </View>

                <View style={styles.card}>
                    {step === 'phone' && (
                        <>
                            <Text style={styles.cardTitle}>Login</Text>
                            <Text style={styles.cardDesc}>Enter your mobile number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Mobile Number"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={setPhone}
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleSendOtp}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Send OTP</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <Text style={styles.cardTitle}>Verify OTP</Text>
                            <Text style={styles.cardDesc}>Enter code sent to {phone}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123456"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleVerifyOtp}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'link' && (
                        <>
                            <Text style={styles.cardTitle}>Link Patient</Text>
                            <Text style={styles.cardDesc}>Enter Patient ID or Scan QR</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. MD-8822-4411"
                                value={patientId}
                                onChangeText={setPatientId}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleLinkPatient}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Link Patient</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>Scan QR Code</Text>
                            </TouchableOpacity>
                        </>
                    )}
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
        padding: 24,
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#059669',
    },
    subtitle: {
        fontSize: 18,
        color: '#4B5563',
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1F2937',
    },
    cardDesc: {
        color: '#6B7280',
        marginBottom: 24,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#059669',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        marginTop: 16,
        alignItems: 'center',
        padding: 12,
    },
    secondaryBtnText: {
        color: '#059669',
        fontWeight: '600',
    },
});
