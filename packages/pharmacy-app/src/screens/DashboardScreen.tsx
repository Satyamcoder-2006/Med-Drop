import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen({ navigation }: any) {
    const stats = {
        patientsToday: 12,
        refillsPending: 3,
        earningsMonth: '₹4,500',
        badge: 'Gold'
    };

    const menuItems = [
        {
            id: 'register',
            title: 'Register New Patient',
            icon: '👤',
            color: '#2563EB',
            description: 'Onboard a new patient to MED DROP'
        },
        {
            id: 'search',
            title: 'Search Patient',
            icon: '🔍',
            color: '#10B981',
            description: 'Find patient by ID or phone number'
        },
        {
            id: 'refills',
            title: 'Refill Requests',
            icon: '💊',
            color: '#F59E0B',
            description: '3 pending requests need attention',
            badge: 3
        },
        {
            id: 'reports',
            title: 'Reports & Incentive',
            icon: 'bar_chart', // simple text icon fallback
            color: '#7C3AED',
            description: 'View your performance and earnings'
        }
    ];

    const handleMenuPress = (id: string) => {
        switch (id) {
            case 'register':
                navigation.navigate('RegisterPatient');
                break;
            // Add other cases as screens are built
            default:
                console.log('Navigate to', id);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, Pharmacist</Text>
                    <Text style={styles.pharmacyName}>Apollo Pharmacy, Indiranagar</Text>
                </View>
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeIcon}>🏆</Text>
                    <Text style={styles.badgeText}>{stats.badge}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.patientsToday}</Text>
                        <Text style={styles.statLabel}>Patients Today</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.refillsPending}</Text>
                        <Text style={styles.statLabel}>Pending Refills</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.earningsMonth}</Text>
                        <Text style={styles.statLabel}>Incentive</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.menuGrid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuCard}
                            onPress={() => handleMenuPress(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                                <Text style={styles.menuIcon}>{item.icon === 'bar_chart' ? '📊' : item.icon}</Text>
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuDesc}>{item.description}</Text>
                            </View>
                            {item.badge && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationText}>{item.badge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Activity Section could go here */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    greeting: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
    },
    pharmacyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 4,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    badgeIcon: {
        marginRight: 4,
        fontSize: 16,
    },
    badgeText: {
        color: '#B45309',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        width: '31%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    menuGrid: {
        gap: 16,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuIcon: {
        fontSize: 28,
    },
    menuInfo: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    menuDesc: {
        fontSize: 13,
        color: '#6B7280',
    },
    notificationBadge: {
        backgroundColor: '#EF4444',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    notificationText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
