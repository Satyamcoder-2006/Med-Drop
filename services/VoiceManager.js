import * as Speech from 'expo-speech';
import CONSTANTS from '../config/constants';

class VoiceManager {
    constructor() {
        this.isSpeaking = false;
        this.currentLanguage = 'hi-IN';
    }

    /**
     * Set the current language for voice prompts
     */
    setLanguage(languageCode) {
        this.currentLanguage = languageCode;
    }

    /**
     * Speak text in the current language
     */
    async speak(text, options = {}) {
        if (this.isSpeaking) {
            await this.stop();
        }

        const speechOptions = {
            language: this.currentLanguage,
            pitch: 1.0,
            rate: 0.85, // Slightly slower for clarity
            ...options
        };

        return new Promise((resolve, reject) => {
            this.isSpeaking = true;

            Speech.speak(text, {
                ...speechOptions,
                onDone: () => {
                    this.isSpeaking = false;
                    resolve();
                },
                onError: (error) => {
                    this.isSpeaking = false;
                    reject(error);
                }
            });
        });
    }

    /**
     * Stop current speech
     */
    async stop() {
        await Speech.stop();
        this.isSpeaking = false;
    }

    /**
     * Check if currently speaking
     */
    getSpeakingStatus() {
        return this.isSpeaking;
    }

    // ========== PRE-DEFINED VOICE PROMPTS ==========

    /**
     * Medicine time reminder
     */
    async speakMedicineReminder(medicineName, timeSlot) {
        const messages = {
            'hi-IN': `दवा लेने का समय हो गया है। ${medicineName} लें।`,
            'ta-IN': `மருந்து எடுக்கும் நேரம். ${medicineName} எடுங்கள்.`,
            'te-IN': `మందు తీసుకునే సమయం. ${medicineName} తీసుకోండి.`,
            'bn-IN': `ওষুধ খাওয়ার সময়। ${medicineName} খান।`,
            'mr-IN': `औषध घेण्याची वेळ झाली आहे। ${medicineName} घ्या।`,
            'en-IN': `It's time to take your medicine. Take ${medicineName}.`
        };

        const message = messages[this.currentLanguage] || messages['en-IN'];
        await this.speak(message);
    }

    /**
     * Missed medicine reminder (30 min follow-up)
     */
    async speakMissedReminder(medicineName) {
        const messages = {
            'hi-IN': `आपने अभी तक ${medicineName} नहीं ली है। कृपया अभी लें।`,
            'ta-IN': `நீங்கள் இன்னும் ${medicineName} எடுக்கவில்லை. தயவுசெய்து இப்போது எடுங்கள்.`,
            'te-IN': `మీరు ఇంకా ${medicineName} తీసుకోలేదు. దయచేసి ఇప్పుడు తీసుకోండి.`,
            'bn-IN': `আপনি এখনও ${medicineName} খাননি। অনুগ্রহ করে এখন খান।`,
            'mr-IN': `तुम्ही अजून ${medicineName} घेतले नाही. कृपया आता घ्या।`,
            'en-IN': `You haven't taken ${medicineName} yet. Please take it now.`
        };

        const message = messages[this.currentLanguage] || messages['en-IN'];
        await this.speak(message);
    }

    /**
     * Evening summary
     */
    async speakEveningSummary(taken, total) {
        const messages = {
            'hi-IN': `आज आपने ${total} में से ${taken} दवाएं लीं।`,
            'ta-IN': `இன்று நீங்கள் ${total} மருந்துகளில் ${taken} எடுத்தீர்கள்.`,
            'te-IN': `ఈరోజు మీరు ${total} మందులలో ${taken} తీసుకున్నారు.`,
            'bn-IN': `আজ আপনি ${total} টির মধ্যে ${taken} টি ওষুধ খেয়েছেন।`,
            'mr-IN': `आज तुम्ही ${total} पैकी ${taken} औषधे घेतलीत।`,
            'en-IN': `Today you took ${taken} out of ${total} medicines.`
        };

        const message = messages[this.currentLanguage] || messages['en-IN'];
        await this.speak(message);
    }

    /**
     * Weekly encouragement
     */
    async speakWeeklyEncouragement(daysCompleted) {
        const messages = {
            'hi-IN': `बहुत अच्छा! आपने ${daysCompleted} दिन तक नियमित रूप से दवाएं लीं।`,
            'ta-IN': `மிகவும் நன்று! நீங்கள் ${daysCompleted} நாட்கள் மருந்துகளை எடுத்தீர்கள்.`,
            'te-IN': `చాలా బాగుంది! మీరు ${daysCompleted} రోజులు మందులు తీసుకున్నారు.`,
            'bn-IN': `খুব ভালো! আপনি ${daysCompleted} দিন ওষুধ খেয়েছেন।`,
            'mr-IN': `खूप छान! तुम्ही ${daysCompleted} दिवस औषधे घेतलीत।`,
            'en-IN': `Great job! You've taken your medicines for ${daysCompleted} days.`
        };

        const message = messages[this.currentLanguage] || messages['en-IN'];
        await this.speak(message);
    }

    /**
     * Onboarding welcome
     */
    async speakWelcome() {
        const messages = {
            'hi-IN': 'मेड ड्रॉप में आपका स्वागत है। यह ऐप आपको दवाएं समय पर लेने में मदद करेगा।',
            'ta-IN': 'மெட் டிராப்பில் உங்களை வரவேற்கிறோம். இந்த ஆப் உங்கள் மருந்துகளை சரியான நேரத்தில் எடுக்க உதவும்.',
            'te-IN': 'మెడ్ డ్రాప్‌కు స్వాగతం. ఈ యాప్ మీ మందులను సమయానికి తీసుకోవడంలో సహాయపడుతుంది.',
            'bn-IN': 'মেড ড্রপে স্বাগতম। এই অ্যাপ আপনাকে সময়মতো ওষুধ খেতে সাহায্য করবে।',
            'mr-IN': 'मेड ड्रॉपमध्ये आपले स्वागत आहे. हे अॅप तुम्हाला वेळेवर औषधे घेण्यास मदत करेल।',
            'en-IN': 'Welcome to Med Drop. This app will help you take your medicines on time.'
        };

        const message = messages[this.currentLanguage] || messages['en-IN'];
        await this.speak(message);
    }

    /**
     * Voice assistant - answer simple queries
     */
    async answerQuery(query) {
        // Simple keyword-based responses
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('next') || lowerQuery.includes('अगली')) {
            const messages = {
                'hi-IN': 'मैं आपकी अगली दवा का समय बता रहा हूं।',
                'en-IN': 'Let me check your next medicine time.'
            };
            await this.speak(messages[this.currentLanguage] || messages['en-IN']);
        } else if (lowerQuery.includes('today') || lowerQuery.includes('आज')) {
            const messages = {
                'hi-IN': 'मैं आज की दवाओं की जानकारी दिखा रहा हूं।',
                'en-IN': 'Showing today\'s medicines.'
            };
            await this.speak(messages[this.currentLanguage] || messages['en-IN']);
        } else {
            const messages = {
                'hi-IN': 'मुझे समझ नहीं आया। कृपया फिर से कोशिश करें।',
                'en-IN': 'I didn\'t understand. Please try again.'
            };
            await this.speak(messages[this.currentLanguage] || messages['en-IN']);
        }
    }

    /**
     * Get available voices for current language
     */
    async getAvailableVoices() {
        const voices = await Speech.getAvailableVoicesAsync();
        return voices.filter(voice => voice.language.startsWith(this.currentLanguage.split('-')[0]));
    }
}

const voiceManager = new VoiceManager();
export default voiceManager;
