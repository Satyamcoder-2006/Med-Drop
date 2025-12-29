import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ProfileScreen from '../screens/auth/ProfileScreen';
import HomeScreen from '../screens/patient/HomeScreen';
import AllMedicinesScreen from '../screens/patient/AllMedicinesScreen';
import SymptomReportScreen from '../screens/patient/SymptomReportScreen';
import IntakeLogScreen from '../screens/patient/IntakeLogScreen';

const Tab = createBottomTabNavigator();

export default function PatientNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#3B82F6',
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text>🏠</Text> }}
            />
            <Tab.Screen
                name="Medicines"
                component={AllMedicinesScreen}
                options={{ tabBarLabel: 'Medicines', tabBarIcon: () => <Text>💊</Text> }}
            />
            <Tab.Screen
                name="Log"
                component={IntakeLogScreen}
                options={{ tabBarLabel: 'Log', tabBarIcon: () => <Text>📊</Text> }}
            />
            <Tab.Screen
                name="Symptoms"
                component={SymptomReportScreen}
                options={{ tabBarLabel: 'Symptoms', tabBarIcon: () => <Text>⚠️</Text> }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>👤</Text> }}
            />
        </Tab.Navigator>
    );
}
