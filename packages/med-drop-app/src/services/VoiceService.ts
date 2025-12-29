import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

interface VoiceConfig {
    language: string;
    pitch: number;
    rate: number;
}

const LANGUAGE_CODES: Record<string, string> = {
    hi: 'hi-IN', // Hindi
    en: 'en-IN', // English (India)
    ta: 'ta-IN', // Tamil
    te: 'te-IN', // Telugu
    bn: 'bn-IN', // Bengali
    mr: 'mr-IN', // Marathi
    gu: 'gu-IN', // Gujarati
    kn: 'kn-IN', // Kannada
    ml: 'ml-IN', // Malayalam
    pa: 'pa-IN', // Punjabi
};

const VOICE_MESSAGES = {
    medicineTime: {
        hi: 'दवा लेने का समय हो गया है',
        en: 'Time to take your medicine',
        ta: 'மருந்து சாப்பிட வேண்டிய நேரம்',
        te: 'మందు తీసుకోవాల్సిన సమయం',
        bn: 'ওষুধ খাওয়ার সময়',
        mr: 'औषध घेण्याची वेळ',
        gu: 'દવા લેવાનો સમય',
        kn: 'ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯ',
        ml: 'മരുന്ന് കഴിക്കേണ്ട സമയം',
        pa: 'ਦਵਾਈ ਲੈਣ ਦਾ ਸਮਯ',
    },
    goodJob: {
        hi: 'बहुत अच्छा! दवा ली गई',
        en: 'Great! Medicine recorded',
        ta: 'நல்லது! மருந்து பதிவு செய்யப்பட்டது',
        te: 'బాగుంది! మందు నమోదు చేయబడింది',
        bn: 'দারুণ! ওষুধ রেকর্ড করা হয়েছে',
        mr: 'छान! औषध नोंदवले',
        gu: 'સરસ! દવા નોંધાઈ',
        kn: 'ಒಳ್ಳೆಯದು! ಔಷಧಿ ದಾಖಲಾಗಿದೆ',
        ml: 'നല്ലത്! മരുന്ന് രേഖപ്പെടുത്തി',
        pa: 'ਵਧੀਆ! ਦਵਾਈ ਰਿਕਾਰਡ ਕੀਤੀ',
    },
    snoozeConfirm: {
        hi: 'ठीक है, मैं 15 मिनट में याद दिलाऊंगा',
        en: 'Okay, I will remind you in 15 minutes',
        ta: '15 நிமிடங்களில் நினைவூட்டுகிறேன்',
        te: '15 నిమిషాల్లో గుర్తు చేస్తాను',
        bn: '15 মিনিটে মনে করিয়ে দেব',
        mr: '15 मिनिटांत आठवण करून देईन',
        gu: '15 મિનિટમાં યાદ અપાવીશ',
        kn: '15 ನಿಮಿಷಗಳಲ್ಲಿ ನೆನಪಿಸುತ್ತೇನೆ',
        ml: '15 മിനിറ്റിൽ ഓർമ്മിപ്പിക്കാം',
        pa: '15 ਮਿੰਟ ਵਿੱਚ ਯਾਦ ਕਰਵਾਵਾਂਗਾ',
    },
    nextMedicine: {
        hi: 'अगली दवा',
        en: 'Next medicine',
        ta: 'அடுத்த மருந்து',
        te: 'తదుపరి మందు',
        bn: 'পরবর্তী ওষুধ',
        mr: 'पुढील औषध',
        gu: 'આગળની દવા',
        kn: 'ಮುಂದಿನ ಔಷಧಿ',
        ml: 'അടുത്ത മരുന്ന്',
        pa: 'ਅਗਲੀ ਦਵਾਈ',
    },
    progress: {
        hi: 'आपने {taken} में से {total} दवाएं लीं',
        en: 'You took {taken} out of {total} medicines',
        ta: '{total} மருந்துகளில் {taken} சாப்பிட்டீர்கள்',
        te: '{total} మందులలో {taken} తీసుకున్నారు',
        bn: '{total} টির মধ্যে {taken} টি ওষুধ খেয়েছেন',
        mr: '{total} पैकी {taken} औषधे घेतलीत',
        gu: '{total} માંથી {taken} દવાઓ લીધી',
        kn: '{total} ಔಷಧಿಗಳಲ್ಲಿ {taken} ತೆಗೆದುಕೊಂಡಿರಿ',
        ml: '{total} മരുന്നുകളിൽ {taken} കഴിച്ചു',
        pa: '{total} ਵਿੱਚੋਂ {taken} ਦਵਾਈਆਂ ਲਈਆਂ',
    },
};

class VoiceService {
    private currentLanguage: string = 'hi';
    private isSpeaking: boolean = false;

    setLanguage(language: string): void {
        if (LANGUAGE_CODES[language]) {
            this.currentLanguage = language;
        }
    }

    async speak(message: string, options?: Partial<VoiceConfig>): Promise<void> {
        if (this.isSpeaking) {
            await Speech.stop();
        }

        this.isSpeaking = true;

        const voiceOptions: Speech.SpeechOptions = {
            language: LANGUAGE_CODES[this.currentLanguage] || 'hi-IN',
            pitch: options?.pitch || 1.0,
            rate: options?.rate || 0.85, // Slightly slower for better comprehension
            onDone: () => {
                this.isSpeaking = false;
            },
            onError: (error) => {
                console.error('Speech error:', error);
                this.isSpeaking = false;
            },
        };

        try {
            await Speech.speak(message, voiceOptions);
        } catch (error) {
            console.error('Failed to speak:', error);
            this.isSpeaking = false;
        }
    }

    async speakMedicineTime(medicineName?: string): Promise<void> {
        const baseMessage = VOICE_MESSAGES.medicineTime[this.currentLanguage as keyof typeof VOICE_MESSAGES.medicineTime];
        const message = medicineName ? `${baseMessage}. ${medicineName}` : baseMessage;
        await this.speak(message);
    }

    async speakGoodJob(): Promise<void> {
        const message = VOICE_MESSAGES.goodJob[this.currentLanguage as keyof typeof VOICE_MESSAGES.goodJob];
        await this.speak(message);
    }

    async speakSnoozeConfirm(): Promise<void> {
        const message = VOICE_MESSAGES.snoozeConfirm[this.currentLanguage as keyof typeof VOICE_MESSAGES.snoozeConfirm];
        await this.speak(message);
    }

    async speakProgress(taken: number, total: number): Promise<void> {
        const template = VOICE_MESSAGES.progress[this.currentLanguage as keyof typeof VOICE_MESSAGES.progress];
        const message = template.replace('{taken}', taken.toString()).replace('{total}', total.toString());
        await this.speak(message);
    }

    async speakNextMedicine(medicineName: string, timeUntil: string): Promise<void> {
        const nextMedicineText = VOICE_MESSAGES.nextMedicine[this.currentLanguage as keyof typeof VOICE_MESSAGES.nextMedicine];
        const message = `${nextMedicineText} ${medicineName} ${timeUntil}`;
        await this.speak(message);
    }

    async speakCustomMessage(key: string, params?: Record<string, string>): Promise<void> {
        let message = key;

        if (params) {
            Object.keys(params).forEach(paramKey => {
                message = message.replace(`{${paramKey}}`, params[paramKey]);
            });
        }

        await this.speak(message);
    }

    async stop(): Promise<void> {
        if (this.isSpeaking) {
            await Speech.stop();
            this.isSpeaking = false;
        }
    }

    async getAvailableVoices(): Promise<Speech.Voice[]> {
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            return voices.filter(voice =>
                voice.language.startsWith('hi') ||
                voice.language.startsWith('en-IN') ||
                voice.language.startsWith('ta') ||
                voice.language.startsWith('te') ||
                voice.language.startsWith('bn') ||
                voice.language.startsWith('mr')
            );
        } catch (error) {
            console.error('Failed to get available voices:', error);
            return [];
        }
    }

    isSpeakingNow(): boolean {
        return this.isSpeaking;
    }

    // Utility to check if TTS is available
    async isTTSAvailable(): Promise<boolean> {
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            return voices.length > 0;
        } catch {
            return false;
        }
    }
}

export const voiceService = new VoiceService();
