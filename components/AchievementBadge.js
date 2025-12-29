import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../styles/theme';

const AchievementBadge = ({ type, achieved = false }) => {
    const badges = {
        first_dose: {
            icon: '🎯',
            title: 'First Step',
            description: 'Took your first medicine'
        },
        week_streak: {
            icon: '🔥',
            title: '7-Day Streak',
            description: 'Perfect adherence for 7 days'
        },
        month_streak: {
            icon: '⭐',
            title: '30-Day Champion',
            description: 'Perfect adherence for 30 days'
        },
        perfect_week: {
            icon: '💯',
            title: 'Perfect Week',
            description: 'All medicines taken on time'
        },
        early_bird: {
            icon: '🌅',
            title: 'Early Bird',
            description: 'Took morning medicine on time 7 days'
        },
        consistent: {
            icon: '📊',
            title: 'Consistent',
            description: '90% adherence for 30 days'
        }
    };

    const badge = badges[type] || badges.first_dose;

    return (
        <View style={[styles.container, !achieved && styles.locked]}>
            <Text style={[styles.icon, !achieved && styles.lockedIcon]}>
                {achieved ? badge.icon : '🔒'}
            </Text>
            <Text style={[styles.title, !achieved && styles.lockedText]}>
                {badge.title}
            </Text>
            <Text style={[styles.description, !achieved && styles.lockedText]}>
                {badge.description}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 120,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        margin: theme.spacing.sm,
        ...theme.shadows.md
    },
    locked: {
        opacity: 0.5,
        backgroundColor: theme.colors.backgroundSecondary
    },
    icon: {
        fontSize: 48,
        marginBottom: theme.spacing.sm
    },
    lockedIcon: {
        fontSize: 32
    },
    title: {
        fontSize: theme.typography.fontSizeMD,
        fontWeight: theme.typography.fontWeightBold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.xs
    },
    description: {
        fontSize: theme.typography.fontSizeSM,
        color: theme.colors.textSecondary,
        textAlign: 'center'
    },
    lockedText: {
        color: theme.colors.textLight
    }
});

export default AchievementBadge;
