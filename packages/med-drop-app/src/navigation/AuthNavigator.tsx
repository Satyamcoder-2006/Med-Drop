import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PharmacySignupScreen from '../screens/auth/PharmacySignupScreen';
import PatientSignupScreen from '../screens/auth/PatientSignupScreen';
import GuardianSignupScreen from '../screens/auth/GuardianSignupScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="PharmacySignup" component={PharmacySignupScreen} />
            <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />
            <Stack.Screen name="GuardianSignup" component={GuardianSignupScreen} />
        </Stack.Navigator>
    );
}
