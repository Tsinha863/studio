'use client';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

const VALID_ROLES = ["libraryOwner", "student"] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * Ensures a user profile document exists in Firestore. If it doesn't, it creates one.
 * This function is idempotent and safe to call multiple times.
 * @param {Firestore} db - The Firestore instance.
 * @param {object} params - The user profile parameters.
 * @param {string} params.uid - The user's UID.
 * @param {string | null} params.email - The user's email.
 * @param {string} params.name - The user's display name.
 * @param {'libraryOwner' | 'student'} params.role - The user's role.
 * @param {string} params.libraryId - The ID of the library.
 */
export async function ensureUserProfile({
  db,
  uid,
  email,
  name,
  role,
  libraryId,
}: {
  db: Firestore;
  uid: string;
  email: string | null;
  name: string | null;
  role: Role;
  libraryId: string;
}) {
  if (!uid) {
    throw new Error('ensureUserProfile: UID is required.');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}" provided during profile creation.`);
  }

  const userRef = doc(db, 'libraries', libraryId, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    try {
      await setDoc(userRef, {
        id: uid,
        name: name || 'Unnamed User',
        email,
        role,
        libraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to create user profile:', error);
      // Re-throw the error so the calling function knows the operation failed.
      throw new Error('Could not create user profile in Firestore.');
    }
  }
  // If it exists, do nothing. The function has ensured the profile exists.
}
