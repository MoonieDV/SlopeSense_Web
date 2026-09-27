import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const readEnv = (value: string | undefined) => value?.trim().replace(/^(['"])(.*)\1$/, "$2") || undefined;

const firebaseConfig = {
  apiKey: readEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: readEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: readEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  databaseURL: readEnv(import.meta.env.VITE_FIREBASE_DATABASE_URL),
  storageBucket: readEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: readEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: readEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([name]) => name);

const hasFirebaseConfig = missingFirebaseConfig.length === 0;

if (!hasFirebaseConfig) {
  console.error(`Firebase is disabled. Missing build variables: ${missingFirebaseConfig.join(", ")}`);
}

export const isFirebaseConfigured = hasFirebaseConfig;

export const firebaseApp = hasFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null;
export const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null;

if (firebaseApp && typeof window !== "undefined" && firebaseConfig.measurementId) {
  void isAnalyticsSupported().then((supported) => {
    if (supported) getAnalytics(firebaseApp);
  });
}
