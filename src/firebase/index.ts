'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Initializes the Firebase app, but only if it hasn't been initialized already.
 * This is to prevent re-initialization on hot reloads.
 * @returns An object containing the initialized Firebase services.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    // If no app is initialized, initialize one with the provided config.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }
  // If an app is already initialized, just get the services from it.
  return getSdks(getApp());
}

/**
 * A helper function to get all the required SDKs from a FirebaseApp instance.
 * @param firebaseApp The initialized Firebase App.
 * @returns An object containing the Auth, Firestore, and Storage services.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
