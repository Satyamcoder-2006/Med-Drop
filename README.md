# 🏥 Med Drop

**A Smart Medicine Adherence & Family Care Platform**

Med Drop is a comprehensive solution designed to bridge the gap between patients, their caregivers (guardians), and pharmacies. It simplifies medication management, tracks adherence, and ensures that elderly or low-literacy patients can easily follow their prescription schedules.

---

## 🚀 Features

### 👤 Patient App (Offline-First)
*   **Zero-Literacy Interface:** Large buttons, color-coded inputs, and voice guidance (TTS) in 10 languages.
*   **Adherence Tracking:** Simple "Taken/Skipped" logging with local notifications.
*   **Offline Capability:** Fully functional without internet usage, backed by SQLite.
*   **Symptom Reporting:** Easy-to-use symptom logger for patients to report how they feel.

### �️ Guardian App (Caregiver Dashboard)
*   **Real-time Monitoring:** View adherence stats and daily logs for family members.
*   **Alerts:** Receive notifications for missed doses or reported symptoms.
*   **Intervention Logging:** Keep track of check-ins and medical status updates.

### � Pharmacy App
*   **Patient Management:** Register new patients and manage their profiles.
*   **Prescription Digitization:** Input medicines and schedules that sync directly to the user's app.
*   **QR Code Onboarding:** Quickly set up patients by scanning a QR code.

---

## 🛠️ Tech Stack

*   **Frontend:** React Native (Expo SDK 50+)
*   **Languages:** TypeScript
*   **Navigation:** React Navigation (Stack & Bottom Tabs)
*   **Backend:** Firebase (Cloud Functions, Firestore, Authentication)
*   **Local Database:** SQLite (for offline data persistence)
*   **State Management:** React Context API & Hooks

---

## 📂 Project Structure

This repository is organized as a monorepo containing multiple packages:

```
med-drop/
├── packages/
│   ├── med-drop-app/      # The main mobile application
│   ├── pharmacy-app/      # Tablet/Web app for pharmacies (In Progress)
│   └── guardian-app/      # App for family/caregivers (In Progress)
├── firebase/
│   ├── functions/         # Cloud Functions
│   └── firestore.rules    # Security Rules
└── docs/                  # Project documentation
```

---

## 🏁 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [Expo Go](https://expo.dev/client) app on your physical device (Android/iOS)
*   Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Satyamcoder-2006/Med-Drop.git
    cd Med-Drop
    ```

2.  **Install dependencies:**
    Navigate to the specific app package you want to work on (e.g., `med-drop-app`) and install dependencies.
    ```bash
    cd packages/med-drop-app
    npm install
    ```

3.  **Run the application:**
    ```bash
    npm start
    ```
    This will start the Expo development server. Scan the QR code displayed in the terminal with the Expo Go app on your phone.

---

## 🤝 Contributing

We welcome contributions! If you're looking to help out (or you're my friend working on this with me), here's the workflow:

1.  **Pull the latest changes** from the `main` branch.
    ```bash
    git pull origin main
    ```
2.  **Create a new branch** for your feature or fix.
    ```bash
    git checkout -b feature/amazing-new-feature
    ```
3.  **Make your changes** and commit them.
    ```bash
    git commit -m "Add some amazing feature"
    ```
4.  **Push to the branch:**
    ```bash
    git push origin feature/amazing-new-feature
    ```
5.  **Open a Pull Request** on GitHub to merge your changes into `main`.

---

## 📄 License

This project is licensed under the MIT License.
