'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { studentFormSchema, type StudentFormValues } from '../schemas';
import type { Student } from '../types';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

const studentsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/students`);
const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

/**
 * Creates a new student record. The student's custom ID is used as the document ID
 * to enforce uniqueness.
 */
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
  const studentRef = doc(db, `libraries/${libraryId}/students`, studentId);

  try {
    // Check if a student with this ID already exists before creating.
    const existingDoc = await getDoc(studentRef);
    if (existingDoc.exists()) {
      return { success: false, error: `A student with ID ${studentId} already exists.` };
    }

    const batch = writeBatch(db);

    batch.set(studentRef, {
      ...studentData,
      id: studentId, // denormalize custom ID into the document
      libraryId,
      fibonacciStreak: 0,
      paymentDue: 0,
      notes: [],
      tags: [],
      assignedSeatId: null,
      assignedRoomId: null,
      assignedSeatLabel: null,
      lastInteractionAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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

/**
 * Updates an existing student record.
 */
export async function updateStudent(
  db: Firestore,
  libraryId: string,
  docId: string, // This is the student's custom ID, which is also the document ID.
  data: Partial<Omit<StudentFormValues, 'id'>>,
  actor: Actor
): Promise<ActionResponse> {
  const updateSchema = studentFormSchema.omit({ id: true }).partial();
  const validation = updateSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }
  
  const studentData = validation.data;

  try {
    const batch = writeBatch(db);

    const studentRef = doc(db, `libraries/${libraryId}/students/${docId}`);
    batch.update(studentRef, {
      ...studentData,
      lastInteractionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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

/**
 * Soft-deletes a student by setting their status to 'inactive' and atomically unassigning their seat.
 */
export async function deleteStudent(
  db: Firestore,
  libraryId: string,
  docId: string, // The student's custom ID / document ID
  actor: Actor
): Promise<ActionResponse> {
  try {
    await runTransaction(db, async (transaction) => {
      const studentRef = doc(db, `libraries/${libraryId}/students/${docId}`);
      const studentDoc = await transaction.get(studentRef);

      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }
      const studentData = studentDoc.data() as Student;

      // 1. Update student to inactive
      transaction.update(studentRef, {
        status: 'inactive',
        assignedSeatId: null,
        assignedRoomId: null,
        assignedSeatLabel: null,
        updatedAt: serverTimestamp(),
        lastInteractionAt: serverTimestamp(),
      });

      // 2. If a seat was assigned, unassign it atomically.
      if (studentData.assignedSeatId && studentData.assignedRoomId) {
        const seatRef = doc(db, `libraries/${libraryId}/rooms/${studentData.assignedRoomId}/seats/${studentData.assignedSeatId}`);
        transaction.update(seatRef, {
          studentId: null,
          studentName: null,
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Create activity log for the soft delete.
      const logRef = doc(activityLogsCol(db, libraryId));
      transaction.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'student_deleted',
        details: { studentId: docId, studentName: studentData.name },
        timestamp: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error deleting student:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
