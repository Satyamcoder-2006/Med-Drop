import { StyleSheet } from 'react-native';
import theme from './theme';

// Global reusable styles
export const globalStyles = StyleSheet.create({
    // Container styles
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    containerCentered: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center'
    },
    containerPadded: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md
    },

    // Large tap targets for accessibility (minimum 64x64)
    tapTarget: {
        minWidth: theme.minTapTarget,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Button styles
    buttonPrimary: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    buttonSuccess: {
        backgroundColor: theme.colors.success,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    buttonWarning: {
        backgroundColor: theme.colors.warning,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    buttonDanger: {
        backgroundColor: theme.colors.danger,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        minHeight: theme.minTapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md
    },
    buttonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightBold
    },

    // Card styles
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.md
    },
    cardLarge: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        ...theme.shadows.lg
    },

    // Text styles
    textHeading: {
        fontSize: theme.typography.fontSize2XL,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text
    },
    textSubheading: {
        fontSize: theme.typography.fontSizeXL,
        fontWeight: theme.typography.fontWeightSemiBold,
        color: theme.colors.text
    },
    textBody: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightRegular,
        color: theme.colors.text
    },
    textBodyLarge: {
        fontSize: theme.typography.fontSizeLG,
        fontWeight: theme.typography.fontWeightRegular,
        color: theme.colors.text
    },
    textSecondary: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightRegular,
        color: theme.colors.textSecondary
    },

    // Layout helpers
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    rowSpaceBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    column: {
        flexDirection: 'column'
    },

    // Spacing helpers
    marginBottomSM: { marginBottom: theme.spacing.sm },
    marginBottomMD: { marginBottom: theme.spacing.md },
    marginBottomLG: { marginBottom: theme.spacing.lg },
    marginTopSM: { marginTop: theme.spacing.sm },
    marginTopMD: { marginTop: theme.spacing.md },
    marginTopLG: { marginTop: theme.spacing.lg },

    // Emergency SOS button (always visible, prominent)
    sosButton: {
        position: 'absolute',
        bottom: theme.spacing.lg,
        right: theme.spacing.lg,
        backgroundColor: theme.colors.danger,
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.xl
    }
});

export default globalStyles;
