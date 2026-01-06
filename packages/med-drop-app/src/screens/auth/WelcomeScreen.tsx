import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FirestoreService } from '../../services/FirestoreService';
import { Alert } from 'react-native';

type RootStackParamList = {
    Welcome: undefined;
    Login: { role: 'pharmacy' | 'patient' | 'guardian' };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleRoleSelection = (role: 'pharmacy' | 'patient' | 'guardian') => {
        navigation.navigate('Login', { role });
    };

    const handleReset = async () => {
        Alert.alert(
            "🛑 Reset Database?",
            "This will delete ALL users, pharmacies, and guardians. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "YES, RESET",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await FirestoreService.dangerousResetDatabase();
                            Alert.alert("Success", "Database cleared!");
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={require('../../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>MED DROP</Text>
                <Text style={styles.tagline}>Never miss a medicine again</Text>
            </View>

            {/* Role Selection Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.roleButton, styles.pharmacyButton]}
                    onPress={() => handleRoleSelection('pharmacy')}
                >
                    <Text style={styles.roleIcon}>💊</Text>
                    <Text style={styles.roleText}>I AM A PHARMACIST</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleButton, styles.patientButton]}
                    onPress={() => handleRoleSelection('patient')}
                >
                    <Text style={styles.roleIcon}>🏥</Text>
                    <Text style={styles.roleText}>I AM A PATIENT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleButton, styles.guardianButton]}
                    onPress={() => handleRoleSelection('guardian')}
                >
                    <Text style={styles.roleIcon}>👨‍👩‍👧</Text>
                    <Text style={styles.roleText}>I AM A GUARDIAN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.devButton}
                    onPress={handleReset}
                >
                    <Text style={styles.devButtonText}>🛠️ DEVELOPER: RESET DATABASE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2563EB',
    },
    header: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 18,
        color: '#E0E7FF',
        textAlign: 'center',
    },
    buttonContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    pharmacyButton: {
        backgroundColor: '#10B981',
    },
    patientButton: {
        backgroundColor: '#3B82F6',
    },
    guardianButton: {
        backgroundColor: '#8B5CF6',
    },
    roleIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    roleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    devButton: {
        marginTop: 20,
        padding: 10,
        alignItems: 'center',
    },
    devButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '500',
    }
});
