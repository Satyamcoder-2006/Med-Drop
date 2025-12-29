import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import dbManager from '../database/DatabaseManager';
import theme from '../styles/theme';
import CONSTANTS from '../config/constants';

const AddMedicineScreen = ({ route, navigation }) => {
    const { patientId } = route.params;

    const [medicineName, setMedicineName] = useState('');
    const [medicineImage, setMedicineImage] = useState(null);
    const [selectedColor, setSelectedColor] = useState('blue');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('morning');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [durationDays, setDurationDays] = useState('7');
    const [pillsPerDose, setPillsPerDose] = useState('1');
    const [totalPills, setTotalPills] = useState('14');

    const colors = [
        { id: 'red', color: theme.colors.medicineRed, label: 'Red' },
        { id: 'blue', color: theme.colors.medicineBlue, label: 'Blue' },
        { id: 'green', color: theme.colors.medicineGreen, label: 'Green' },
        { id: 'yellow', color: theme.colors.medicineYellow, label: 'Yellow' },
        { id: 'purple', color: theme.colors.medicinePurple, label: 'Purple' },
        { id: 'orange', color: theme.colors.medicineOrange, label: 'Orange' },
        { id: 'pink', color: theme.colors.medicinePink, label: 'Pink' }
    ];

    const timeSlots = Object.values(CONSTANTS.TIME_SLOTS);

    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        return status === 'granted';
    };

    const takePicture = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7
        });

        if (!result.canceled) {
            setMedicineImage(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7
        });

        if (!result.canceled) {
            setMedicineImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!medicineName.trim()) {
            Alert.alert('Required', 'Please enter medicine name');
            return;
        }

        try {
            const now = Math.floor(Date.now() / 1000);
            const duration = parseInt(durationDays) || 7;

            await dbManager.createMedicine({
                patientId: patientId,
                name: medicineName,
                imageUri: medicineImage,
                color: selectedColor,
                timeSlot: selectedTimeSlot,
                scheduledTime: scheduledTime,
                durationDays: duration,
                startDate: now,
                endDate: now + (duration * 24 * 60 * 60),
                pillsPerDose: parseInt(pillsPerDose) || 1,
                totalPills: parseInt(totalPills) || null
            });

            Alert.alert('Success', 'Medicine added successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error adding medicine:', error);
            Alert.alert('Error', 'Failed to add medicine');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Add Medicine</Text>

                {/* Medicine Photo */}
                <View style={styles.section}>
                    <Text style={styles.label}>Medicine Photo</Text>

                    {medicineImage ? (
                        <View style={styles.imagePreview}>
                            <Image source={{ uri: medicineImage }} style={styles.image} />
                            <TouchableOpacity
                                style={styles.changePhotoButton}
                                onPress={pickImage}
                            >
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.photoButtons}>
                            <TouchableOpacity style={styles.photoButton} onPress={takePicture}>
                                <Text style={styles.photoButtonIcon}>📷</Text>
                                <Text style={styles.photoButtonText}>Take Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                                <Text style={styles.photoButtonIcon}>🖼️</Text>
                                <Text style={styles.photoButtonText}>Choose Photo</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Medicine Name */}
                <View style={styles.section}>
                    <Text style={styles.label}>Medicine Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={medicineName}
                        onChangeText={setMedicineName}
                        placeholder="e.g., Aspirin"
                        placeholderTextColor={theme.colors.textLight}
                    />
                </View>

                {/* Color Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>Color Label</Text>
                    <View style={styles.colorGrid}>
                        {colors.map((color) => (
                            <TouchableOpacity
                                key={color.id}
                                style={[
                                    styles.colorButton,
                                    { backgroundColor: color.color },
                                    selectedColor === color.id && styles.colorButtonSelected
                                ]}
                                onPress={() => setSelectedColor(color.id)}
                            >
                                {selectedColor === color.id && (
                                    <Text style={styles.colorCheckmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Time Slot */}
                <View style={styles.section}>
                    <Text style={styles.label}>When to take?</Text>
                    <View style={styles.timeSlotGrid}>
                        {timeSlots.map((slot) => (
                            <TouchableOpacity
                                key={slot.id}
                                style={[
                                    styles.timeSlotButton,
                                    selectedTimeSlot === slot.id && styles.timeSlotButtonSelected
                                ]}
                                onPress={() => {
                                    setSelectedTimeSlot(slot.id);
                                    setScheduledTime(slot.hours[0] + ':00');
                                }}
                            >
                                <Text style={styles.timeSlotIcon}>
                                    {slot.id === 'morning' && '☀️'}
                                    {slot.id === 'afternoon' && '🌤️'}
                                    {slot.id === 'evening' && '🌅'}
                                    {slot.id === 'night' && '🌙'}
                                </Text>
                                <Text style={styles.timeSlotText}>{slot.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Exact Time */}
                <View style={styles.section}>
                    <Text style={styles.label}>Exact Time</Text>
                    <TextInput
                        style={styles.input}
                        value={scheduledTime}
                        onChangeText={setScheduledTime}
                        placeholder="HH:MM (e.g., 09:00)"
                        placeholderTextColor={theme.colors.textLight}
                    />
                </View>

                {/* Duration */}
                <View style={styles.section}>
                    <Text style={styles.label}>How many days?</Text>
                    <TextInput
                        style={styles.input}
                        value={durationDays}
                        onChangeText={setDurationDays}
                        placeholder="Number of days"
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.textLight}
                    />
                </View>

                {/* Pills Info */}
                <View style={styles.row}>
                    <View style={[styles.section, { flex: 1, marginRight: theme.spacing.sm }]}>
                        <Text style={styles.label}>Pills per dose</Text>
                        <TextInput
                            style={styles.input}
                            value={pillsPerDose}
                            onChangeText={setPillsPerDose}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.textLight}
                        />
                    </View>

                    <View style={[styles.section, { flex: 1, marginLeft: theme.spacing.sm }]}>
                        <Text style={styles.label}>Total pills</Text>
                        <TextInput
                            style={styles.input}
                            value={totalPills}
                            onChangeText={setTotalPills}
                            keyboardType="numeric"
                            placeholder="Optional"
                            placeholderTextColor={theme.colors.textLight}
                        />
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Medicine</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    content: {
        padding: theme.spacing.lg
    },
    title: {
        fontSize: theme.typography.fontSize3XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xl,
        textAlign: 'center'
    },
    section: {
        marginBottom: theme.spacing.lg
    },
    label: {
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightSemiBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm
    },
    input: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.text,
        minHeight: theme.minTapTarget
    },
    photoButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md
    },
    photoButton: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        alignItems: 'center',
        minHeight: theme.minTapTarget
    },
    photoButtonIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.sm
    },
    photoButtonText: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightSemiBold,
        color: theme.colors.text
    },
    imagePreview: {
        alignItems: 'center'
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md
    },
    changePhotoButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md
    },
    changePhotoText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md
    },
    colorButton: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent'
    },
    colorButtonSelected: {
        borderColor: theme.colors.text,
        borderWidth: 4
    },
    colorCheckmark: {
        fontSize: 32,
        color: theme.colors.textInverse
    },
    timeSlotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md
    },
    timeSlotButton: {
        width: '48%',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 3,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        alignItems: 'center',
        minHeight: theme.minTapTarget
    },
    timeSlotButtonSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    timeSlotIcon: {
        fontSize: 40,
        marginBottom: theme.spacing.xs
    },
    timeSlotText: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    row: {
        flexDirection: 'row'
    },
    saveButton: {
        backgroundColor: theme.colors.success,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        minHeight: theme.minTapTarget,
        ...theme.shadows.lg
    },
    saveButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold
    }
});

export default AddMedicineScreen;
