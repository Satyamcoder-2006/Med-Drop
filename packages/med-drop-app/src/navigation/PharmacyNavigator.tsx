import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/pharmacy/DashboardScreen';
import AddMedicineScreen from '../screens/pharmacy/AddMedicineScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DashboardMain" component={DashboardScreen} />
            <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
        </Stack.Navigator>
    );
}

export default function PharmacyNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#10B981',
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardStack}
                options={{ tabBarLabel: 'Dashboard', tabBarIcon: () => <Text>📊</Text> }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>👤</Text> }}
            />
        </Tab.Navigator>
    );
}
