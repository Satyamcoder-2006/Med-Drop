import React, { createContext, useContext, useState, ReactNode } from 'react';

import { database } from '../services/DatabaseService';

export type UserRole = 'pharmacy' | 'patient' | 'guardian' | null;

interface AuthContextType {
    userRole: UserRole;
    isAuthenticated: boolean;
    userId: string;
    userName: string;
    login: (phone: string, role: UserRole) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');

    const login = async (phoneInput: string, role: UserRole) => {
        const phone = phoneInput.trim();
        setUserId(phone);
        setUserRole(role);
        setIsAuthenticated(true);

        if (role === 'patient') {
            const patients = await database.getAllPatients();
            const patient = patients.find(p => p.phone === phone || p.id === phone);
            if (patient) {
                setUserName(patient.name);
                setUserId(patient.id); // Use real ID if found
            } else {
                setUserName('Patient User');
            }
        } else if (role === 'guardian') {
            const patients = await database.getAllPatients();
            const linkedPatients = patients.filter(p => p.guardians?.includes(phone));
            if (linkedPatients.length > 0) {
                // If the guardian is linked to any patient, we consider them authenticated.
                // We don't have a separate Guardians table yet, so we use a generic name or find from patient contact
                setUserName(`Guardian of ${linkedPatients[0].name}`);
                setUserId(phone);
            } else {
                setUserName('Guardian User');
            }
        } else if (role === 'pharmacy') {
            setUserName('Demo Pharmacy');
        }
    };

    const logout = () => {
        setUserRole(null);
        setIsAuthenticated(false);
        setUserId('');
        setUserName('');
    };

    return (
        <AuthContext.Provider
            value={{
                userRole,
                isAuthenticated,
                userId,
                userName,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
