'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Suggestion } from '../types';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

export async function updateSuggestionStatus(
  db: Firestore,
  libraryId: string,
  suggestionId: string,
  status: Suggestion['status'],
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    const suggestionRef = doc(db, `libraries/${libraryId}/suggestions/${suggestionId}`);
    batch.update(suggestionRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'suggestion_status_updated',
      details: { suggestionId, newStatus: status },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error updating suggestion status:', e);
    return { success: false, error: e.message };
  }
}


export async function deleteSuggestion(
  db: Firestore,
  libraryId: string,
  suggestionId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);
    
    const suggestionRef = doc(db, `libraries/${libraryId}/suggestions/${suggestionId}`);
    batch.delete(suggestionRef);

    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'suggestion_deleted',
      details: { suggestionId },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting suggestion:', e);
    return { success: false, error: e.message };
  }
}
