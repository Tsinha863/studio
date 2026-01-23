'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { User as UserProfileType } from '@/lib/types';

const VALID_ROLES = ["libraryOwner", "student"] as const;
type UserRole = (typeof VALID_ROLES)[number];

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  
  // Multi-tenant and profile state
  user: User | null;
  userProfile: UserProfileType | null;
  libraryId: string | null;
  role: UserRole | null;
  isLoading: boolean; // True until auth and profile/role/libraryId are resolved
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
 * Provides Firebase services and a consolidated, multi-tenant-aware authentication/profile state.
 * It listens for auth changes, resolves the user's library, and then fetches their profile and role.
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
    libraryId: null,
    role: null,
    isLoading: true, // Start in a loading state
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Resolve libraryId from the top-level users collection
          const userMappingRef = doc(firestore, 'users', firebaseUser.uid);
          const userMappingSnap = await getDoc(userMappingRef);

          if (!userMappingSnap.exists()) {
            // This can happen if signup fails after auth creation but before firestore writes.
            // Safest action is to sign out.
            await signOut(auth);
            throw new Error(`User mapping not found for uid: ${firebaseUser.uid}. The user has been signed out.`);
          }
          const libraryId = userMappingSnap.data()?.libraryId;
          if (!libraryId) {
             await signOut(auth);
             throw new Error(`Library ID not found in user mapping for uid: ${firebaseUser.uid}.`);
          }

          // 2. Now that we have the libraryId, get the user's full profile
          const userProfileRef = doc(firestore, `libraries/${libraryId}/users`, firebaseUser.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          
          if (!userProfileSnap.exists()) {
            await signOut(auth);
            throw new Error(`User profile not found in library ${libraryId} for uid: ${firebaseUser.uid}.`);
          }
          
          const profile = userProfileSnap.data() as UserProfileType;
          const role = profile.role as UserRole;

          if (!VALID_ROLES.includes(role)) {
               throw new Error(`User ${firebaseUser.uid} has an invalid or missing role.`);
          }

          // 3. Profile, role, and libraryId resolved successfully. Update state.
          setAuthState(prev => ({ 
            ...prev, 
            user: firebaseUser, 
            userProfile: profile, 
            libraryId,
            role, 
            isLoading: false, 
            error: null 
          }));

        } catch (e) {
          // Any failure in this process is a critical error.
          setAuthState(prev => ({ ...prev, user: firebaseUser, userProfile: null, libraryId: null, role: null, isLoading: false, error: e instanceof Error ? e : new Error('Failed to resolve user profile') }));
        }
      } else {
        // No user is signed in. Clear all user-related state.
        setAuthState(prev => ({ ...prev, user: null, userProfile: null, libraryId: null, role: null, isLoading: false, error: null }));
      }
    }, (error) => {
      // An error occurred in the auth listener itself.
      setAuthState(prev => ({ ...prev, user: null, userProfile: null, libraryId: null, role: null, isLoading: false, error }));
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

    