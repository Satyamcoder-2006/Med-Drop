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
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { FirestoreService } from '../../services/FirestoreService';
import * as Haptics from 'expo-haptics';

export default function LinkPatientScreen() {
    const navigation = useNavigation();
    const { userId } = useAuth();

    const [patientPhone, setPatientPhone] = useState('');
    const [patientPassword, setPatientPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLink = async () => {
        if (patientPhone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }
        if (!patientPassword) {
            Alert.alert('Missing Password', 'Please enter the patient\'s password');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = patientPhone.startsWith('+') ? patientPhone : `+91${patientPhone}`;

            const result = await FirestoreService.linkPatientToGuardian(
                formattedPhone,
                patientPassword,
                userId!
            );

            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Success", result.message, [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Failed", result.message);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Link New Patient</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.infoText}>
                        To link with a patient, you need their phone number and the password they used during registration.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Patient's Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 9988776655"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={patientPhone}
                        onChangeText={setPatientPhone}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Patient's Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter patient's password"
                        secureTextEntry
                        value={patientPassword}
                        onChangeText={setPatientPassword}
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.linkButton, loading && { opacity: 0.7 }]}
                        onPress={handleLink}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="link" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.linkButtonText}>Establish Link</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.privacyNote}>
                    <Text style={styles.privacyText}>
                        By linking, you will be able to see their medicine schedule, adherence logs, and receive alerts for missed doses.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    content: {
        padding: 24,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#F5F3FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DDD6FE',
        marginBottom: 32,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#5B21B6',
        lineHeight: 20,
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FBFBFE',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 24,
        color: '#1F2937',
    },
    linkButton: {
        backgroundColor: '#8B5CF6',
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    linkButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    privacyNote: {
        marginTop: 24,
        alignItems: 'center',
    },
    privacyText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
    }
});
