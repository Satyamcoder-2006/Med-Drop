import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    Timestamp,
    deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Medicine, AdherenceLog, Patient, Pharmacy, Guardian, MedicineSchedule, SymptomReport, Alert } from '../types';

export const FirestoreService = {
    // --- Users (Patients) ---
    createOrUpdateUser: async (userData: Partial<Patient> & { id: string }) => {
        try {
            const userRef = doc(db, 'users', userData.id);
            await setDoc(userRef, {
                ...userData,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            console.error("Error creating/updating user:", error);
            throw error;
        }
    },

    getUser: async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                return docSnap.data() as Patient;
            }
            return null;
        } catch (error) {
            console.error("Error getting user:", error);
            throw error;
        }
    },

    getAllPatients: async () => {
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        } catch (error) {
            console.error("Error getting all patients:", error);
            throw error;
        }
    },

    getPatientsByGuardian: async (guardianId: string) => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('guardians', 'array-contains', guardianId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        } catch (error) {
            console.error("Error getting patients by guardian:", error);
            throw error;
        }
    },

    getPatientsByPharmacy: async (pharmacyId: string) => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('pharmacies', 'array-contains', pharmacyId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        } catch (error) {
            console.error("Error getting patients by pharmacy:", error);
            throw error;
        }
    },

    // --- Pharmacies ---
    createPharmacy: async (data: Pharmacy) => {
        try {
            const ref = doc(db, 'pharmacies', data.id);
            await setDoc(ref, { ...data, updatedAt: Timestamp.now() }, { merge: true });
        } catch (error) {
            console.error("Error creating pharmacy:", error);
            throw error;
        }
    },

    getPharmacy: async (id: string) => {
        try {
            const ref = doc(db, 'pharmacies', id);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as Pharmacy : null;
        } catch (error) {
            console.error("Error getting pharmacy:", error);
            throw error;
        }
    },

    // --- Guardians ---
    createGuardian: async (data: Guardian) => {
        try {
            const ref = doc(db, 'guardians', data.id);
            await setDoc(ref, { ...data, updatedAt: Timestamp.now() }, { merge: true });
        } catch (error) {
            console.error("Error creating guardian:", error);
            throw error;
        }
    },

    getGuardian: async (id: string) => {
        try {
            const ref = doc(db, 'guardians', id);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as Guardian : null;
        } catch (error) {
            console.error("Error getting guardian:", error);
            throw error;
        }
    },

    // Allow overlapping roles: auto-provision missing role docs
    ensureGuardianFromPatient: async (guardianPhone: string): Promise<boolean> => {
        try {
            const guardian = await FirestoreService.getGuardian(guardianPhone);
            if (guardian) return true;

            const patient = await FirestoreService.getUser(guardianPhone);
            if (!patient) return false;

            await FirestoreService.createGuardian({
                id: guardianPhone,
                name: patient.name || '',
                phone: guardianPhone,
                patients: [],
                // carry over password to keep login consistent across roles
                password: (patient as any).password,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            } as Guardian);

            return true;
        } catch (error) {
            console.error("Error ensuring guardian from patient:", error);
            return false;
        }
    },

    ensurePatientFromGuardian: async (patientPhone: string): Promise<boolean> => {
        try {
            const patient = await FirestoreService.getUser(patientPhone);
            if (patient) return true;

            const guardian = await FirestoreService.getGuardian(patientPhone);
            if (!guardian) return false;

            await FirestoreService.createOrUpdateUser({
                id: patientPhone,
                name: (guardian as any).name || '',
                phone: patientPhone,
                guardians: [],
                // carry over password to keep login consistent across roles
                password: (guardian as any).password,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            } as any);

            return true;
        } catch (error) {
            console.error("Error ensuring patient from guardian:", error);
            return false;
        }
    },

    // --- Role Check ---
    checkUserRole: async (phone: string, role: string): Promise<boolean> => {
        try {
            if (role === 'pharmacy') {
                const p = await FirestoreService.getPharmacy(phone);
                return !!p;
            } else if (role === 'patient') {
                const p = await FirestoreService.getUser(phone);
                if (p) return true;
                // If only guardian exists, auto-provision as patient
                const ensured = await FirestoreService.ensurePatientFromGuardian(phone);
                return ensured;
            } else if (role === 'guardian') {
                const g = await FirestoreService.getGuardian(phone);
                if (g) return true;
                // If only patient exists, auto-provision as guardian
                const ensured = await FirestoreService.ensureGuardianFromPatient(phone);
                return ensured;
            }
            return false;
        } catch (error) {
            console.error("Error checking role:", error);
            return false;
        }
    },

    verifyUserPassword: async (phone: string, password: string, role: string): Promise<boolean> => {
        try {
            let userData: any = null;
            if (role === 'pharmacy') {
                userData = await FirestoreService.getPharmacy(phone);
            } else if (role === 'patient') {
                userData = await FirestoreService.getUser(phone);
                // If patient doc missing, try guardian doc and provision patient on success
                if (!userData) {
                    const guardianData = await FirestoreService.getGuardian(phone);
                    if (guardianData && guardianData.password === password) {
                        await FirestoreService.ensurePatientFromGuardian(phone);
                        return true;
                    }
                }
            } else if (role === 'guardian') {
                userData = await FirestoreService.getGuardian(phone);
                // If guardian doc missing, try patient doc and provision guardian on success
                if (!userData) {
                    const patientData = await FirestoreService.getUser(phone);
                    if (patientData && patientData.password === password) {
                        await FirestoreService.ensureGuardianFromPatient(phone);
                        return true;
                    }
                }
            }

            if (!userData) return false;
            // Simplified check: in production this should be a hash check
            return userData.password === password;
        } catch (error) {
            console.error("Error verifying password:", error);
            return false;
        }
    },

    linkPatientToGuardian: async (patientPhone: string, patientPassword: string, guardianPhone: string): Promise<{ success: boolean; message: string }> => {
        try {
            // 1. Verify Patient Existence and Password
            const patient = await FirestoreService.getUser(patientPhone);
            if (!patient) {
                // If guardian-only account exists, auto-provision patient
                const ensuredPatient = await FirestoreService.ensurePatientFromGuardian(patientPhone);
                if (!ensuredPatient) {
                    return { success: false, message: "Patient not found. Please check the phone number." };
                }
            }
            const verifiedPatient = await FirestoreService.getUser(patientPhone);
            if (!verifiedPatient || verifiedPatient.password !== patientPassword) {
                return { success: false, message: "Incorrect patient password." };
            }

            // 2. Ensure Guardian exists (auto-provision from patient if needed)
            let guardian = await FirestoreService.getGuardian(guardianPhone);
            if (!guardian) {
                const ensuredGuardian = await FirestoreService.ensureGuardianFromPatient(guardianPhone);
                if (!ensuredGuardian) {
                    return { success: false, message: "Guardian not found. Please ask them to enable guardian role or verify phone." };
                }
                guardian = await FirestoreService.getGuardian(guardianPhone);
            }

            // 3. Update Patient's guardians list
            const updatedPatientGuardians = [...(verifiedPatient.guardians || [])];
            if (!updatedPatientGuardians.includes(guardianPhone)) {
                updatedPatientGuardians.push(guardianPhone);
                await updateDoc(doc(db, 'users', patientPhone), {
                    guardians: updatedPatientGuardians,
                    updatedAt: Timestamp.now()
                });
            }

            // 4. Update Guardian's patients list
            const updatedGuardianPatients = [...(guardian.patients || [])];
            if (!updatedGuardianPatients.includes(patientPhone)) {
                updatedGuardianPatients.push(patientPhone);
                await updateDoc(doc(db, 'guardians', guardianPhone), {
                    patients: updatedGuardianPatients,
                    updatedAt: Timestamp.now()
                });
            }

            return { success: true, message: "Patient linked successfully!" };
        } catch (error: any) {
            console.error("Error linking patient:", error);
            return { success: false, message: error.message || "An error occurred while linking." };
        }
    },

    searchPatients: async (searchQuery: string) => {
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));

            // Client-side filtering (Firestore doesn't support case-insensitive search natively)
            const query = searchQuery.toLowerCase().trim();
            return allPatients.filter(patient =>
                patient.name?.toLowerCase().includes(query) ||
                patient.phone?.includes(query) ||
                patient.medDropId?.toLowerCase().includes(query)
            );
        } catch (error) {
            console.error("Error searching patients:", error);
            throw error;
        }
    },

    // --- Developer Tools ---
    dangerousResetDatabase: async () => {
        const collections = ['users', 'pharmacies', 'guardians'];
        for (const collName of collections) {
            const collRef = collection(db, collName);
            const snapshot = await getDocs(collRef);
            for (const document of snapshot.docs) {
                // Delete sub-collections (optional but good for patients)
                if (collName === 'users') {
                    const meds = await getDocs(collection(db, 'users', document.id, 'medicines'));
                    for (const m of meds.docs) await deleteDoc(doc(db, 'users', document.id, 'medicines', m.id));
                    const logs = await getDocs(collection(db, 'users', document.id, 'logs'));
                    for (const l of logs.docs) await deleteDoc(doc(db, 'users', document.id, 'logs', l.id));
                }
                await deleteDoc(doc(db, collName, document.id));
            }
        }
    },

    // --- Medicines ---
    addMedicine: async (userId: string, medicine: Omit<Medicine, 'id'>) => {
        try {
            const medicinesRef = collection(db, 'users', userId, 'medicines');
            // We can use addDoc to auto-generate ID, or setDoc if we have a local ID
            const docRef = await addDoc(medicinesRef, {
                ...medicine,
                createdAt: Timestamp.now()
            });

            // If added by a pharmacy, ensure the patient is linked to this pharmacy
            if (medicine.addedBy === 'pharmacy' && medicine.pharmacyId) {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data() as Patient;
                    const existingPharmacies = userData.pharmacies || [];
                    if (!existingPharmacies.includes(medicine.pharmacyId)) {
                        await updateDoc(userRef, {
                            pharmacies: [...existingPharmacies, medicine.pharmacyId],
                            updatedAt: Timestamp.now()
                        });
                    }
                }
            }

            return docRef.id;
        } catch (error) {
            console.error("Error adding medicine:", error);
            throw error;
        }
    },

    getMedicinesRealtime: (userId: string, onUpdate: (medicines: Medicine[]) => void) => {
        const medicinesRef = collection(db, 'users', userId, 'medicines');
        const q = query(medicinesRef);

        return onSnapshot(q, (snapshot) => {
            const medicines: Medicine[] = [];
            snapshot.forEach((doc) => {
                medicines.push({ id: doc.id, ...doc.data() } as Medicine);
            });
            onUpdate(medicines);
        });
    },

    getMedicines: async (userId: string) => {
        try {
            const medicinesRef = collection(db, 'users', userId, 'medicines');
            const snapshot = await getDocs(medicinesRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
        } catch (error) {
            console.error("Error getting medicines:", error);
            throw error;
        }
    },

    getMedicinesByPharmacy: async (userId: string, pharmacyId: string) => {
        try {
            const medicinesRef = collection(db, 'users', userId, 'medicines');
            const q = query(medicinesRef, where('pharmacyId', '==', pharmacyId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
        } catch (error) {
            console.error("Error getting medicines by pharmacy:", error);
            throw error;
        }
    },

    updateMedicine: async (userId: string, medicineId: string, updates: Partial<Medicine>) => {
        try {
            const medicineRef = doc(db, 'users', userId, 'medicines', medicineId);
            await updateDoc(medicineRef, updates);
        } catch (error) {
            console.error("Error updating medicine:", error);
            throw error;
        }
    },

    // --- Adherence Logs ---
    logIntake: async (userId: string, log: Omit<AdherenceLog, 'id'>) => {
        try {
            const logsRef = collection(db, 'users', userId, 'logs');
            await addDoc(logsRef, {
                ...log,
                timestamp: Timestamp.now()
            });
        } catch (error) {
            console.error("Error logging intake:", error);
            throw error;
        }
    },

    getLogs: async (userId: string) => {
        try {
            const logsRef = collection(db, 'users', userId, 'logs');
            const q = query(logsRef); // Can add orderBy('timestamp', 'desc')
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdherenceLog));
        } catch (error) {
            console.error("Error getting logs:", error);
            throw error;
        }
    },

    // --- High Level Schedule Logic (Cloud Version) ---
    getTodaysSchedule: async (userId: string) => {
        const medicines = await FirestoreService.getMedicines(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const logs = await FirestoreService.getLogs(userId);
        const todayLogs = logs.filter(l => {
            const t = l.createdAt instanceof Timestamp ? l.createdAt.toDate() : new Date(l.createdAt);
            return t >= today && t < tomorrow;
        });

        const result: { medicine: Medicine; schedule: MedicineSchedule; status: AdherenceLog['status'] | 'pending' }[] = [];

        medicines.forEach(medicine => {
            medicine.schedule.forEach(sched => {
                const log = todayLogs.find(l => {
                    const isSameMedicine = l.medicineId === medicine.id;
                    const schedDate = l.scheduledTime instanceof Timestamp ? l.scheduledTime.toDate() : new Date(l.scheduledTime);
                    const logTime = `${schedDate.getHours().toString().padStart(2, '0')}:${schedDate.getMinutes().toString().padStart(2, '0')}`;
                    return isSameMedicine && logTime === sched.time;
                });

                result.push({
                    medicine,
                    schedule: sched,
                    status: log ? log.status : 'pending',
                });
            });
        });

        return result.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));
    },

    getCurrentMedicine: async (userId: string) => {
        const schedule = await FirestoreService.getTodaysSchedule(userId);
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        for (const item of schedule) {
            if (item.status === 'pending') {
                const [h, m] = item.schedule.time.split(':').map(Number);
                const schedTimeInMinutes = h * 60 + m;
                const diff = Math.abs(currentTimeInMinutes - schedTimeInMinutes);

                if (diff <= 30) {
                    return { medicine: item.medicine, schedule: item.schedule };
                }
            }
        }
        return null;
    },

    getNextMedicine: async (userId: string) => {
        const schedule = await FirestoreService.getTodaysSchedule(userId);
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        for (const item of schedule) {
            if (item.status === 'pending') {
                const [h, m] = item.schedule.time.split(':').map(Number);
                const schedTimeInMinutes = h * 60 + m;

                if (schedTimeInMinutes > currentTimeInMinutes) {
                    const diff = schedTimeInMinutes - currentTimeInMinutes;
                    const timeUntil = diff < 60 ? `in ${diff} minutes` : `at ${item.schedule.time}`;
                    return { medicine: item.medicine, schedule: item.schedule, timeUntil };
                }
            }
        }
        return null;
    },

    getAdherenceRate: async (userId: string) => {
        const logs = await FirestoreService.getLogs(userId);
        if (logs.length === 0) return 1.0;

        const relevantLogs = logs.filter(l => l.status === 'taken' || l.status === 'missed');
        if (relevantLogs.length === 0) return 1.0;

        const takenCount = relevantLogs.filter(l => l.status === 'taken').length;
        return takenCount / relevantLogs.length;
    },

    getRiskLevel: async (userId: string) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        const logs = await FirestoreService.getLogs(userId);
        const recentLogs = logs.filter(l => {
            const t = l.createdAt instanceof Timestamp ? l.createdAt.toDate() : new Date(l.createdAt);
            return t >= start && t <= end;
        }).sort((a, b) => {
            const tA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
            const tB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
            return tB.getTime() - tA.getTime();
        });

        let misses = 0;
        for (const log of recentLogs) {
            if (log.status === 'missed') {
                misses++;
            } else if (log.status === 'taken') {
                break;
            }
        }

        const rate = await FirestoreService.getAdherenceRate(userId);

        let level: 'low' | 'medium' | 'high' = 'low';
        if (misses >= 3 || rate < 0.6) {
            level = 'high';
        } else if (misses >= 1 || rate < 0.8) {
            level = 'medium';
        }

        return { level, misses };
    },

    getDailyAdherenceStats: async (userId: string) => {
        const schedule = await FirestoreService.getTodaysSchedule(userId);

        let taken = 0;
        let missed = 0;
        let pending = 0;

        schedule.forEach(item => {
            if (item.status === 'taken') taken++;
            else if (item.status === 'missed') missed++;
            else if (item.status === 'pending') {
                const [h, m] = item.schedule.time.split(':').map(Number);
                const now = new Date();
                const schedTime = new Date(now);
                schedTime.setHours(h, m, 0, 0);

                if (now > schedTime) {
                    missed++;
                } else {
                    pending++;
                }
            }
        });

        const logs = await FirestoreService.getLogs(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayLogs = logs.filter(l => {
            const t = l.createdAt instanceof Timestamp ? l.createdAt.toDate() : new Date(l.createdAt);
            return t >= today && t < tomorrow;
        });

        const takenLogs = todayLogs.filter(l => l.status === 'taken' && (l.actualTime)).sort((a, b) => {
            const tA = a.actualTime instanceof Timestamp ? a.actualTime.toDate() : new Date(a.actualTime!);
            const tB = b.actualTime instanceof Timestamp ? b.actualTime.toDate() : new Date(b.actualTime!);
            return tB.getTime() - tA.getTime();
        });

        const lastTakenTime = takenLogs.length > 0 ?
            (takenLogs[0].actualTime instanceof Timestamp ? takenLogs[0].actualTime.toDate() : new Date(takenLogs[0].actualTime!)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;

        return { taken, missed, pending, total: schedule.length, lastTakenTime };
    },

    // --- Alerts ---
    saveAlert: async (alert: any) => {
        try {
            const alertRef = doc(db, 'alerts', alert.id);
            await setDoc(alertRef, {
                ...alert,
                createdAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving alert:", error);
            throw error;
        }
    },

    saveSymptomReport: async (report: any) => {
        try {
            const reportRef = doc(db, 'symptom_reports', report.id);
            await setDoc(reportRef, {
                ...report,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error("Error saving symptom report:", error);
            throw error;
        }
    },

    saveIntervention: async (intervention: any) => {
        try {
            const ref = doc(db, 'interventions', intervention.id);
            await setDoc(ref, {
                ...intervention,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error("Error saving intervention:", error);
            throw error;
        }
    },

    getAlertsByGuardian: async (guardianId: string) => {
        try {
            const q = query(collection(db, 'alerts'), where('guardianId', '==', guardianId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting alerts:", error);
            throw error;
        }
    },

    resolveAlert: async (alertId: string) => {
        try {
            const alertRef = doc(db, 'alerts', alertId);
            await setDoc(alertRef, { actionTaken: true, updatedAt: Timestamp.now() }, { merge: true });
        } catch (error) {
            console.error("Error resolving alert:", error);
            throw error;
        }
    },

    getAlertsByPatient: async (patientId: string) => {
        try {
            const q = query(collection(db, 'alerts'), where('patientId', '==', patientId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting patient alerts:", error);
            throw error;
        }
    },

    getSymptomReports: async (patientId: string) => {
        try {
            const q = query(collection(db, 'symptom_reports'), where('patientId', '==', patientId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting symptom reports:", error);
            throw error;
        }
    },
    deleteMedicine: async (userId: string, medicineId: string) => {
        try {
            const medicineRef = doc(db, 'users', userId, 'medicines', medicineId);
            await deleteDoc(medicineRef);
        } catch (error) {
            console.error('Error deleting medicine:', error);
            throw error;
        }
    },

    deleteUser: async (userId: string) => {
        try {
            // Delete sub-collections first
            const medsSnap = await getDocs(collection(db, 'users', userId, 'medicines'));
            for (const m of medsSnap.docs) {
                await deleteDoc(doc(db, 'users', userId, 'medicines', m.id));
            }

            const logsSnap = await getDocs(collection(db, 'users', userId, 'logs'));
            for (const l of logsSnap.docs) {
                await deleteDoc(doc(db, 'users', userId, 'logs', l.id));
            }

            // Delete user document
            await deleteDoc(doc(db, 'users', userId));
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    changePassword: async (role: 'pharmacy' | 'patient' | 'guardian', userId: string, newPassword: string) => {
        try {
            const coll = role === 'pharmacy' ? 'pharmacies' : role === 'guardian' ? 'guardians' : 'users';
            const ref = doc(db, coll, userId);
            await setDoc(ref, { password: newPassword, updatedAt: Timestamp.now() }, { merge: true });
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    },

    deleteAccount: async (role: 'pharmacy' | 'patient' | 'guardian', userId: string) => {
        try {
            if (role === 'patient') {
                // Full patient cleanup
                await FirestoreService.deleteUser(userId);
            } else {
                const coll = role === 'pharmacy' ? 'pharmacies' : 'guardians';
                await deleteDoc(doc(db, coll, userId));
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    },
};
