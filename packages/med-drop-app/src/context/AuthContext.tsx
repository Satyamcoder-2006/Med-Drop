import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../services/DatabaseService';
import { FirestoreService } from '../services/FirestoreService';

export type UserRole = 'pharmacy' | 'patient' | 'guardian' | null;

interface AuthContextType {
    userRole: UserRole;
    isAuthenticated: boolean;
    userId: string;
    userName: string;
    login: (phone: string, role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Initial load: Restore session from AsyncStorage
    React.useEffect(() => {
        const loadSession = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem('userId');
                const storedRole = await AsyncStorage.getItem('userRole') as UserRole;
                const storedUserName = await AsyncStorage.getItem('userName');

                if (storedUserId && storedRole) {
                    setUserId(storedUserId);
                    setUserRole(storedRole);
                    setIsAuthenticated(true);
                    setUserName(storedUserName || '');
                }
            } catch (error) {
                console.error('Failed to load session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, []);

    const login = async (phoneInput: string, role: UserRole) => {
        const phone = phoneInput.trim();
        setUserId(phone);
        setUserRole(role);
        setIsAuthenticated(true);

        // Persist to AsyncStorage for manual session management
        await AsyncStorage.setItem('userId', phone);
        await AsyncStorage.setItem('userRole', role || '');

        if (role === 'patient') {
            let currentPatient = await FirestoreService.getUser(phone);
            if (currentPatient) {
                setUserName(currentPatient.name);
                await AsyncStorage.setItem('userName', currentPatient.name);
            }
        } else if (role === 'guardian') {
            const guardian = await FirestoreService.getGuardian(phone);
            if (guardian) {
                setUserName(guardian.name);
                await AsyncStorage.setItem('userName', guardian.name);
            }
        } else if (role === 'pharmacy') {
            const pharmacy = await FirestoreService.getPharmacy(phone);
            if (pharmacy) {
                setUserName(pharmacy.name);
                await AsyncStorage.setItem('userName', pharmacy.name);
            }
        }
    };

    const logout = async () => {
        // Clear manual session
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userName');

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
                setUserRole
            }}
        >
            {!isLoading && children}
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
