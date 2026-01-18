'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  runTransaction,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
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
const paymentsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/payments`);
const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

// This would typically be a configurable setting for the library
const MONTHLY_FEE = 50.00;

export async function createMonthlyPayments(
  db: Firestore,
  libraryId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    // 1. Get all active students
    const q = query(studentsCol(db, libraryId), where('status', '==', 'active'));
    const studentsSnapshot = await getDocs(q);
    const activeStudents = studentsSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as Student));

    // 2. For each student, create a new 'pending' payment for the current month
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

    for (const student of activeStudents) {
      const paymentRef = doc(paymentsCol(db, libraryId)); // Auto-generate ID
      batch.set(paymentRef, {
        libraryId,
        studentId: student.id,
        studentName: student.name,
        amount: MONTHLY_FEE,
        status: 'pending',
        dueDate: Timestamp.fromDate(dueDate),
        paymentDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'monthly_payments_created',
      details: { count: activeStudents.length },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error creating monthly payments:', e);
    return { success: false, error: e.message };
  }
}

export async function markPaymentAsPaid(
  db: Firestore,
  libraryId: string,
  paymentId: string,
  studentCustomId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get references
      const paymentRef = doc(db, `libraries/${libraryId}/payments/${paymentId}`);
      
      // Note: We query for the student by their custom ID field, not the document ID.
      const studentQuery = query(studentsCol(db, libraryId), where('id', '==', studentCustomId));
      const studentSnapshot = await getDocs(studentQuery);
      if (studentSnapshot.empty) {
        throw new Error(`Student with ID ${studentCustomId} not found.`);
      }
      const studentDoc = studentSnapshot.docs[0];
      const studentRef = studentDoc.ref;
      
      // 2. Read documents
      const paymentDoc = await transaction.get(paymentRef);
      const studentData = studentDoc.data() as Student;

      if (!paymentDoc.exists()) {
        throw new Error('Payment document not found.');
      }

      // 3. Perform writes
      // Update payment
      transaction.update(paymentRef, {
        status: 'paid',
        paymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update student
      transaction.update(studentRef, {
        paymentStatus: 'paid',
        fibonacciStreak: (studentData.fibonacciStreak || 0) + 1,
        updatedAt: serverTimestamp(),
      });

      // Create activity log
      const logRef = doc(activityLogsCol(db, libraryId));
      transaction.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'payment_processed',
        details: {
          studentName: studentData.name,
          amount: paymentDoc.data().amount,
          paymentId: paymentId,
        },
        timestamp: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error processing payment:', e);
    return { success: false, error: e.message };
  }
}
