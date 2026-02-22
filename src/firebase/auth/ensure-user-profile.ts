'use client';

import {
  doc,
  getDoc,
  serverTimestamp,
  type Firestore,
  writeBatch,
} from 'firebase/firestore';

type UserProfileParams = {
  uid: string;
  name: string;
  email: string | null;
  role: 'libraryOwner' | 'student';
  libraryId: string;
  firestore: Firestore;
};

/**
 * Creates a user profile document in Firestore if one does not already exist.
 * This function is idempotent and safe to call multiple times.
 * It also creates the top-level user-to-library mapping.
 *
 * @param {UserProfileParams} params - The user profile data.
 */
export async function ensureUserProfile({
  uid,
  name,
  email,
  role,
  libraryId,
  firestore,
}: UserProfileParams): Promise<void> {
  if (!uid || !role || !libraryId) {
    throw new Error('User ID, Role, and Library ID are required to ensure a user profile.');
  }

  const userProfileRef = doc(firestore, 'libraries', libraryId, 'users', uid);
  const userProfileSnap = await getDoc(userProfileRef);

  // Only run writes if the main user profile doesn't exist.
  if (!userProfileSnap.exists()) {
    const batch = writeBatch(firestore);

    // Set the main user profile
    batch.set(userProfileRef, {
      id: uid,
      name,
      email,
      role,
      libraryId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Set the top-level user-to-library mapping for easy lookup on login.
    const userMappingRef = doc(firestore, 'users', uid);
    batch.set(userMappingRef, {
        libraryId: libraryId,
        role: role, // Ensure role is present for rapid resolution
        createdAt: serverTimestamp(),
    });
    
    await batch.commit();
  }
}

type StudentProfileParams = {
    uid: string;
    name: string;
    email: string | null;
    libraryId: string;
    firestore: Firestore;
};

/**
 * Creates a student-specific profile document in Firestore if one does not already exist.
 * This is idempotent and safe to call multiple times.
 *
 * @param {StudentProfileParams} params - The student profile data.
 */
export async function ensureStudentProfile({ uid, name, email, libraryId, firestore }: StudentProfileParams): Promise<void> {
    if (!uid || !libraryId) {
        throw new Error('User ID and Library ID are required to ensure a student profile.');
    }

    // The student document ID can be the same as the user UID for 1:1 mapping
    const studentRef = doc(firestore, `libraries/${libraryId}/students`, uid);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        const batch = writeBatch(firestore);
        batch.set(studentRef, {
            id: uid, // explicitly set the student ID to match the user ID
            libraryId: libraryId,
            userId: uid,
            name: name,
            email: email,
            status: 'active',
            fibonacciStreak: 0,
            lastInteractionAt: serverTimestamp(),
            notes: [],
            tags: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await batch.commit();
    }
}
