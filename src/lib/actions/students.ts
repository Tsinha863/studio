'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
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

// Firestore collections
const studentsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/students`);
const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

export async function addStudent(
  db: Firestore,
  libraryId: string,
  data: StudentFormValues,
  actor: Actor
): Promise<ActionResponse> {
  const validation = studentFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { id: studentId, ...studentData } = validation.data;

  try {
    const batch = writeBatch(db);

    // 1. Create student document
    const studentRef = doc(studentsCol(db, libraryId), studentId);
    batch.set(studentRef, {
      ...studentData,
      id: studentId, // denormalize custom ID into the document
      libraryId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'student_created',
      details: { studentId, studentName: studentData.name },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error adding student:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}

export async function updateStudent(
  db: Firestore,
  libraryId: string,
  docId: string,
  data: StudentFormValues,
  actor: Actor
): Promise<ActionResponse> {
  // For updates, the student ID (id) is not part of the editable form.
  const updateSchema = studentFormSchema.omit({ id: true });
  const validation = updateSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }
  
  const studentData = validation.data;

  try {
    const batch = writeBatch(db);

    // 1. Update student document
    const studentRef = doc(db, `libraries/${libraryId}/students/${docId}`);
    batch.update(studentRef, {
      ...studentData,
      updatedAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'student_updated',
      details: { studentId: docId, studentName: studentData.name },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error updating student:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}

export async function deleteStudent(
  db: Firestore,
  libraryId: string,
  docId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    // 1. Delete student document
    const studentRef = doc(db, `libraries/${libraryId}/students/${docId}`);
    batch.delete(studentRef);

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'student_deleted',
      details: { studentId: docId },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting student:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
