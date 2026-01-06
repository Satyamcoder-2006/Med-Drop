import React, { useState, useEffect } from 'react';
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
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { FirestoreService } from '../../services/FirestoreService';
import { Ionicons } from '@expo/vector-icons';

export default function PharmacySignupScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { login } = useAuth();
    const params = route.params as { phone?: string };

    const [form, setForm] = useState({
        name: '',
        license: '',
        pharmacistName: '',
        address: '',
        phone: params?.phone || '',
        password: '',
    });
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    useEffect(() => {
        detectLocation();
    }, []);

    const detectLocation = async () => {
        setLocationLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied. Please enters address manually.');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });

            // Reverse geocoding to get address
            let reverse = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });

            if (reverse.length > 0) {
                const item = reverse[0];
                const addr = `${item.name || ''}, ${item.street || ''}, ${item.city || ''}, ${item.region || ''}, ${item.postalCode || ''}`;
                setForm(prev => ({ ...prev, address: addr.trim().replace(/^, |, $/g, '') }));
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Location Error', 'Could not detect location. Please enter address manually.');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!form.name || !form.license || !form.pharmacistName || !form.address || !form.password) {
            Alert.alert('Missing Info', 'Please fill in all fields including password');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
            const pharmacyData: any = { // Changed from Pharmacy to any to match original type and avoid interface mismatch
                id: formattedPhone,
                name: form.name,
                licenseNumber: form.license, // Changed from license to licenseNumber
                address: form.address,
                phone: formattedPhone,
                password: form.password,
                pharmacistName: form.pharmacistName,
                pharmacistPhone: formattedPhone,
                location: location || undefined,
                patientsHelped: 0,
                averageAdherence: 0,
                incentiveBalance: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await FirestoreService.createPharmacy(pharmacyData);
            await login(formattedPhone, 'pharmacy');
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
                    <Text style={styles.title}>Pharmacy Registration</Text>
                    <Text style={styles.subtitle}>Complete your profile to start helping patients</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Pharmacy Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Apollo Pharmacy"
                        value={form.name}
                        onChangeText={(t) => setForm(p => ({ ...p, name: t }))}
                        editable={!loading}
                    />

                    <Text style={styles.label}>License Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. LIC-12345678"
                        value={form.license}
                        onChangeText={(t) => setForm(p => ({ ...p, license: t }))}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Pharmacist Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Rahul Sharma"
                        value={form.pharmacistName}
                        onChangeText={(t) => setForm(p => ({ ...p, pharmacistName: t }))}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Pharmacist Phone (Verified / Registration Number)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 9988776655"
                        value={form.phone}
                        onChangeText={(t) => setForm(p => ({ ...p, phone: t }))}
                        editable={!loading && !params?.phone} // Disable if already verified
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

                    <View style={styles.locationHeader}>
                        <Text style={styles.label}>Pharmacy Address</Text>
                        <TouchableOpacity onPress={detectLocation} disabled={locationLoading}>
                            {locationLoading ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <View style={styles.detectBtn}>
                                    <Ionicons name="location" size={16} color="#10B981" />
                                    <Text style={styles.detectText}>Auto-detect</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Full address of the pharmacy"
                        multiline
                        numberOfLines={3}
                        value={form.address}
                        onChangeText={(t) => setForm(p => ({ ...p, address: t }))}
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.btn, loading && { opacity: 0.7 }]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>Complete Registration</Text>
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
    title: { fontSize: 28, fontWeight: 'bold', color: '#10B981', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666' },
    form: { gap: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#333'
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detectText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
    btn: {
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
