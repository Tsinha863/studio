'use client';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
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

  const userRef = doc(firestore, 'libraries', libraryId, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      id: uid,
      name,
      email,
      role,
      libraryId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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

    const studentRef = doc(firestore, `libraries/${libraryId}/students`, uid);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        await setDoc(studentRef, {
            libraryId: libraryId,
            userId: uid,
            name: name,
            email: email,
            status: 'active',
            fibonacciStreak: 0,
            paymentDue: 0,
            notes: [],
            tags: [],
            lastInteractionAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
    }
}
