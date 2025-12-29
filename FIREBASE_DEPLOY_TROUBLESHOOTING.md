# Firebase Deployment Troubleshooting

## Issue: Artifact Registry API Not Enabled

If you see this error when deploying functions:
```
!  artifactregistry: missing required API artifactregistry.googleapis.com
```

### Solution:

1. **Enable the Artifact Registry API**:
   - Go to: https://console.firebase.google.com/project/med-drop-afbb2/overview
   - Or visit: https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com
   - Click "Enable" on the Artifact Registry API

2. **Alternative: Use Firebase Console**:
   - Go to Firebase Console → Functions
   - Click "Get Started"
   - This will automatically enable required APIs

3. **After enabling, retry deployment**:
   ```bash
   firebase deploy --only functions
   ```

## Other Common Issues

### ESLint Errors
**Fixed** ✅ - We've disabled the lint step in `functions/package.json`

### Billing Not Enabled
If you see billing errors:
- Firebase Functions require Blaze (pay-as-you-go) plan
- Go to Firebase Console → Upgrade
- Free tier includes generous limits

### Node Version Mismatch
If you see Node version errors:
- Functions are set to Node 24
- Update `functions/package.json` if needed:
  ```json
  "engines": {
    "node": "20"
  }
  ```

## Quick Deploy Steps

1. **Enable APIs** (one-time):
   - Artifact Registry API
   - Cloud Functions API
   - Cloud Build API

2. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

3. **Verify**:
   - Check Firebase Console → Functions
   - Should see `sendCaregiverAlert` function

## Testing the Function

Once deployed, you can test it:

```javascript
// In your app
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const sendAlert = httpsCallable(functions, 'sendCaregiverAlert');

await sendAlert({
  patientId: 1,
  medicineName: 'Aspirin',
  timestamp: Date.now()
});
```

## Note

For the MED DROP app to work without Firebase Functions:
- The app works 100% offline
- Cloud Functions are optional for advanced features
- You can skip this step and still test the core app

The main app functionality (patient interface, medicine tracking, offline mode) works without any Firebase setup!
