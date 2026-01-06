import { FirestoreService } from './FirestoreService';
import { UserRole } from '../context/AuthContext';

export const AuthService = {
    /**
     * Replaced Twilio OTP with Password Login
     */
    loginWithPassword: async (phoneNumber: string, password: string, role: UserRole): Promise<boolean> => {
        try {
            return await FirestoreService.verifyUserPassword(phoneNumber, password, role as string);
        } catch (error) {
            console.error("Error in loginWithPassword:", error);
            return false;
        }
    },

    /**
     * Signs out (handled manually in AuthContext)
     */
    logout: async () => {
        // Managed locally by clearing AsyncStorage in AuthContext
    },

    /**
     * Placeholder (logic moved to AuthContext)
     */
    getCurrentUserPhone: () => null
};

