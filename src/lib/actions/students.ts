'use server';

/**
 * @deprecated All business logic has been moved to client components for improved error handling and debugging.
 * See `src/app/admin/students/page.tsx` and `src/components/admin/students/student-form.tsx`.
 */

import {
  Firestore,
} from 'firebase/firestore';
import { studentFormSchema, type StudentFormValues } from '../schemas';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

export async function addStudent(
  db: Firestore,
  libraryId: string,
  data: StudentFormValues,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function updateStudent(
  db: Firestore,
  libraryId: string,
  docId: string, // This is the student's custom ID, which is also the document ID.
  data: Partial<Omit<StudentFormValues, 'id'>>,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function deleteStudent(
  db: Firestore,
  libraryId: string,
  docId: string, // The student's custom ID / document ID
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}
