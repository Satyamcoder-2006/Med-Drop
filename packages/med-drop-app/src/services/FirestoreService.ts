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

    // --- Role Check ---
    checkUserRole: async (phone: string, role: string): Promise<boolean> => {
        try {
            if (role === 'pharmacy') {
                const p = await FirestoreService.getPharmacy(phone);
                return !!p;
            } else if (role === 'patient') {
                const p = await FirestoreService.getUser(phone);
                return !!p;
            } else if (role === 'guardian') {
                const g = await FirestoreService.getGuardian(phone);
                return !!g;
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
            } else if (role === 'guardian') {
                userData = await FirestoreService.getGuardian(phone);
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
                return { success: false, message: "Patient not found. Please check the phone number." };
            }

            if (patient.password !== patientPassword) {
                return { success: false, message: "Incorrect patient password." };
            }

            // 2. Fetch Guardian
            const guardian = await FirestoreService.getGuardian(guardianPhone);
            if (!guardian) {
                return { success: false, message: "Guardian not found." };
            }

            // 3. Update Patient's guardians list
            const updatedPatientGuardians = [...(patient.guardians || [])];
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
    }
};
