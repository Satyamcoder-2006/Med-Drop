# Firebase Setup Guide for MED DROP

This guide will help you set up Firebase for the MED DROP application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `med-drop` (or your preferred name)
4. Disable Google Analytics (optional for this app)
5. Click "Create project"

## Step 2: Register Your App

1. In the Firebase console, click the **Web** icon (`</>`)
2. Register app with nickname: "MED DROP Web"
3. **Do NOT** check "Also set up Firebase Hosting"
4. Click "Register app"
5. Copy the `firebaseConfig` object

## Step 3: Update Firebase Configuration

1. Open `config/firebase.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 4: Enable Firebase Services

### 4.1 Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Click "Save"

### 4.2 Enable Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Start in **test mode** (for development)
4. Choose a location (closest to your users, e.g., `asia-south1` for India)
5. Click "Enable"

### 4.3 Configure Firestore Security Rules

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Patients collection
    match /patients/{patientId} {
      allow read, write: if request.auth != null;
    }
    
    // Medicines collection
    match /medicines/{medicineId} {
      allow read, write: if request.auth != null;
    }
    
    // Adherence logs
    match /adherence_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Symptoms
    match /symptoms/{symptomId} {
      allow read, write: if request.auth != null;
    }
    
    // Caregivers
    match /caregivers/{caregiverId} {
      allow read, write: if request.auth != null;
    }
    
    // Interventions
    match /interventions/{interventionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4.4 Enable Cloud Storage

1. Go to **Build** → **Storage**
2. Click "Get started"
3. Start in **test mode**
4. Click "Next" and "Done"

### 4.5 Enable Cloud Messaging (for push notifications)

1. Go to **Build** → **Cloud Messaging**
2. Click "Get started"
3. For Android: Add your app's package name
4. For iOS: Upload APNs certificate (if deploying to iOS)

## Step 5: Set Up Cloud Functions (Optional - for SMS alerts)

### 5.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 5.2 Login to Firebase

```bash
firebase login
```

### 5.3 Initialize Cloud Functions

```bash
cd med-drop
firebase init functions
```

- Select your Firebase project
- Choose JavaScript or TypeScript
- Install dependencies

### 5.4 Create Caregiver Alert Function

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Send caregiver alert when patient misses medicine
exports.sendCaregiverAlert = functions.https.onCall(async (data, context) => {
  const { patientId, medicineName, timestamp } = data;
  
  // Get patient's caregivers
  const caregiverSnapshot = await admin.firestore()
    .collection('patient_caregivers')
    .where('patient_id', '==', patientId)
    .get();
  
  // Send notifications to all caregivers
  const promises = [];
  caregiverSnapshot.forEach(doc => {
    const caregiverId = doc.data().caregiver_id;
    
    // Send FCM notification
    const message = {
      notification: {
        title: 'Patient Needs Attention',
        body: `Patient missed ${medicineName}`
      },
      topic: `caregiver_${caregiverId}`
    };
    
    promises.push(admin.messaging().send(message));
  });
  
  await Promise.all(promises);
  return { success: true };
});
```

### 5.5 Deploy Cloud Functions

```bash
firebase deploy --only functions
```

## Step 6: SMS Integration (Optional)

### Option A: Using Twilio

1. Sign up for [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Install Twilio in Cloud Functions:
   ```bash
   cd functions
   npm install twilio
   ```
4. Add SMS function to `functions/index.js`

### Option B: Using Firebase Extensions

1. Go to **Extensions** in Firebase Console
2. Search for "Twilio SMS"
3. Install the extension
4. Configure with your Twilio credentials

## Step 7: Test Your Setup

1. Run your app: `npx expo start`
2. Create a test patient
3. Check Firebase Console to see if data is being synced
4. Test offline mode by turning off internet

## Security Best Practices

1. **Never commit** your `firebase.js` config file with real credentials to public repositories
2. Add `config/firebase.js` to `.gitignore`
3. Use environment variables for sensitive data in production
4. Update Firestore security rules before going to production
5. Enable App Check to prevent abuse

## Troubleshooting

### "Permission denied" errors
- Check your Firestore security rules
- Ensure user is authenticated
- Verify the collection/document path

### Data not syncing
- Check internet connection
- Verify Firebase config is correct
- Check browser console for errors
- Ensure sync manager is initialized

### Push notifications not working
- Verify FCM is enabled
- Check notification permissions on device
- Test with Firebase Console's "Cloud Messaging" test feature

## Production Checklist

- [ ] Update Firestore security rules (remove test mode)
- [ ] Update Storage security rules
- [ ] Enable App Check
- [ ] Set up proper authentication
- [ ] Configure backup for Firestore
- [ ] Set up monitoring and alerts
- [ ] Test on real devices
- [ ] Load test with expected user volume

## Support

For Firebase documentation: https://firebase.google.com/docs
For issues: Check Firebase Console → Support
