import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import theme from '../styles/theme';

const PrescriptionScannerScreen = ({ route, navigation }) => {
    const { patientId } = route.params;
    const [prescriptionImage, setPrescriptionImage] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const takePicture = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1
        });

        if (!result.canceled) {
            setPrescriptionImage(result.assets[0].uri);
            await processImage(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1
        });

        if (!result.canceled) {
            setPrescriptionImage(result.assets[0].uri);
            await processImage(result.assets[0].uri);
        }
    };

    const processImage = async (imageUri) => {
        setIsProcessing(true);

        // TODO: Implement OCR using Google ML Kit or similar
        // For now, show a placeholder message
        setTimeout(() => {
            setExtractedText('OCR processing will be implemented here.\n\nThis feature requires:\n- Google ML Kit integration\n- Text recognition model\n- Medicine name extraction\n- Dosage parsing');
            setIsProcessing(false);
        }, 1500);
    };

    const handleManualEntry = () => {
        navigation.navigate('AddMedicine', { patientId });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Scan Prescription</Text>
                <Text style={styles.subtitle}>
                    Take a photo of your prescription or upload an image
                </Text>

                {!prescriptionImage ? (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={takePicture}>
                            <Text style={styles.actionIcon}>📷</Text>
                            <Text style={styles.actionText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
                            <Text style={styles.actionIcon}>🖼️</Text>
                            <Text style={styles.actionText}>Choose Photo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultTitle}>
                            {isProcessing ? 'Processing...' : 'Extracted Information'}
                        </Text>

                        {isProcessing ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>⏳ Analyzing prescription...</Text>
                            </View>
                        ) : (
                            <View style={styles.extractedTextContainer}>
                                <Text style={styles.extractedText}>{extractedText}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setPrescriptionImage(null);
                                setExtractedText('');
                            }}
                        >
                            <Text style={styles.retryButtonText}>Scan Another</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                    style={styles.manualButton}
                    onPress={handleManualEntry}
                >
                    <Text style={styles.manualButtonText}>Enter Manually</Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>💡 Tips for best results:</Text>
                    <Text style={styles.infoText}>• Use good lighting</Text>
                    <Text style={styles.infoText}>• Keep prescription flat</Text>
                    <Text style={styles.infoText}>• Avoid shadows and glare</Text>
                    <Text style={styles.infoText}>• Ensure text is clear and readable</Text>
                </View>
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
        textAlign: 'center',
        marginBottom: theme.spacing.sm
    },
    subtitle: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        minHeight: theme.minTapTarget * 2,
        ...theme.shadows.md
    },
    actionIcon: {
        fontSize: 64,
        marginBottom: theme.spacing.md
    },
    actionText: {
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.textInverse
    },
    resultContainer: {
        marginBottom: theme.spacing.xl
    },
    resultTitle: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md
    },
    loadingContainer: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center'
    },
    loadingText: {
        fontSize: theme.typography.fontSizeLG,
        color: theme.colors.textSecondary
    },
    extractedTextContainer: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md
    },
    extractedText: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.text,
        lineHeight: 24
    },
    retryButton: {
        backgroundColor: theme.colors.textSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center'
    },
    retryButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: theme.spacing.xl
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border
    },
    dividerText: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginHorizontal: theme.spacing.md,
        fontWeight: theme.typography.fontWeightBold
    },
    manualButton: {
        backgroundColor: theme.colors.success,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        minHeight: theme.minTapTarget,
        ...theme.shadows.md
    },
    manualButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold
    },
    infoBox: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary
    },
    infoTitle: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm
    },
    infoText: {
        fontSize: theme.typography.fontSizeMD,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs
    }
});

export default PrescriptionScannerScreen;
