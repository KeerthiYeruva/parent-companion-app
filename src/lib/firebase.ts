import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const cloudSyncMode = (import.meta.env.VITE_FIREBASE_SYNC_MODE ?? 'all').toLowerCase();
const cloudSyncExplicitlyDisabled = import.meta.env.VITE_ENABLE_FIREBASE_SYNC === 'false';
const cloudSyncAllowedForEnvironment = cloudSyncMode !== 'production-only' || import.meta.env.PROD;
const isTestMode = import.meta.env.MODE === 'test';

export const isCloudSyncEnabled =
  isTestMode || (!cloudSyncExplicitlyDisabled && cloudSyncAllowedForEnvironment);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const shouldInitializeFirebase = isCloudSyncEnabled && hasFirebaseConfig;

export const firebaseApp = shouldInitializeFirebase
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined;

export const firestore = firebaseApp ? getFirestore(firebaseApp) : undefined;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : undefined;
export const isFirebaseConfigured = Boolean(firebaseApp);
