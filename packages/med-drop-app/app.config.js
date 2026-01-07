module.exports = ({ config }) => {
  require('dotenv').config();
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      MED_DROP_FIREBASE_API_KEY: process.env.MED_DROP_FIREBASE_API_KEY,
      MED_DROP_FIREBASE_AUTH_DOMAIN: process.env.MED_DROP_FIREBASE_AUTH_DOMAIN,
      MED_DROP_FIREBASE_PROJECT_ID: process.env.MED_DROP_FIREBASE_PROJECT_ID,
      MED_DROP_FIREBASE_STORAGE_BUCKET: process.env.MED_DROP_FIREBASE_STORAGE_BUCKET,
      MED_DROP_FIREBASE_MESSAGING_SENDER_ID: process.env.MED_DROP_FIREBASE_MESSAGING_SENDER_ID,
      MED_DROP_FIREBASE_APP_ID: process.env.MED_DROP_FIREBASE_APP_ID,
      MED_DROP_FIREBASE_MEASUREMENT_ID: process.env.MED_DROP_FIREBASE_MEASUREMENT_ID
    }
  };
};