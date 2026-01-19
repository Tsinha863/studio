'use client';

import * as React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { useFirebase, useMemoFirebase } from '@/firebase';
import type { User as UserProfile } from '@/lib/types';

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

type UserRole = 'libraryOwner' | 'student';

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

        if (!userDocRef) {
            return;
        }

        setIsLoading(true);
        const fetchRole = async () => {
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userProfile = docSnap.data() as UserProfile;
                    if (userProfile.role) {
                        setRole(userProfile.role);
                        setError(null);
                    } else {
                        setError(new Error('User profile is missing role.'));
                        setRole(null);
                    }
                } else {
                    setError(new Error('User profile not found. Please contact support.'));
                    setRole(null);
                }
            } catch (e) {
                console.error("Failed to fetch user role:", e);
                setError(e instanceof Error ? e : new Error('An unexpected error occurred while fetching user role.'));
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();

    }, [user, userDocRef]);

    return { role, isLoading, error };
}
