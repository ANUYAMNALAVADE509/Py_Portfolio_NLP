
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// CHECK REQUIRED CONFIGURATION
const requiredConfig = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingConfig = requiredConfig.filter(
  (key) => !import.meta.env[key]
);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingConfig.join(", ")}`
  );
}

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);

// INITIALIZE AUTHENTICATION
export const auth = getAuth(app);

// EXPORT APP
export default app;