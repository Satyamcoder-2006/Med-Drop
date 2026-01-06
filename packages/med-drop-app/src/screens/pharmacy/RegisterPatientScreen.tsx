import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { database } from '../../services/DatabaseService';
import { FirestoreService } from '../../services/FirestoreService';
import { Patient } from '../../types';

export default function RegisterPatientScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const editingPatient = (route.params as any)?.patient as Patient | undefined;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [address, setAddress] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingPatient) {
            setName(editingPatient.name);
            setPhone(editingPatient.phone);
            setAge(editingPatient.age.toString());
            // address not in schema yet
            setGuardianPhone(editingPatient.guardians?.[0] || '');
        }
    }, [editingPatient]);

    const generateMedDropId = () => {
        const random = Math.floor(1000 + Math.random() * 9000);
        const random2 = Math.floor(1000 + Math.random() * 9000);
        return `MD-${random}-${random2}`;
    };

    const handleSubmit = async () => {
        if (!name || !phone || !age) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const trimmedPhone = phone.trim();
            const trimmedGuardianPhone = guardianPhone.trim();

            const newPatient: Patient = {
                id: editingPatient?.id || trimmedPhone,
                medDropId: editingPatient?.medDropId || generateMedDropId(),
                name: name.trim(),
                phone: trimmedPhone,
                age: parseInt(age),
                gender: editingPatient?.gender || 'other',
                guardians: trimmedGuardianPhone ? [trimmedGuardianPhone] : [],
                language: editingPatient?.language || 'hi',
                emergencyContact: trimmedGuardianPhone,
                createdAt: editingPatient?.createdAt || new Date(),
                updatedAt: new Date(),
            };

            // Save to Firestore (cloud)
            await FirestoreService.createOrUpdateUser(newPatient);

            // Also save to local database for offline access
            await database.savePatient(newPatient);

            console.log('Patient registered in Firestore and local DB:', newPatient);
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                if (editingPatient) {
                    navigation.goBack();
                } else {
                    setName('');
                    setPhone('');
                    setAge('');
                    setAddress('');
                    setGuardianName('');
                    setGuardianPhone('');
                }
            }, 2000);
        } catch (error) {
            console.error('Failed to register patient:', error);
            Alert.alert('Error', 'Failed to save patient. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    const isValid = name && phone && age;

    if (submitted) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>{editingPatient ? 'Changes Saved!' : 'Patient Registered!'}</Text>
                    <Text style={styles.successText}>
                        {editingPatient ? 'The patient profile has been updated.' : 'You can now add medicines to this patient\'s profile.'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>{editingPatient ? '✏️ Edit Patient' : '➕ Register New Patient'}</Text>
                <Text style={styles.subtitle}>{editingPatient ? 'Modify patient details' : 'Add patient to the system'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Patient Information</Text>

                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter patient name"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="10-digit phone number"
                        placeholderTextColor="#9CA3AF"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    <Text style={styles.label}>Age *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter age"
                        placeholderTextColor="#9CA3AF"
                        value={age}
                        onChangeText={setAge}
                        keyboardType="number-pad"
                        maxLength={3}
                    />

                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter address (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={address}
                        onChangeText={setAddress}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guardian Information</Text>
                    <Text style={styles.sectionSubtitle}>
                        Optional - for elderly patients or those needing assistance
                    </Text>

                    <Text style={styles.label}>Guardian Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter guardian name"
                        placeholderTextColor="#9CA3AF"
                        value={guardianName}
                        onChangeText={setGuardianName}
                    />

                    <Text style={styles.label}>Guardian Phone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="10-digit phone number"
                        placeholderTextColor="#9CA3AF"
                        value={guardianPhone}
                        onChangeText={setGuardianPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!isValid}
                >
                    <Text style={styles.submitButtonText}>{editingPatient ? 'Save Changes' : 'Register Patient'}</Text>
                </TouchableOpacity>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>📋 Next Steps</Text>
                    <Text style={styles.infoText}>
                        After registration, you can add medicines and create a schedule for this patient.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        minHeight: 80,
    },
    submitButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoCard: {
        backgroundColor: '#DBEAFE',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E40AF',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
});
