'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { useFirebase, useMemoFirebase } from '@/firebase';
import type { User as UserProfile } from '@/lib/types';
import { ensureUserProfile } from '@/lib/user-profile';

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

const VALID_ROLES = ["libraryOwner", "student"] as const;
type UserRole = (typeof VALID_ROLES)[number];

interface UseRoleResult {
    role: UserRole | null;
    isLoading: boolean;
    error: Error | null;
}

export function useRole(user: User | null): UseRoleResult {
    const { firestore } = useFirebase();
    const [role, setRole] = React.useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/users`, user.uid);
    }, [firestore, user]);

    React.useEffect(() => {
        if (!user) {
            setRole(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        if (!userDocRef || !firestore) {
            return;
        }

        setIsLoading(true);
        const fetchRole = async () => {
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userProfile = docSnap.data() as UserProfile;
                    
                    if (userProfile.role && VALID_ROLES.includes(userProfile.role as UserRole)) {
                        setRole(userProfile.role as UserRole);
                        setError(null);
                    } else {
                        // AUTO-HEAL: Role is missing or invalid. Default to 'student'.
                        console.warn(`Healing invalid/missing role for user ${user.uid}. Setting to "student".`);
                        await updateDoc(userDocRef, {
                            role: "student",
                            updatedAt: serverTimestamp(),
                        });
                        setRole("student");
                        setError(null);
                    }
                } else {
                    // AUTO-HEAL: User profile document does not exist. Create it with a safe default.
                    console.warn(`User profile not found for ${user.uid}. Auto-healing by creating one with 'student' role.`);
                    await ensureUserProfile({
                        db: firestore,
                        uid: user.uid,
                        email: user.email,
                        role: 'student', // Safe default for any user logging in without a profile.
                        libraryId: HARDCODED_LIBRARY_ID,
                    });
                    setRole('student');
                    setError(null);
                }
            } catch (e) {
                console.error("Failed to fetch or heal user role:", e);
                setError(e instanceof Error ? e : new Error('An unexpected error occurred while fetching user role.'));
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();

    }, [user, userDocRef, firestore]);

    return { role, isLoading, error };
}
