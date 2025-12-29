import React from 'react';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import PharmacyNavigator from './PharmacyNavigator';
import PatientNavigator from './PatientNavigator';
import GuardianNavigator from './GuardianNavigator';

export default function RootNavigator() {
    const { isAuthenticated, userRole } = useAuth();

    if (!isAuthenticated) {
        return <AuthNavigator />;
    }

    switch (userRole) {
        case 'pharmacy':
            return <PharmacyNavigator />;
        case 'patient':
            return <PatientNavigator />;
        case 'guardian':
            return <GuardianNavigator />;
        default:
            return <AuthNavigator />;
    }
}
