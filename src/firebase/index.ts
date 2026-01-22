
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// HARD FAIL if config missing (prevents silent crashes)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Firebase config is missing or incomplete. Check your src/firebase/config.ts file.");
}

// Initialize safely (prevents re-init)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp: FirebaseApp = app;
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);


// Keep existing exports for hooks and providers
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
