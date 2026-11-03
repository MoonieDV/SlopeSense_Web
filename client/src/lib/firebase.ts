import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const readEnv = (value: string | undefined) => value?.trim().replace(/^(['"])(.*)\1$/, "$2") || undefined;
// Firebase web configuration is public by design. Environment values remain the
// preferred override, while these project defaults keep local and Vercel builds
// functional when an environment file has not been provisioned yet.
const publicFirebaseConfig = {
  apiKey: "AIzaSyDIpXGSAnpbEVy4BWivh9R18zdSERZ9Yjc",
  authDomain: "slopesense-ec686.firebaseapp.com",
  projectId: "slopesense-ec686",
  databaseURL: "https://slopesense-ec686-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "slopesense-ec686.firebasestorage.app",
  messagingSenderId: "444869040808",
  appId: "1:444869040808:web:6dd002efca264d25b4009d",
};

const firebaseConfig = {
  apiKey: readEnv(import.meta.env.VITE_FIREBASE_API_KEY) || publicFirebaseConfig.apiKey,
  authDomain: readEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || publicFirebaseConfig.authDomain,
  projectId: readEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID) || publicFirebaseConfig.projectId,
  databaseURL: readEnv(import.meta.env.VITE_FIREBASE_DATABASE_URL) || publicFirebaseConfig.databaseURL,
  storageBucket: readEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || publicFirebaseConfig.storageBucket,
  messagingSenderId: readEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || publicFirebaseConfig.messagingSenderId,
  appId: readEnv(import.meta.env.VITE_FIREBASE_APP_ID) || publicFirebaseConfig.appId,
  measurementId: readEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
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

const databaseOnlyApp = firebaseApp
  ? firebaseApp
  : getApps().find((app) => app.name === "slopesense-public-database") ??
    initializeApp(
      {
        projectId: firebaseConfig.projectId,
        databaseURL: firebaseConfig.databaseURL,
      },
      "slopesense-public-database"
    );

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseDatabase = getDatabase(databaseOnlyApp);
export const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null;

if (firebaseApp && typeof window !== "undefined" && firebaseConfig.measurementId) {
  void isAnalyticsSupported().then((supported) => {
    if (supported) getAnalytics(firebaseApp);
  });
}
