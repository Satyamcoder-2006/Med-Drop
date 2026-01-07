import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
     Alert,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { FirestoreService } from '../../services/FirestoreService';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { userRole, userId, userName, logout } = useAuth();

    const getRoleDisplay = () => {
        if (userRole === 'pharmacy') return 'Pharmacist';
        if (userRole === 'patient') return 'Patient';
        if (userRole === 'guardian') return 'Guardian';
        return 'User';
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => {
                        logout();
                        // Navigation will be handled by RootNavigator
                    },
                },
            ]
        );
    };

    const [showChangePassword, setShowChangePassword] = React.useState(false);
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [processing, setProcessing] = React.useState(false);

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please enter and confirm your new password.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        setProcessing(true);
        try {
            await FirestoreService.changePassword(userRole as any, userId, newPassword);
            Alert.alert('Success', 'Password updated successfully.');
            setShowChangePassword(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Alert.alert('Error', 'Could not update password. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account. This action cannot be undone. Do you want to continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            await FirestoreService.deleteAccount(userRole as any, userId);
                            Alert.alert('Account Deleted', 'Your account has been deleted.');
                            logout();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {/* User Info Card */}
            <View style={styles.card}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {userName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>

                <Text style={styles.name}>{userName}</Text>
                <Text style={styles.role}>{getRoleDisplay()}</Text>
                <Text style={styles.phone}>{userId}</Text>
            </View>

            {/* Settings Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>Language</Text>
                    <Text style={styles.settingValue}>English</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>Notifications</Text>
                    <Text style={styles.settingValue}>Enabled</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>Privacy</Text>
                    <Text style={styles.settingValue}>View</Text>
                </TouchableOpacity>
            </View>

            {/* About Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>App Version</Text>
                    <Text style={styles.settingValue}>1.0.0</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>Terms of Service</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingText}>Privacy Policy</Text>
                </TouchableOpacity>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                {!showChangePassword ? (
                    <TouchableOpacity style={styles.settingItem} onPress={() => setShowChangePassword(true)}>
                        <Text style={styles.settingText}>Change Password</Text>
                        <Text style={styles.settingValue}>Update</Text>
                    </TouchableOpacity>
                ) : (
                    <View>
                        <View style={styles.settingItem}>
                            <Text style={styles.settingText}>New Password</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            placeholder="Enter new password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <View style={styles.settingItem}>
                            <Text style={styles.settingText}>Confirm Password</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity
                            style={[styles.logoutButton, { backgroundColor: '#3B82F6', marginVertical: 12 }]}
                            onPress={handleChangePassword}
                            disabled={processing}
                        >
                            <Text style={styles.logoutButtonText}>{processing ? 'Saving...' : 'Save Password'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.logoutButton, { backgroundColor: '#6B7280' }]}
                            onPress={() => setShowChangePassword(false)}
                            disabled={processing}
                        >
                            <Text style={styles.logoutButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#EF4444' }]} onPress={handleDeleteAccount} disabled={processing}>
                    <Text style={styles.logoutButtonText}>Delete Account</Text>
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Med Drop - Medicine Adherence Tracker</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    card: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    role: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    settingText: {
        fontSize: 16,
        color: '#374151',
    },
    settingValue: {
        fontSize: 16,
        color: '#6B7280',
    },
    logoutButton: {
        backgroundColor: '#EF4444',
        marginHorizontal: 16,
        marginVertical: 24,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 32,
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 8,
        marginBottom: 12,
        color: '#111827',
    },
});
