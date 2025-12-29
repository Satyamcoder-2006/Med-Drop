import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { firebaseService } from '../services/FirebaseService';
import { Patient } from '../types';

export default function RegisterPatientScreen({ navigation }: any) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        age: '',
        gender: 'male',
        language: 'hi', // Default Hindi
    });
    const [isLoading, setIsLoading] = useState(false);

    const languages = [
        { code: 'hi', label: 'Hindi' },
        { code: 'en', label: 'English' },
        { code: 'ta', label: 'Tamil' },
        { code: 'te', label: 'Telugu' },
        { code: 'bn', label: 'Bengali' },
        { code: 'kn', label: 'Kannada' },
    ];

    const handleRegister = async () => {
        // Validation
        if (!formData.name || !formData.phone || !formData.age) {
            Alert.alert('Missing Fields', 'Please fill all required fields');
            return;
        }

        if (formData.phone.length !== 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit number');
            return;
        }

        setIsLoading(true);

        try {
            // Create patient object
            const patientId = await firebaseService.registerPatient({
                name: formData.name,
                phone: formData.phone,
                age: parseInt(formData.age),
                gender: formData.gender as 'male' | 'female' | 'other',
                language: formData.language,
                medDropId: `MD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
                linkedPharmacyId: 'pharmacy_001', // Mock pharmacy ID
                guardians: [],
            });

            setIsLoading(false);

            Alert.alert(
                'Success',
                'Patient registered successfully!',
                [
                    {
                        text: 'Add Medicines Now',
                        onPress: () => navigation.navigate('Dashboard'), // In real app: navigate to AddMedicine
                        style: 'default',
                    },
                    {
                        text: 'Finish',
                        onPress: () => navigation.goBack(),
                        style: 'cancel',
                    },
                ]
            );
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Error', 'Failed to register patient');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Register New Patient</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Ram Kumar"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                        <Text style={styles.label}>Age *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Years"
                            keyboardType="number-pad"
                            maxLength={3}
                            value={formData.age}
                            onChangeText={(text) => setFormData({ ...formData, age: text })}
                        />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Gender *</Text>
                        <View style={styles.genderContainer}>
                            {['male', 'female'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.genderButton,
                                        formData.gender === g && styles.genderButtonActive
                                    ]}
                                    onPress={() => setFormData({ ...formData, gender: g })}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        formData.gender === g && styles.genderTextActive
                                    ]}>
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mobile Number *</Text>
                    <View style={styles.phoneContainer}>
                        <Text style={styles.prefix}>+91</Text>
                        <TextInput
                            style={[styles.input, styles.phoneInput]}
                            placeholder="Mobile Number"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Preferred Language</Text>
                    <View style={styles.languageGrid}>
                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.langButton,
                                    formData.language === lang.code && styles.langButtonActive
                                ]}
                                onPress={() => setFormData({ ...formData, language: lang.code })}
                            >
                                <Text style={[
                                    styles.langText,
                                    formData.language === lang.code && styles.langTextActive
                                ]}>
                                    {lang.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Register Patient</Text>
                    )}
                </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: '#1F2937',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    content: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    row: {
        flexDirection: 'row',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    genderButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    genderButtonActive: {
        borderColor: '#2563EB',
        backgroundColor: '#EBF5FF',
    },
    genderText: {
        color: '#6B7280',
        fontWeight: '500',
    },
    genderTextActive: {
        color: '#2563EB',
        fontWeight: 'bold',
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
    },
    prefix: {
        paddingLeft: 12,
        paddingRight: 8,
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
        borderRightWidth: 1,
        borderRightColor: '#D1D5DB',
    },
    phoneInput: {
        flex: 1,
        borderWidth: 0,
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    langButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    langButtonActive: {
        borderColor: '#2563EB',
        backgroundColor: '#2563EB',
    },
    langText: {
        color: '#4B5563',
        fontWeight: '500',
    },
    langTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
