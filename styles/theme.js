// Design system theme
export const theme = {
    // High-contrast colors for outdoor visibility
    colors: {
        // Primary colors
        primary: '#2563EB', // Blue
        primaryDark: '#1E40AF',
        primaryLight: '#60A5FA',

        // Status colors
        success: '#10B981', // Green
        successDark: '#059669',
        warning: '#F59E0B', // Yellow/Orange
        warningDark: '#D97706',
        danger: '#EF4444', // Red
        dangerDark: '#DC2626',

        // Risk levels
        riskGreen: '#10B981',
        riskYellow: '#F59E0B',
        riskRed: '#EF4444',

        // Medicine colors (for color-coding)
        medicineRed: '#EF4444',
        medicineBlue: '#3B82F6',
        medicineGreen: '#10B981',
        medicineYellow: '#F59E0B',
        medicinePurple: '#8B5CF6',
        medicineOrange: '#F97316',
        medicinePink: '#EC4899',

        // Neutral colors
        background: '#FFFFFF',
        backgroundSecondary: '#F3F4F6',
        backgroundDark: '#1F2937',

        text: '#111827',
        textSecondary: '#6B7280',
        textLight: '#9CA3AF',
        textInverse: '#FFFFFF',

        border: '#D1D5DB',
        borderLight: '#E5E7EB',

        // Overlay
        overlay: 'rgba(0, 0, 0, 0.5)',
        overlayLight: 'rgba(0, 0, 0, 0.3)'
    },

    // Typography - Large, readable fonts
    typography: {
        // Font sizes
        fontSizeXS: 12,
        fontSizeSM: 14,
        fontSizeMD: 16,
        fontSizeLG: 20,
        fontSizeXL: 24,
        fontSize2XL: 32,
        fontSize3XL: 40,
        fontSize4XL: 48,

        // Font weights
        fontWeightRegular: '400',
        fontWeightMedium: '500',
        fontWeightSemiBold: '600',
        fontWeightBold: '700',

        // Line heights
        lineHeightTight: 1.2,
        lineHeightNormal: 1.5,
        lineHeightRelaxed: 1.75
    },

    // Spacing system (multiples of 4)
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
        xxxl: 64
    },

    // Border radius
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
        full: 9999
    },

    // Shadows and elevation
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8
        }
    },

    // Minimum tap target size (accessibility)
    minTapTarget: 64,

    // Animation durations
    animation: {
        fast: 150,
        normal: 300,
        slow: 500
    }
};

export default theme;
