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
      fibonacciStreak: 0,
      notes: [],
      tags: [],
      lastInteractionAt: serverTimestamp(),
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
  data: Partial<StudentFormValues>,
  actor: Actor
): Promise<ActionResponse> {
  // For updates, the student ID (id) is not part of the editable form.
  const updateSchema = studentFormSchema.omit({ id: true }).partial();
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
      lastInteractionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'student_updated',
      details: { studentId: docId, studentName: studentData.name || 'N/A' },
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
  // This is a soft delete. It sets the student's status to 'inactive'.
  try {
    const batch = writeBatch(db);

    // 1. "Delete" student document by setting status to inactive
    const studentRef = doc(db, `libraries/${libraryId}/students/${docId}`);
    batch.update(studentRef, {
      status: 'inactive',
      assignedSeatId: null, // Unassign seat
      updatedAt: serverTimestamp(),
      lastInteractionAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'student_deleted',
      details: { studentId: docId },
      timestamp: serverTimestamp(),
    });
    
    // TODO: Also unassign seat if one is assigned. This requires a transaction to be safe.
    // For now, we assume this is handled separately or the impact is low.

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting student:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
