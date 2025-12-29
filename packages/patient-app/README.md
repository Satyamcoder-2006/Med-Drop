# MED DROP - Patient App

Medicine adherence tracking app for patients with zero-literacy interface.

## Features

- 🌍 **10 Indian Languages**: Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi
- 🔊 **Voice Assistance**: Text-to-speech in native language
- 📱 **Offline First**: Works without internet connection
- ⏰ **Smart Reminders**: Medicine reminders with snooze functionality
- 💊 **Large UI**: Designed for elderly and low-literacy users
- 🔒 **Secure**: Encrypted local storage with biometric authentication
- 📊 **Progress Tracking**: Daily and weekly adherence tracking
- 🏥 **Symptom Reporting**: Easy symptom reporting with icons

## Installation

```bash
cd packages/patient-app
npm install
```

## Running the App

### Development

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Building for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Project Structure

```
patient-app/
├── src/
│   ├── screens/          # UI screens
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── SymptomReportScreen.tsx
│   │   └── AllMedicinesScreen.tsx
│   ├── services/         # Core services
│   │   ├── DatabaseService.ts
│   │   ├── NotificationService.ts
│   │   ├── VoiceService.ts
│   │   └── FirebaseService.ts
│   └── types/            # TypeScript types
│       └── index.ts
├── App.tsx               # Main app component
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

## Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform
- **SQLite**: Offline database
- **Firebase**: Backend sync and authentication
- **Expo Notifications**: Local and push notifications
- **Expo Speech**: Text-to-speech
- **Expo Haptics**: Tactile feedback

## Configuration

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Add Android and iOS apps to your project
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Update `src/services/FirebaseService.ts` with your Firebase config

### Notifications

Notifications are configured to work offline using local scheduling. For push notifications:

1. Set up Firebase Cloud Messaging
2. Configure FCM in `app.json`
3. Update notification service to handle remote notifications

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Accessibility

The app is designed for maximum accessibility:

- Minimum touch target size: 56dp
- High contrast mode support
- Screen reader compatible
- Large text mode (18sp minimum)
- Voice guidance for all actions

## License

Proprietary - MED DROP Healthcare Solutions
