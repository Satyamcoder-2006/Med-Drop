import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import theme from '../styles/theme';
import { formatTimeString } from '../utils/helpers';

const MedicineCard = ({ medicine, onTaken, onMissed, onUnwell, isAnimating = false }) => {
    const animatedValue = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isAnimating) {
            // Pulse animation for medicine time
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            animatedValue.setValue(1);
        }
    }, [isAnimating]);

    // Get border color based on medicine color
    const getBorderColor = () => {
        const colorMap = {
            red: theme.colors.medicineRed,
            blue: theme.colors.medicineBlue,
            green: theme.colors.medicineGreen,
            yellow: theme.colors.medicineYellow,
            purple: theme.colors.medicinePurple,
            orange: theme.colors.medicineOrange,
            pink: theme.colors.medicinePink
        };
        return colorMap[medicine.color] || theme.colors.primary;
    };

    // Get time slot icon
    const getTimeSlotIcon = () => {
        const icons = {
            morning: '☀️',
            afternoon: '🌤️',
            evening: '🌅',
            night: '🌙'
        };
        return icons[medicine.time_slot] || '⏰';
    };

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    borderColor: getBorderColor(),
                    transform: [{ scale: animatedValue }]
                }
            ]}
        >
            {/* Medicine Image */}
            <View style={styles.imageContainer}>
                {medicine.image_uri ? (
                    <Image
                        source={{ uri: medicine.image_uri }}
                        style={styles.medicineImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: getBorderColor() }]}>
                        <Text style={styles.placeholderText}>💊</Text>
                    </View>
                )}

                {/* Time indicator badge */}
                <View style={styles.timeBadge}>
                    <Text style={styles.timeIcon}>{getTimeSlotIcon()}</Text>
                </View>
            </View>

            {/* Medicine Name (optional, can be hidden for zero-literacy) */}
            <Text style={styles.medicineName} numberOfLines={2}>
                {medicine.name}
            </Text>

            {/* Scheduled Time */}
            <Text style={styles.scheduledTime}>
                {formatTimeString(medicine.scheduled_time)}
            </Text>

            {/* Action Buttons - Large tap targets */}
            <View style={styles.buttonContainer}>
                {/* Took It - Green */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.tookButton]}
                    onPress={onTaken}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonIcon}>✓</Text>
                    <Text style={styles.buttonText}>Took it</Text>
                </TouchableOpacity>

                {/* Missed - Yellow */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.missedButton]}
                    onPress={onMissed}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonIcon}>✗</Text>
                    <Text style={styles.buttonText}>Missed</Text>
                </TouchableOpacity>

                {/* Felt Unwell - Red */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.unwellButton]}
                    onPress={onUnwell}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonIcon}>⚠</Text>
                    <Text style={styles.buttonText}>Unwell</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 4,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.lg
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        position: 'relative'
    },
    medicineImage: {
        width: 180,
        height: 180,
        borderRadius: theme.borderRadius.lg
    },
    placeholderImage: {
        width: 180,
        height: 180,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center'
    },
    placeholderText: {
        fontSize: 80
    },
    timeBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.full,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    timeIcon: {
        fontSize: 28
    },
    medicineName: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.xs
    },
    scheduledTime: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.primary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.sm
    },
    actionButton: {
        flex: 1,
        minHeight: theme.minTapTarget,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        ...theme.shadows.md
    },
    tookButton: {
        backgroundColor: theme.colors.success
    },
    missedButton: {
        backgroundColor: theme.colors.warning
    },
    unwellButton: {
        backgroundColor: theme.colors.danger
    },
    buttonIcon: {
        fontSize: 32,
        marginBottom: 4
    },
    buttonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold
    }
});

export default MedicineCard;
