'use client';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

type EnsureUserProfileParams = {
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
 * @param {EnsureUserProfileParams} params - The user profile data.
 */
export async function ensureUserProfile({
  uid,
  name,
  email,
  role,
  libraryId,
  firestore,
}: EnsureUserProfileParams): Promise<void> {
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
