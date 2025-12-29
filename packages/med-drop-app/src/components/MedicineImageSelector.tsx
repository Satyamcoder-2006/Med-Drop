import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Medicine } from '../types';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface MedicineImageSelectorProps {
    correctMedicine: Medicine;
    onCorrect: () => void;
    onWrong: () => void;
}

export default function MedicineImageSelector({ correctMedicine, onCorrect, onWrong }: MedicineImageSelectorProps) {
    const [options, setOptions] = useState<Medicine[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Mock other medicines for confusion
    const otherMedicines: any[] = [
        { id: 'decoy1', name: 'Ibuprofen', dosage: '200mg', color: '#FFFFFF', instructions: '' },
        { id: 'decoy2', name: 'Paracetamol', dosage: '500mg', color: '#FFFFFF', instructions: '' },
        { id: 'decoy3', name: 'Calcium', dosage: '600mg', color: '#FCD34D', instructions: '' },
    ];

    useEffect(() => {
        // Shuffle and create options
        const allOptions = [correctMedicine, ...otherMedicines.slice(0, 3)];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        setOptions(shuffled as Medicine[]);
    }, [correctMedicine]);

    const handleSelect = async (medicine: Medicine) => {
        setSelectedId(medicine.id);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setTimeout(async () => {
            if (medicine.id === correctMedicine.id) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onCorrect();
            } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                onWrong();
            }
        }, 500);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select the correct medicine:</Text>
            <Text style={styles.subtitle}>{correctMedicine.name}</Text>

            <View style={styles.grid}>
                {options.map((medicine) => (
                    <TouchableOpacity
                        key={medicine.id}
                        style={[
                            styles.option,
                            selectedId === medicine.id && styles.optionSelected,
                            selectedId === medicine.id && medicine.id === correctMedicine.id && styles.optionCorrect,
                            selectedId === medicine.id && medicine.id !== correctMedicine.id && styles.optionWrong,
                        ]}
                        onPress={() => handleSelect(medicine)}
                        disabled={selectedId !== null}
                    >
                        {medicine.photo ? (
                            <Image source={{ uri: medicine.photo }} style={styles.medicineImage} />
                        ) : (
                            <Text style={styles.medicineIcon}>💊</Text>
                        )}
                        <Text style={styles.medicineName}>{medicine.name}</Text>
                        <Text style={styles.medicineDetails}>
                            {medicine.dosage}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3B82F6',
        textAlign: 'center',
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    option: {
        width: (width - 64) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#E5E7EB',
    },
    optionSelected: {
        borderColor: '#3B82F6',
    },
    optionCorrect: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
    },
    optionWrong: {
        backgroundColor: '#FEE2E2',
        borderColor: '#EF4444',
    },
    medicineIcon: {
        fontSize: 64,
        marginBottom: 12,
    },
    medicineImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginBottom: 12,
    },
    medicineName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 4,
    },
    medicineDetails: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
});
