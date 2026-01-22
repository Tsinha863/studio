
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { User as UserProfileType } from '@/lib/types';
import { ensureUserProfile } from '@/lib/user-profile';

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

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
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    setAuthState(prev => ({ ...prev, isLoading: true, user: null, userProfile: null, role: null, error: null }));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/users`, firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          let profile: UserProfileType;
          let resolvedRole: UserRole;

          if (docSnap.exists()) {
            profile = docSnap.data() as UserProfileType;
            if (profile.role && VALID_ROLES.includes(profile.role as UserRole)) {
              resolvedRole = profile.role as UserRole;
            } else {
              // AUTO-HEAL: Role is missing or invalid. Default to 'student'.
              console.warn(`Healing invalid/missing role for user ${firebaseUser.uid}. Setting to "student".`);
              await updateDoc(userDocRef, { role: "student", updatedAt: serverTimestamp() });
              profile.role = 'student';
              resolvedRole = 'student';
            }
          } else {
            // AUTO-HEAL: User profile document does not exist. Create it.
            console.warn(`User profile not found for ${firebaseUser.uid}. Auto-healing by creating one with 'student' role.`);
            await ensureUserProfile({
                db: firestore,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'student',
                libraryId: HARDCODED_LIBRARY_ID,
            });
            const newUserSnap = await getDoc(userDocRef);
            profile = newUserSnap.data() as UserProfileType;
            resolvedRole = 'student';
          }
          
          setAuthState(prev => ({ ...prev, user: firebaseUser, userProfile: profile, role: resolvedRole, isLoading: false, error: null }));

        } catch (e) {
          console.error("FirebaseProvider: Error fetching user profile:", e);
          setAuthState(prev => ({ ...prev, user: firebaseUser, userProfile: null, role: null, isLoading: false, error: e instanceof Error ? e : new Error('Failed to fetch user profile') }));
        }
      } else {
        // No user, clear all user-related state
        setAuthState(prev => ({ ...prev, user: null, userProfile: null, role: null, isLoading: false, error: null }));
      }
    }, (error) => {
      console.error("FirebaseProvider: onAuthStateChanged error:", error);
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


// Keep useMemoFirebase as it is a good pattern and used throughout the app.
export type MemoFirebase <T> = T & {__memo?: boolean};
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
