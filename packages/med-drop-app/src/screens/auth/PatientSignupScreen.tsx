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
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { FirestoreService } from '../../services/FirestoreService';
import { Picker } from '@react-native-picker/picker';

export default function PatientSignupScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as { phone?: string };
    const { login } = useAuth();

    const [form, setForm] = useState({
        name: '',
        phone: params?.phone || '',
        password: '',
        age: '',
        gender: 'male' as 'male' | 'female' | 'other',
        language: 'en',
    });
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!form.name || !form.age || !form.password) {
            Alert.alert('Missing Info', 'Please fill in all fields including password');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
            const patientData: any = {
                id: formattedPhone,
                medDropId: `MD${Date.now().toString().slice(-6)}`,
                name: form.name,
                phone: formattedPhone,
                password: form.password,
                age: parseInt(form.age),
                gender: form.gender,
                language: form.language,
                guardians: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await FirestoreService.createOrUpdateUser(patientData);
            await login(formattedPhone, 'patient');
        } catch (error: any) {
            Alert.alert('Signup Error', error.message || 'Failed to complete signup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.title}>Patient Profile</Text>
                    <Text style={styles.subtitle}>Help us tailor the experience for you</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Amit Kumar"
                        value={form.name}
                        onChangeText={(t) => setForm(p => ({ ...p, name: t }))}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 9988776655"
                        value={form.phone}
                        onChangeText={(t) => setForm(p => ({ ...p, phone: t }))}
                        editable={!loading && !params?.phone}
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>Set Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Choose a password"
                        value={form.password}
                        onChangeText={(t) => setForm(p => ({ ...p, password: t }))}
                        editable={!loading}
                        secureTextEntry
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 55"
                                keyboardType="number-pad"
                                value={form.age}
                                onChangeText={(t) => setForm(p => ({ ...p, age: t }))}
                                editable={!loading}
                            />
                        </View>
                        <View style={{ flex: 1.5, marginLeft: 16 }}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.pickerContainer}>
                                <Picker<string>
                                    selectedValue={form.gender}
                                    onValueChange={(v: string) => setForm(p => ({ ...p, gender: v as any }))}
                                    enabled={!loading}
                                >
                                    <Picker.Item label="Male" value="male" />
                                    <Picker.Item label="Female" value="female" />
                                    <Picker.Item label="Other" value="other" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Preferred Language</Text>
                    <View style={styles.pickerContainer}>
                        <Picker<string>
                            selectedValue={form.language}
                            onValueChange={(v: string) => setForm(p => ({ ...p, language: v }))}
                            enabled={!loading}
                        >
                            <Picker.Item label="English" value="en" />
                            <Picker.Item label="Hindi" value="hi" />
                            <Picker.Item label="Tamil" value="ta" />
                            <Picker.Item label="Telugu" value="te" />
                        </Picker>
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, loading && { opacity: 0.7 }]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>Join Med-Drop</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scroll: { padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#3B82F6', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666' },
    form: { gap: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#333'
    },
    pickerContainer: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        overflow: 'hidden'
    },
    btn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
