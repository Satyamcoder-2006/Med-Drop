import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';

type RouteParams = {
    role: UserRole;
};

export default function LoginScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { login } = useAuth();
    const { role } = route.params as RouteParams;

    const [phone, setPhone] = useState('');

    const getRoleTitle = () => {
        if (role === 'pharmacy') return 'Pharmacy Login';
        if (role === 'patient') return 'Patient Login';
        if (role === 'guardian') return 'Guardian Login';
        return 'Login';
    };

    const getRoleColor = () => {
        if (role === 'pharmacy') return '#10B981';
        if (role === 'patient') return '#3B82F6';
        if (role === 'guardian') return '#8B5CF6';
        return '#2563EB';
    };

    const handleLogin = async () => {
        if (phone.length !== 10) {
            Alert.alert('Invalid Phone', 'Please enter a 10-digit phone number');
            return;
        }

        await login(phone, role);
    };

    const handleSkipLogin = async () => {
        // Auto-login with test credentials
        const testPhone = role === 'pharmacy' ? '9999999991' :
            role === 'patient' ? '9999999992' : '9999999993';
        await login(testPhone, role);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: getRoleColor() }]}>
                        {getRoleTitle()}
                    </Text>
                    <Text style={styles.subtitle}>Enter your phone number to continue</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 10-digit phone number"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: getRoleColor() }]}
                        onPress={handleLogin}
                    >
                        <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>

                    {/* Skip Login for Testing */}
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleSkipLogin}
                    >
                        <Text style={styles.skipButtonText}>Skip Login (Testing)</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Test Credentials */}
                <View style={styles.testCredentials}>
                    <Text style={styles.testTitle}>Quick Test Credentials:</Text>
                    <Text style={styles.testText}>Pharmacist: 9999999991</Text>
                    <Text style={styles.testText}>Patient: 9999999992</Text>
                    <Text style={styles.testText}>Guardian: 9999999993</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    form: {
        marginBottom: 40,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 24,
    },
    loginButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#6B7280',
        fontSize: 16,
    },
    testCredentials: {
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    testTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 8,
    },
    testText: {
        fontSize: 13,
        color: '#92400E',
        marginBottom: 4,
    },
});
