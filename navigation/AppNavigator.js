import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Patient Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import PatientHomeScreen from '../screens/PatientHomeScreen';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import FamilyProxyScreen from '../screens/FamilyProxyScreen';

// Caregiver Screens
import CaregiverDashboardScreen from '../screens/CaregiverDashboardScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';

import theme from '../styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Stack Navigator
const PatientStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.primary
                },
                headerTintColor: theme.colors.textInverse,
                headerTitleStyle: {
                    fontWeight: theme.typography.fontWeightBold,
                    fontSize: theme.typography.fontSizeXL
                }
            }}
        >
            <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PatientHome"
                component={PatientHomeScreen}
                options={{ title: 'MED DROP', headerLeft: null }}
            />
            <Stack.Screen
                name="AddMedicine"
                component={AddMedicineScreen}
                options={{ title: 'Add Medicine' }}
            />
            <Stack.Screen
                name="FamilyProxy"
                component={FamilyProxyScreen}
                options={{ title: 'Helper Mode' }}
            />
        </Stack.Navigator>
    );
};

// Caregiver Stack Navigator
const CaregiverStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.primary
                },
                headerTintColor: theme.colors.textInverse,
                headerTitleStyle: {
                    fontWeight: theme.typography.fontWeightBold,
                    fontSize: theme.typography.fontSizeXL
                }
            }}
        >
            <Stack.Screen
                name="CaregiverDashboard"
                component={CaregiverDashboardScreen}
                options={{ title: 'Caregiver Dashboard' }}
            />
            <Stack.Screen
                name="PatientDetail"
                component={PatientDetailScreen}
                options={{ title: 'Patient Details' }}
            />
        </Stack.Navigator>
    );
};

// Main App Navigator
const AppNavigator = () => {
    return (
        <NavigationContainer>
            <PatientStack />
        </NavigationContainer>
    );
};

export default AppNavigator;
