import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/guardian/DashboardScreen';
import PatientDetailScreen from '../screens/guardian/PatientDetailScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DashboardMain" component={DashboardScreen} />
            <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
        </Stack.Navigator>
    );
}

export default function GuardianNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#8B5CF6',
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardStack}
                options={{ tabBarLabel: 'Patients', tabBarIcon: () => <Text>👥</Text> }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>👤</Text> }}
            />
        </Tab.Navigator>
    );
}
