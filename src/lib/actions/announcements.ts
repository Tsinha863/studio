'use server';

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

const announcementsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/announcements`);
const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

export async function addAnnouncement(
  db: Firestore,
  libraryId: string,
  data: AnnouncementFormValues,
  actor: Actor
): Promise<ActionResponse> {
  const validation = announcementFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  try {
    const batch = writeBatch(db);

    const announcementRef = doc(announcementsCol(db, libraryId));
    batch.set(announcementRef, {
      ...validation.data,
      libraryId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'announcement_created',
      details: {
        title: validation.data.title,
      },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error adding announcement:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}


export async function deleteAnnouncement(
  db: Firestore,
  libraryId: string,
  announcementId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    const announcementRef = doc(db, `libraries/${libraryId}/announcements/${announcementId}`);
    batch.delete(announcementRef);

    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'announcement_deleted',
      details: { announcementId },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting announcement:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
