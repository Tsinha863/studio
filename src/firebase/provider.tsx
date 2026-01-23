'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { User as UserProfileType } from '@/lib/types';
import { LIBRARY_ID } from '@/lib/config';

const VALID_ROLES = ["libraryOwner", "student"] as const;
type UserRole = (typeof VALID_ROLES)[number];

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  
  // Consolidated auth and profile state
  user: User | null;
  userProfile: UserProfileType | null;
  role: UserRole | null;
  isLoading: boolean; // True until both auth and profile/role are resolved
  error: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

/**
 * Provides Firebase services and a consolidated authentication/profile state to the entire app.
 * It listens for auth changes and fetches the user's profile and role in one go,
 * eliminating component-level waterfalls.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [authState, setAuthState] = useState<FirebaseContextState>({
    firebaseApp,
    firestore,
    auth,
    storage,
    user: null,
    userProfile: null,
    role: null,
    isLoading: true, // Start in a loading state
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, `libraries/${LIBRARY_ID}/users`, firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (!docSnap.exists()) {
            // This is a critical error state. A user record exists in Auth, but not in Firestore.
            // This indicates a violation of the application's core invariant.
            // The safest action is to sign the user out to prevent an inconsistent state.
            await signOut(auth);
            throw new Error(`User profile not found for uid: ${firebaseUser.uid}. The user has been signed out.`);
          }
          
          const profile = docSnap.data() as UserProfileType;

          if (!profile.role || !VALID_ROLES.includes(profile.role as UserRole)) {
               throw new Error(`User ${firebaseUser.uid} has an invalid or missing role.`);
          }

          // Profile and role resolved successfully. Update state and set loading to false.
          setAuthState(prev => ({ ...prev, user: firebaseUser, userProfile: profile, role: profile.role as UserRole, isLoading: false, error: null }));

        } catch (e) {
          // Any failure in this process is a critical error.
          // Set the error state and stop loading.
          setAuthState(prev => ({ ...prev, user: firebaseUser, userProfile: null, role: null, isLoading: false, error: e instanceof Error ? e : new Error('Failed to resolve user profile') }));
        }
      } else {
        // No user is signed in. Clear all user-related state and set loading to false.
        setAuthState(prev => ({ ...prev, user: null, userProfile: null, role: null, isLoading: false, error: null }));
      }
    }, (error) => {
      // An error occurred in the auth listener itself.
      setAuthState(prev => ({ ...prev, user: null, userProfile: null, role: null, isLoading: false, error }));
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo(() => authState, [authState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


// Hooks to access the context
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error("Auth service not available.");
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error("Firestore service not available.");
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
    const { firebaseApp } = useFirebase();
    if (!firebaseApp) throw new Error("FirebaseApp not available.");
    return firebaseApp;
}

export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    if (!storage) throw new Error("Firebase Storage not available.");
    return storage;
}

/**
 * Hook specifically for accessing the authenticated user's state, including profile and role.
 * This provides a consolidated object for auth-related data.
 * @returns An object with user, userProfile, role, isLoading, and error.
 */
export const useUser = () => {
    const { user, userProfile, role, isLoading, error } = useFirebase();
    return { user, userProfile, role, isLoading, error };
}
