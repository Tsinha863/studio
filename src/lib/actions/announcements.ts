'use server';

/**
 * @deprecated All business logic has been moved to client components for improved error handling and debugging.
 * See `src/app/admin/announcements/page.tsx` and `src/components/admin/announcements/announcement-form.tsx`.
 */

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { announcementFormSchema, type AnnouncementFormValues } from '../schemas';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

export async function addAnnouncement(
  db: Firestore,
  libraryId: string,
  data: AnnouncementFormValues,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}


export async function deleteAnnouncement(
  db: Firestore,
  libraryId: string,
  announcementId: string,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}
