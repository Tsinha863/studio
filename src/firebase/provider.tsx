
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { User as UserProfileType, UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ["admin", "libraryOwner", "libraryStaff", "student"];

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  userProfile: UserProfileType | null;
  libraryId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  error: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

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
    isLoading: true,
    error: null,
  });

  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && (pathname === '/join' || pathname === '/join/library')) {
        setAuthState(prev => ({ 
            ...prev, 
            user: firebaseUser,
            userProfile: null,
            libraryId: null,
            role: null,
            isLoading: false, 
            error: null 
        }));
        return;
      }

      if (firebaseUser) {
        try {
          const userMappingRef = doc(firestore, 'users', firebaseUser.uid);
          const userMappingSnap = await getDoc(userMappingRef);
          
          if (!userMappingSnap.exists()) {
            await signOut(auth);
            throw new Error(`User account is not provisioned. UID: ${firebaseUser.uid}.`);
          }

          const mappingData = userMappingSnap.data();
          const libraryId = mappingData.libraryId;
          const role = mappingData.role as UserRole;

          if (!VALID_ROLES.includes(role)) {
               throw new Error(`User ${firebaseUser.uid} has an invalid role: ${role}`);
          }

          let profile: UserProfileType | null = null;
          if (role === 'admin') {
              profile = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'System Admin',
                  email: firebaseUser.email || '',
                  role: 'admin',
                  createdAt: mappingData.createdAt || null,
                  updatedAt: mappingData.updatedAt || null,
              } as UserProfileType;
          } else {
              if (!libraryId) throw new Error("Library ID missing for library-scoped user.");
              const userProfileRef = doc(firestore, `libraries/${libraryId}/users`, firebaseUser.uid);
              const userProfileSnap = await getDoc(userProfileRef);
              if (!userProfileSnap.exists()) {
                throw new Error(`Profile not found in library ${libraryId}.`);
              }
              profile = userProfileSnap.data() as UserProfileType;
          }

          setAuthState(prev => ({ 
            ...prev, 
            user: firebaseUser, 
            userProfile: profile, 
            libraryId: libraryId || null,
            role, 
            isLoading: false, 
            error: null 
          }));

        } catch (e) {
          setAuthState(prev => ({ 
            ...prev, 
            user: firebaseUser, 
            userProfile: null, 
            libraryId: null, 
            role: null, 
            isLoading: false, 
            error: e instanceof Error ? e : new Error('Auth resolution failed') 
          }));
        }
      } else {
        setAuthState(prev => ({ ...prev, user: null, userProfile: null, libraryId: null, role: null, isLoading: false, error: null }));
      }
    }, (error) => {
      setAuthState(prev => ({ ...prev, user: null, userProfile: null, libraryId: null, role: null, isLoading: false, error }));
    });

    return () => unsubscribe();
  }, [auth, firestore, pathname]);

  const contextValue = useMemo(() => authState, [authState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  return context;
};

export const useAuth = () => useFirebase().auth!;
export const useFirestore = () => useFirebase().firestore!;
export const useUser = () => {
    const { user, userProfile, role, isLoading, error, libraryId } = useFirebase();
    return { user, userProfile, role, isLoading, error, libraryId };
}
