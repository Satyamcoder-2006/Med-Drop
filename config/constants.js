// App configuration constants
export const CONSTANTS = {
  // Supported languages
  LANGUAGES: {
    HINDI: { code: 'hi-IN', name: 'हिंदी', voice: 'hi-IN' },
    TAMIL: { code: 'ta-IN', name: 'தமிழ்', voice: 'ta-IN' },
    TELUGU: { code: 'te-IN', name: 'తెలుగు', voice: 'te-IN' },
    BENGALI: { code: 'bn-IN', name: 'বাংলা', voice: 'bn-IN' },
    MARATHI: { code: 'mr-IN', name: 'मराठी', voice: 'mr-IN' },
    ENGLISH: { code: 'en-IN', name: 'English', voice: 'en-IN' }
  },

  // Notification schedules (in minutes)
  NOTIFICATION_TIMING: {
    FIRST_REMINDER: 0, // At medicine time
    SECOND_REMINDER: 30, // 30 minutes after
    CAREGIVER_ALERT: 120 // 2 hours after if still missed
  },

  // Risk scoring thresholds
  RISK_THRESHOLDS: {
    SILENCE_HOURS: 24,
    CONSECUTIVE_MISSES: 2,
    SUDDEN_STOP_DAYS: 3,
    ADHERENCE_DAYS_BEFORE_STOP: 5
  },

  // Risk levels
  RISK_LEVELS: {
    GREEN: { level: 'green', label: 'Good', score: 0 },
    YELLOW: { level: 'yellow', label: 'At Risk', score: 1 },
    RED: { level: 'red', label: 'High Risk', score: 2 }
  },

  // Medicine time slots
  TIME_SLOTS: {
    MORNING: { id: 'morning', icon: 'sun', label: 'Morning', hours: [6, 7, 8, 9, 10] },
    AFTERNOON: { id: 'afternoon', icon: 'sun-high', label: 'Afternoon', hours: [12, 13, 14, 15] },
    EVENING: { id: 'evening', icon: 'sunset', label: 'Evening', hours: [17, 18, 19, 20] },
    NIGHT: { id: 'night', icon: 'moon', label: 'Night', hours: [21, 22, 23, 0] }
  },

  // Symptom types
  SYMPTOMS: {
    NAUSEA: { id: 'nausea', icon: 'stomach', label: 'Stomach upset' },
    DIZZY: { id: 'dizzy', icon: 'dizzy', label: 'Feeling dizzy' },
    RASH: { id: 'rash', icon: 'rash', label: 'Skin rash' },
    WEAKNESS: { id: 'weakness', icon: 'weakness', label: 'Weakness' },
    OTHER: { id: 'other', icon: 'other', label: 'Something else' }
  },

  // Adherence status
  ADHERENCE_STATUS: {
    TAKEN: 'taken',
    MISSED: 'missed',
    UNWELL: 'unwell'
  },

  // Refill alert days before running out
  REFILL_ALERT_DAYS: 3,

  // Voice recording max duration (seconds)
  MAX_VOICE_RECORDING_DURATION: 30,

  // Gamification
  ACHIEVEMENT_THRESHOLDS: {
    WEEKLY_STREAK: 7,
    MONTHLY_STREAK: 30,
    PERFECT_WEEK: 7,
    COMEBACK: 3 // Days of adherence after missing
  }
};

export default CONSTANTS;
