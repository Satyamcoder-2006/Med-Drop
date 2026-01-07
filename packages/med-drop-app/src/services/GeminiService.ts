import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Initialize Gemini
// TODO: Add EXPO_PUBLIC_GEMINI_API_KEY to .env file
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const GeminiService = {
    scanPrescription: async (base64Image: string) => {
        if (!genAI) {
            console.warn("Gemini API Key missing. Returning mock data.");
            // Fallback mock data for development
            return {
                medicines: [
                    { name: "Amoxicillin (Mock)", dosage: "500mg", frequency: "TDS", timeOfDay: "morning, afternoon, night" },
                    { name: "Paracetamol (Mock)", dosage: "650mg", frequency: "SOS", timeOfDay: "anytime" }
                ]
            };
        }

        try {
            // Using gemini-2.5-flash-lite for faster, name-focused extraction
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const prompt = `Analyze this prescription image. Detect medicine names. Return ONLY valid JSON in format: { medicines:[{ name, dosage: null, frequency: null, timeOfDay: null }] }. If dosage/details are clearly visible, include them, otherwise null.`;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg"
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present to ensure valid JSON
            const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(jsonText);

        } catch (error) {
            console.error("Error scanning prescription with Gemini:", error);
            throw error;
        }
    }
};
