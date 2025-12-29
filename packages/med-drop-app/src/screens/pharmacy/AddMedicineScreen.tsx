import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { database } from '../../services/DatabaseService';
import { Patient, Medicine, MedicineSchedule } from '../../types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'react-native';

export default function AddMedicineScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const editingMedicine = (route.params as any)?.medicine as Medicine | undefined;
    const editingPatient = (route.params as any)?.patient as Patient | undefined;

    interface PendingMedicine {
        id: string;
        name: string;
        dosage: string;
        meals: string[];
        mealTimes: Record<string, string>; // e.g., { breakfast: '08:00', ... }
        relation: string;
        instructions: string;
        photo?: string;
    }

    const DEFAULT_MEAL_TIMES: Record<string, string> = {
        breakfast: '08:00',
        lunch: '13:00',
        dinner: '20:00',
        bedtime: '22:00',
    };

    const [step, setStep] = useState<'search' | 'medicine' | 'success'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchResults, setSearchResults] = useState<(Patient & { medicinesCount: number })[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingMedicine && editingPatient) {
            setSelectedPatient(editingPatient);
            setMedicineName(editingMedicine.name);
            setDosage(editingMedicine.dosage);
            // Map schedule back to selectedMeal and mealRelation
            const mealsFromSchedule = editingMedicine.schedule.map(s => {
                if (s.timeOfDay === 'morning') return 'breakfast';
                if (s.timeOfDay === 'afternoon') return 'lunch';
                if (s.timeOfDay === 'evening') return 'dinner';
                if (s.timeOfDay === 'night') return 'bedtime';
                return '';
            }).filter(m => m !== '');
            setSelectedMeal(mealsFromSchedule);

            // Update mealTimes with actual scheduled times
            const customTimes = { ...DEFAULT_MEAL_TIMES };
            editingMedicine.schedule.forEach(s => {
                if (s.timeOfDay === 'morning') customTimes.breakfast = s.time;
                if (s.timeOfDay === 'afternoon') customTimes.lunch = s.time;
                if (s.timeOfDay === 'evening') customTimes.dinner = s.time;
                if (s.timeOfDay === 'night') customTimes.bedtime = s.time;
            });
            setMealTimes(customTimes);

            // Extract mealRelation from instructions if possible, or default to 'after'
            if (editingMedicine.instructions?.includes('before')) setMealRelation('before');
            else if (editingMedicine.instructions?.includes('after')) setMealRelation('after');
            else if (editingMedicine.instructions?.includes('with')) setMealRelation('with');
            else if (editingMedicine.instructions?.includes('anytime')) setMealRelation('anytime');

            setStep('medicine');
        }
    }, [editingMedicine, editingPatient]);

    // Medicine form state
    const [medicineName, setMedicineName] = useState('');
    const [dosage, setDosage] = useState('');
    const [selectedMeal, setSelectedMeal] = useState<string[]>([]);
    const [mealTimes, setMealTimes] = useState<Record<string, string>>(DEFAULT_MEAL_TIMES);
    const [mealRelation, setMealRelation] = useState('after');
    const [pendingMedicines, setPendingMedicines] = useState<PendingMedicine[]>([]);
    const [medPhoto, setMedPhoto] = useState<string | undefined>(undefined);
    const [suggestions, setSuggestions] = useState<{ name: string, photo: string | null }[]>([]);

    const meals = [
        { id: 'breakfast', label: 'Breakfast', icon: '🌅', timeOfDay: 'morning' as const },
        { id: 'lunch', label: 'Lunch', icon: '☀️', timeOfDay: 'afternoon' as const },
        { id: 'dinner', label: 'Dinner', icon: '🌙', timeOfDay: 'evening' as const },
        { id: 'bedtime', label: 'Bedtime', icon: '😴', timeOfDay: 'night' as const },
    ];

    const relations = [
        { id: 'before', label: 'Before Meal' },
        { id: 'after', label: 'After Meal' },
        { id: 'with', label: 'With Meal' },
        { id: 'anytime', label: 'Anytime' },
    ];

    const handleMedicineNameChange = async (text: string) => {
        setMedicineName(text);
        if (text.length > 1) {
            const results = await database.searchCatalog(text);
            setSuggestions(results);
        } else {
            setSuggestions([]);
        }
    };

    const selectFromCatalog = (med: { name: string, photo: string | null }) => {
        setMedicineName(med.name);
        if (med.photo) {
            setMedPhoto(med.photo);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setSuggestions([]);
    };

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;
        setLoading(true);
        try {
            const patients = await database.getAllPatients();
            const filtered = patients.filter(p =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.phone.includes(query)
            );

            // Fetch medicine counts for each patient
            const resultsWithCount = await Promise.all(filtered.map(async (p) => {
                const meds = await database.getMedicinesByPatient(p.id);
                return { ...p, medicinesCount: meds.length };
            }));

            setSearchResults(resultsWithCount);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error('Search failed:', error);
            Alert.alert('Error', 'Failed to search patients');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setStep('medicine');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const toggleMeal = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedMeal.includes(id)) {
            setSelectedMeal(selectedMeal.filter(m => m !== id));
        } else {
            setSelectedMeal([...selectedMeal, id]);
        }
    };

    const handleQuickSelect = async (name: string) => {
        setMedicineName(name);
        const catalogMed = await database.getCatalogMedicine(name);
        if (catalogMed?.photo) {
            setMedPhoto(catalogMed.photo);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setMedPhoto(undefined);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const pickImage = async () => {
        Alert.alert(
            'Add Photo',
            'Choose a source for the medicine photo:',
            [
                {
                    text: '📸 Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission needed', 'Camera permissions are required.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.7,
                        });
                        if (!result.canceled) {
                            setMedPhoto(result.assets[0].uri);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
                {
                    text: '🖼️ Gallery',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission needed', 'Gallery permissions are required.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.7,
                        });
                        if (!result.canceled) {
                            setMedPhoto(result.assets[0].uri);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const addMedicineToList = () => {
        if (!medicineName || !dosage || selectedMeal.length === 0) return;

        const newMed: PendingMedicine = {
            id: `med_${Date.now()}`,
            name: medicineName,
            dosage,
            meals: [...selectedMeal],
            mealTimes: { ...mealTimes },
            relation: mealRelation,
            instructions: `${mealRelation} meals`,
            photo: medPhoto,
        };

        // Save to catalog
        database.saveToCatalog(medicineName, medPhoto);

        setPendingMedicines([...pendingMedicines, newMed]);

        // Reset form for next medicine
        setMedicineName('');
        setDosage('');
        setSelectedMeal([]);
        setMealTimes(DEFAULT_MEAL_TIMES);
        setMealRelation('after');
        setMedPhoto(undefined);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const removeMedicine = (id: string) => {
        setPendingMedicines(pendingMedicines.filter(m => m.id !== id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleSubmit = async () => {
        if (!selectedPatient) return;

        // Include the current form if it's not empty, or only use pending list
        const allMedicinesToSave: PendingMedicine[] = [...pendingMedicines];
        if (medicineName && dosage && selectedMeal.length > 0) {
            allMedicinesToSave.push({
                id: editingMedicine?.id || `med_${Date.now()}`,
                name: medicineName,
                dosage,
                meals: selectedMeal,
                mealTimes: { ...mealTimes },
                relation: mealRelation,
                instructions: `${mealRelation} meals`,
                photo: medPhoto,
            });
        }

        if (allMedicinesToSave.length === 0) {
            Alert.alert('No Medicines', 'Please add at least one medicine to the prescription.');
            return;
        }

        setLoading(true);
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            for (const med of allMedicinesToSave) {
                // Map selected meals to MedicineSchedule
                const schedule: MedicineSchedule[] = med.meals.map(mealId => {
                    const mealInfo = meals.find(m => m.id === mealId)!;
                    const time = med.mealTimes[mealId] || '08:00';

                    return {
                        time,
                        frequency: 'custom',
                        timeOfDay: mealInfo.timeOfDay,
                    };
                });

                const newMedicine: Medicine = {
                    id: med.id,
                    patientId: selectedPatient.id,
                    name: med.name,
                    dosage: med.dosage,
                    schedule,
                    isCritical: false,
                    color: '#3B82F6',
                    photo: med.photo,
                    daysRemaining: 30,
                    totalDays: 30,
                    addedBy: 'pharmacy',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    instructions: med.instructions,
                };

                await database.saveMedicine(newMedicine);
                // Also save to catalog if it's new or updated with photo
                await database.saveToCatalog(med.name, med.photo);
            }

            setStep('success');
            setTimeout(() => {
                navigation.goBack();
            }, 3000);
        } catch (error) {
            console.error('Failed to add medicines:', error);
            Alert.alert('Error', 'Failed to save prescription');
        } finally {
            setLoading(false);
        }
    };

    // Success Screen
    if (step === 'success') {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>Prescription Saved!</Text>
                    <Text style={styles.successText}>
                        Multiple medicines have been added to {selectedPatient?.name}'s record.
                    </Text>
                    <View style={styles.successList}>
                        {pendingMedicines.map(m => (
                            <Text key={m.id} style={styles.successListItem}>• {m.name} ({m.dosage})</Text>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    // Medicine Entry Screen
    if (step === 'medicine') {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => (editingMedicine ? navigation.goBack() : setStep('search'))} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{editingMedicine ? '✏️ Edit Medicine' : '💊 Add Medicine'}</Text>
                    <Text style={styles.subtitle}>{editingMedicine ? 'Modify prescription' : `For: ${selectedPatient?.name}`}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Prescription List Section */}
                    {pendingMedicines.length > 0 && (
                        <View style={styles.pendingListContainer}>
                            <Text style={styles.sectionHeading}>Current Prescription ({pendingMedicines.length})</Text>
                            {pendingMedicines.map((med) => (
                                <View key={med.id} style={styles.pendingItem}>
                                    {med.photo ? (
                                        <Image source={{ uri: med.photo }} style={styles.pendingItemThumb} />
                                    ) : (
                                        <View style={styles.pendingItemThumbPlaceholder}>
                                            <Text style={{ fontSize: 12 }}>💊</Text>
                                        </View>
                                    )}
                                    <View style={styles.pendingItemInfo}>
                                        <Text style={styles.pendingItemName}>{med.name}</Text>
                                        <Text style={styles.pendingItemDetails}>{med.dosage} • {med.meals.join(', ')}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeMedicine(med.id)} style={styles.removeButton}>
                                        <Text style={styles.removeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.formCard}>
                        {/* Medicine Photo */}
                        <Text style={styles.label}>Medicine Photo</Text>
                        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
                            {medPhoto ? (
                                <Image source={{ uri: medPhoto }} style={styles.medPhoto} />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoIcon}>📸</Text>
                                    <Text style={styles.photoText}>Tap to Take Photo</Text>
                                </View>
                            )}
                            {medPhoto && (
                                <View style={styles.photoOverlay}>
                                    <Text style={styles.photoOverlayText}>Change Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Medicine Name */}
                        <Text style={styles.label}>Medicine Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter medicine name"
                            placeholderTextColor="#9CA3AF"
                            value={medicineName}
                            onChangeText={handleMedicineNameChange}
                        />

                        {/* Suggestions List */}
                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                {suggestions.map((suggestion, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.suggestionItem}
                                        onPress={() => selectFromCatalog(suggestion)}
                                    >
                                        <View style={styles.suggestionLeft}>
                                            {suggestion.photo ? (
                                                <Image source={{ uri: suggestion.photo }} style={styles.suggestionPhotoThumbnail} />
                                            ) : (
                                                <View style={styles.suggestionPhotoPlaceholder}>
                                                    <Text style={{ fontSize: 10 }}>💊</Text>
                                                </View>
                                            )}
                                            <Text style={styles.suggestionText}>{suggestion.name}</Text>
                                        </View>
                                        <Text style={styles.suggestionHint}>Select</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Quick Select */}
                        <Text style={styles.quickSelectLabel}>Quick Select:</Text>
                        <View style={styles.quickSelectGrid}>
                            {['Aspirin', 'Dolo 650', 'Metformin', 'Ibuprofen'].map(med => (
                                <TouchableOpacity
                                    key={med}
                                    style={styles.quickSelectButton}
                                    onPress={() => handleQuickSelect(med)}
                                >
                                    <Text style={styles.quickSelectText}>{med}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Dosage */}
                        <Text style={styles.label}>Dosage *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 100mg, 1 tablet"
                            placeholderTextColor="#9CA3AF"
                            value={dosage}
                            onChangeText={setDosage}
                        />

                        {/* Meal Timing */}
                        <Text style={styles.label}>When to Take *</Text>
                        <View style={styles.mealsGrid}>
                            {meals.map(meal => (
                                <View key={meal.id} style={styles.mealCardContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.mealCard,
                                            selectedMeal.includes(meal.id) && styles.mealCardSelected
                                        ]}
                                        onPress={() => toggleMeal(meal.id)}
                                    >
                                        <Text style={meal.id === 'breakfast' || meal.id === 'lunch' || meal.id === 'dinner' || meal.id === 'bedtime' ? styles.mealIcon : { fontSize: 24, marginBottom: 8 }}>{meal.icon}</Text>
                                        <Text style={[
                                            styles.mealLabel,
                                            selectedMeal.includes(meal.id) && styles.mealLabelSelected
                                        ]}>
                                            {meal.label}
                                        </Text>
                                    </TouchableOpacity>
                                    {selectedMeal.includes(meal.id) && (
                                        <View style={styles.timeInputContainer}>
                                            <TextInput
                                                style={styles.timeInput}
                                                value={mealTimes[meal.id]}
                                                onChangeText={(text) => {
                                                    setMealTimes(prev => ({ ...prev, [meal.id]: text }));
                                                }}
                                                placeholder="HH:MM"
                                                maxLength={5}
                                            />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Meal Relation */}
                        <Text style={styles.label}>Meal Relation</Text>
                        <View style={styles.relationsRow}>
                            {relations.map(relation => (
                                <TouchableOpacity
                                    key={relation.id}
                                    style={[
                                        styles.relationButton,
                                        mealRelation === relation.id && styles.relationButtonSelected
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setMealRelation(relation.id);
                                    }}
                                >
                                    <Text style={[
                                        styles.relationText,
                                        mealRelation === relation.id && styles.relationTextSelected
                                    ]}>
                                        {relation.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Add to List Button */}
                        <TouchableOpacity
                            style={[
                                styles.addToListButton,
                                (!medicineName || !dosage || selectedMeal.length === 0) && styles.addToListButtonDisabled
                            ]}
                            onPress={addMedicineToList}
                            disabled={!medicineName || !dosage || selectedMeal.length === 0}
                        >
                            <Text style={styles.addToListButtonText}>+ Add to Prescription</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Final Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (pendingMedicines.length === 0 && (!medicineName || !dosage || selectedMeal.length === 0)) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={pendingMedicines.length === 0 && (!medicineName || !dosage || selectedMeal.length === 0)}
                    >
                        <Text style={styles.submitButtonText}>
                            {editingMedicine ? 'Save Changes' : `Complete Prescription (${pendingMedicines.length + (medicineName && dosage && selectedMeal.length > 0 ? 1 : 0)})`}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Patient Search Screen (default)
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>🔍 Find Patient</Text>
                <Text style={styles.subtitle}>Search by name or phone number</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.searchSection}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Enter patient name or phone..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearch}
                        disabled={!searchQuery}
                    >
                        <Text style={styles.searchButtonText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.resultsTitle}>
                            Found {searchResults.length} patient{searchResults.length > 1 ? 's' : ''}
                        </Text>
                        {searchResults.map(patient => (
                            <TouchableOpacity
                                key={patient.id}
                                style={styles.patientCard}
                                onPress={() => handleSelectPatient(patient)}
                            >
                                <View style={styles.patientInfo}>
                                    <Text style={styles.patientName}>{patient.name}</Text>
                                    <Text style={styles.patientDetails}>
                                        {patient.phone} • {patient.age} years old
                                    </Text>
                                    <Text style={styles.patientMedicines}>
                                        Current medicines: {patient.medicinesCount}
                                    </Text>
                                </View>
                                <Text style={styles.selectIcon}>→</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* No Results */}
                {searchQuery && searchResults.length === 0 && (
                    <View style={styles.noResultsCard}>
                        <Text style={styles.noResultsIcon}>🔍</Text>
                        <Text style={styles.noResultsTitle}>No patients found</Text>
                        <Text style={styles.noResultsText}>
                            Patient "{searchQuery}" is not registered in the system.
                        </Text>
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => {
                                (navigation as any).navigate('Register');
                            }}
                        >
                            <Text style={styles.registerButtonText}>
                                ➕ Register New Patient
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Initial State */}
                {!searchQuery && searchResults.length === 0 && (
                    <View style={styles.initialState}>
                        <Text style={styles.initialIcon}>👥</Text>
                        <Text style={styles.initialTitle}>Search for a Patient</Text>
                        <Text style={styles.initialText}>
                            Enter patient name or phone number to find existing patients
                        </Text>
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        <TouchableOpacity
                            style={styles.newPatientButton}
                            onPress={() => {
                                (navigation as any).navigate('Register');
                            }}
                        >
                            <Text style={styles.newPatientButtonText}>
                                ➕ Register New Patient
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginBottom: 12,
    },
    backText: {
        fontSize: 16,
        color: '#3B82F6',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    searchSection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resultsSection: {
        marginBottom: 20,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    patientCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    patientDetails: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    patientMedicines: {
        fontSize: 12,
        color: '#3B82F6',
    },
    selectIcon: {
        fontSize: 24,
        color: '#3B82F6',
    },
    noResultsCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    noResultsIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    noResultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 8,
    },
    noResultsText: {
        fontSize: 14,
        color: '#92400E',
        textAlign: 'center',
        marginBottom: 16,
    },
    registerButton: {
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    initialState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    initialIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    initialTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    initialText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    newPatientButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    newPatientButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Medicine form styles
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quickSelectLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        marginBottom: 8,
    },
    quickSelectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    quickSelectButton: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    quickSelectText: {
        fontSize: 12,
        color: '#1E40AF',
    },
    mealsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    mealCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        aspectRatio: 1, // Make cards square
    },
    mealCardSelected: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
    },
    mealIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    mealLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 4,
    },
    mealLabelSelected: {
        color: '#065F46',
    },
    relationsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    relationButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    relationButtonSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    relationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    relationTextSelected: {
        color: '#FFFFFF',
    },
    submitButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    successListItem: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 4,
    },
    pendingListContainer: {
        marginBottom: 20,
    },
    sectionHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 1,
    },
    pendingItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    pendingItemThumb: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
    },
    pendingItemThumbPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingItemInfo: {
        flex: 1,
    },
    pendingItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    pendingItemDetails: {
        fontSize: 12,
        color: '#6B7280',
    },
    removeButton: {
        padding: 8,
    },
    removeButtonText: {
        color: '#EF4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    addToListButton: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#3B82F6',
        borderStyle: 'dashed',
    },
    addToListButtonDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
    },
    addToListButtonText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: 'bold',
    },
    successList: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    photoContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        marginBottom: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPlaceholder: {
        alignItems: 'center',
    },
    photoIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    photoText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    medPhoto: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        alignItems: 'center',
    },
    photoOverlayText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mealCardContainer: {
        width: '48%',
        marginBottom: 20,
    },
    timeInputContainer: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    timeInput: {
        fontSize: 16,
        color: '#1E40AF',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    suggestionsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 200,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    suggestionPhotoThumbnail: {
        width: 30,
        height: 30,
        borderRadius: 4,
        marginRight: 10,
    },
    suggestionPhotoPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionText: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    suggestionHint: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '600',
    },
});
