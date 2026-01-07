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
import * as Haptics from 'expo-haptics';
import { AuthService } from '../../services/AuthService';
import { FirestoreService } from '../../services/FirestoreService';

type RouteParams = {
    role: UserRole;
};

export default function LoginScreen() {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { login, setUserRole } = useAuth();
    const { role } = route.params as RouteParams;

    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const getRoleTitle = () => {
        if (role === 'pharmacy') return 'Pharmacy Portal';
        if (role === 'patient') return 'Patient Portal';
        if (role === 'guardian') return 'Guardian Portal';
        return 'Portal';
    };

    const getRoleColor = () => {
        if (role === 'pharmacy') return '#10B981';
        if (role === 'patient') return '#3B82F6';
        if (role === 'guardian') return '#8B5CF6';
        return '#2563EB';
    };

    const handleLogin = async () => {
        if (phone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }
        if (!password) {
            Alert.alert('Missing Password', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

            // Check if user exists and password is correct
            const success = await AuthService.loginWithPassword(formattedPhone, password, role!);

            if (success) {
                await login(formattedPhone, role!);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                // If not successful, check why
                const existsForCurrentRole = await FirestoreService.checkUserRole(formattedPhone, role!);

                if (existsForCurrentRole) {
                    Alert.alert("Login Failed", "Incorrect password. Please try again.");
                } else {
                    // Check if they exist for ANY OTHER role
                    const otherRoles: UserRole[] = ['pharmacy', 'patient', 'guardian'];
                    let existingRole: UserRole = null;
                    for (const r of otherRoles) {
                        if (r && r !== role && await FirestoreService.checkUserRole(formattedPhone, r)) {
                            existingRole = r;
                            break;
                        }
                    }

                    if (existingRole) {
                        Alert.alert(
                            "Wrong Portal",
                            `This number is registered as a ${existingRole.toUpperCase()}. Please go back and select the ${existingRole.toUpperCase()} portal to log in.`,
                            [{ text: "OK" }]
                        );
                    } else {
                        // New user
                        Alert.alert(
                            "Account Not Found",
                            "We couldn't find an account with this number for this portal. Would you like to register?",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Register Now",
                                    onPress: () => {
                                        if (role === 'pharmacy') navigation.navigate('PharmacySignup', { phone: formattedPhone });
                                        else if (role === 'patient') navigation.navigate('PatientSignup', { phone: formattedPhone });
                                        else if (role === 'guardian') navigation.navigate('GuardianSignup', { phone: formattedPhone });
                                    }
                                }
                            ]
                        );
                    }
                }
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to login.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Removed handleSkipLogin

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
                    <Text style={styles.subtitle}>
                        Enter your credentials to continue
                    </Text>
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
                        editable={!loading}
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: getRoleColor(), opacity: loading ? 0.7 : 1 }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
                    </TouchableOpacity>

                    {/* Removed Skip Login (Testing) button */}

                    <View style={styles.signupLink}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                const formattedPhone = phone.length === 10 ? (phone.startsWith('+') ? phone : `+91${phone}`) : '';
                                if (role === 'pharmacy') navigation.navigate('PharmacySignup', { phone: formattedPhone });
                                else if (role === 'patient') navigation.navigate('PatientSignup', { phone: formattedPhone });
                                else if (role === 'guardian') navigation.navigate('GuardianSignup', { phone: formattedPhone });
                            }}
                        >
                            <Text style={[styles.signupBtnText, { color: getRoleColor() }]}>Register Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Removed Quick Test Credentials block */}
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
    // Removed skipButton and skipButtonText styles
    // Removed testCredentials, testTitle, testText, testHint styles
    signupLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    signupText: {
        color: '#6B7280',
        fontSize: 16,
    },
    signupBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
    }
});
