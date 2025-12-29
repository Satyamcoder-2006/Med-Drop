// Common utility functions

/**
 * Format timestamp to readable date/time
 */
export const formatDate = (timestamp, locale = 'en-IN') => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatTime = (timestamp, locale = 'en-IN') => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatDateTime = (timestamp, locale = 'en-IN') => {
    return `${formatDate(timestamp, locale)} ${formatTime(timestamp, locale)}`;
};

/**
 * Format time string (HH:MM) to readable format
 */
export const formatTimeString = (timeString, locale = 'en-IN') => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Get time slot from hour
 */
export const getTimeSlotFromHour = (hour) => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

/**
 * Calculate days between two timestamps
 */
export const daysBetween = (timestamp1, timestamp2) => {
    const diff = Math.abs(timestamp2 - timestamp1);
    return Math.floor(diff / (24 * 60 * 60));
};

/**
 * Check if medicine is due today
 */
export const isMedicineDueToday = (medicine) => {
    const now = Math.floor(Date.now() / 1000);
    return medicine.start_date <= now && medicine.end_date >= now;
};

/**
 * Calculate pills remaining
 */
export const calculatePillsRemaining = (medicine, adherenceLogs) => {
    if (!medicine.total_pills) return null;

    const takenCount = adherenceLogs.filter(
        log => log.medicine_id === medicine.id && log.status === 'taken'
    ).length;

    const pillsUsed = takenCount * (medicine.pills_per_dose || 1);
    return Math.max(0, medicine.total_pills - pillsUsed);
};

/**
 * Calculate days until pills run out
 */
export const daysUntilRefill = (medicine, adherenceLogs) => {
    const pillsRemaining = calculatePillsRemaining(medicine, adherenceLogs);
    if (pillsRemaining === null) return null;

    const pillsPerDay = medicine.pills_per_dose || 1;
    return Math.floor(pillsRemaining / pillsPerDay);
};

/**
 * Generate risk score color
 */
export const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
        case 'green':
            return '#10B981';
        case 'yellow':
            return '#F59E0B';
        case 'red':
            return '#EF4444';
        default:
            return '#6B7280';
    }
};

/**
 * Format SMS message (no medicine names for privacy)
 */
export const formatSMSMessage = (patientName, code, language = 'en-IN') => {
    const messages = {
        'hi-IN': `${patientName} को दवा लेने की याद दिलाएं। कोड: ${code}`,
        'en-IN': `Remind ${patientName} to take medicine. Code: ${code}`
    };
    return messages[language] || messages['en-IN'];
};

/**
 * Generate random code for SMS
 */
export const generateMedicineCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
};

/**
 * Calculate adherence percentage
 */
export const calculateAdherencePercentage = (taken, total) => {
    if (total === 0) return 0;
    return Math.round((taken / total) * 100);
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = (language = 'en-IN') => {
    const hour = new Date().getHours();

    const greetings = {
        'hi-IN': {
            morning: 'सुप्रभात',
            afternoon: 'नमस्ते',
            evening: 'शुभ संध्या',
            night: 'शुभ रात्रि'
        },
        'en-IN': {
            morning: 'Good Morning',
            afternoon: 'Good Afternoon',
            evening: 'Good Evening',
            night: 'Good Night'
        }
    };

    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    return greetings[language]?.[timeOfDay] || greetings['en-IN'][timeOfDay];
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (timestamp, language = 'en-IN') => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    const strings = {
        'hi-IN': {
            justNow: 'अभी',
            minutesAgo: (m) => `${m} मिनट पहले`,
            hoursAgo: (h) => `${h} घंटे पहले`,
            daysAgo: (d) => `${d} दिन पहले`
        },
        'en-IN': {
            justNow: 'Just now',
            minutesAgo: (m) => `${m} minute${m > 1 ? 's' : ''} ago`,
            hoursAgo: (h) => `${h} hour${h > 1 ? 's' : ''} ago`,
            daysAgo: (d) => `${d} day${d > 1 ? 's' : ''} ago`
        }
    };

    const lang = strings[language] || strings['en-IN'];

    if (diff < 60) return lang.justNow;
    if (minutes < 60) return lang.minutesAgo(minutes);
    if (hours < 24) return lang.hoursAgo(hours);
    return lang.daysAgo(days);
};

export default {
    formatDate,
    formatTime,
    formatDateTime,
    formatTimeString,
    getTimeSlotFromHour,
    daysBetween,
    isMedicineDueToday,
    calculatePillsRemaining,
    daysUntilRefill,
    getRiskColor,
    formatSMSMessage,
    generateMedicineCode,
    isValidPhoneNumber,
    formatPhoneNumber,
    calculateAdherencePercentage,
    getGreeting,
    truncateText,
    debounce,
    getRelativeTime
};
