'use server';

/**
 * @deprecated All business logic has been moved to client components for improved error handling and debugging.
 * See `src/app/admin/suggestions/page.tsx` and `src/components/student/dashboard/suggestion-form.tsx`.
 */

import {
  Firestore,
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

export async function addSuggestion(
  db: Firestore,
  libraryId: string,
  studentId: string,
  content: string
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function updateSuggestionStatus(
  db: Firestore,
  libraryId: string,
  suggestionId: string,
  status: Suggestion['status'],
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}


export async function deleteSuggestion(
  db: Firestore,
  libraryId: string,
  suggestionId: string,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}
