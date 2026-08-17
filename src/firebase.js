import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDMQ2e9FD78LQprouKCMZewwM0vvh_2ijg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "baseops-9f0e9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "baseops-9f0e9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "baseops-9f0e9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "683313784741",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:683313784741:web:dc8f6f412994cdefc86a4c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-40RP4EGF56",
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;
