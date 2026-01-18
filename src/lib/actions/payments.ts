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
  increment,
} from 'firebase/firestore';
import type { Student, Payment } from '../types';

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

const MONTHLY_FEE = 50.00;
const INACTIVITY_THRESHOLD_DAYS = 90;

export async function createMonthlyPayments(
  db: Firestore,
  libraryId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - INACTIVITY_THRESHOLD_DAYS);
    
    // 1. Transition `pending` payments to `overdue` if their due date has passed
    const pendingPaymentsQuery = query(
        paymentsCol(db, libraryId), 
        where('status', '==', 'pending'),
        where('dueDate', '<', Timestamp.fromDate(today))
    );
    const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
    pendingPaymentsSnapshot.forEach(paymentDoc => {
        batch.update(paymentDoc.ref, { status: 'overdue', updatedAt: serverTimestamp() });
    });

    // 2. Query all students who are not inactive
    const studentsQuery = query(studentsCol(db, libraryId), where('status', '!=', 'inactive'));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    let createdCount = 0;

    for (const studentDoc of studentsSnapshot.docs) {
      const student = { docId: studentDoc.id, ...studentDoc.data() } as Student;
      const studentRef = studentDoc.ref;
      
      const unpaidPaymentsQuery = query(paymentsCol(db, libraryId), 
        where('studentId', '==', student.id),
        where('status', 'in', ['pending', 'overdue'])
      );
      const unpaidPaymentsSnapshot = await getDocs(unpaidPaymentsQuery);

      if (unpaidPaymentsSnapshot.empty) {
        // This student has no unpaid bills, so we can create a new one.
        const paymentRef = doc(paymentsCol(db, libraryId));
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
        createdCount++;

        // If student was at-risk but has no unpaid bills, check for inactivity.
        // If inactive, they become active again. Otherwise, they stay at-risk.
        if (student.status === 'at-risk' && student.lastInteractionAt.toDate() >= ninetyDaysAgo) {
            batch.update(studentRef, { status: 'active', updatedAt: serverTimestamp() });
        } else if (student.status === 'active' && student.lastInteractionAt.toDate() < ninetyDaysAgo) {
            // Student is active but hasn't interacted in a while, move to at-risk
            batch.update(studentRef, { status: 'at-risk', updatedAt: serverTimestamp() });
        }

      } else {
        // Student has unpaid bills, ensure their status is 'at-risk'.
        if (student.status !== 'at-risk') {
          batch.update(studentRef, { status: 'at-risk', updatedAt: serverTimestamp() });
        }
      }
    }

    if (createdCount > 0) {
        const logRef = doc(activityLogsCol(db, libraryId));
        batch.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'monthly_payments_created',
          details: { count: createdCount },
          timestamp: serverTimestamp(),
        });
    }

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error creating monthly payments:', e);
    return { success: false, error: e.message || "An unknown error occurred." };
  }
}

export async function markPaymentAsPaid(
  db: Firestore,
  libraryId: string,
  paymentId: string,
  studentDocId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    await runTransaction(db, async (transaction) => {
      const paymentRef = doc(db, `libraries/${libraryId}/payments/${paymentId}`);
      const studentRef = doc(db, `libraries/${libraryId}/students/${studentDocId}`);
      
      const [paymentDoc, studentDoc] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(studentRef),
      ]);

      if (!paymentDoc.exists()) throw new Error('Payment document not found.');
      if (!studentDoc.exists()) throw new Error('Student document not found.');
      
      const paymentData = paymentDoc.data() as Payment;
      if (paymentData.status === 'paid') return; // Idempotent: already paid
      
      const wasOverdue = paymentData.status === 'overdue';

      // Update payment
      transaction.update(paymentRef, {
        status: 'paid',
        paymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // This query needs to run outside the transaction or be re-architected.
      // For now, we query it before the transaction starts to determine student status.
      const otherUnpaidQuery = query(
        paymentsCol(db, libraryId),
        where('studentId', '==', studentDoc.data().id),
        where('status', 'in', ['pending', 'overdue']),
      );
      const otherUnpaidSnapshot = await getDocs(otherUnpaidQuery);
      
      // We check if the number of unpaid docs is exactly 1 (the one we're currently paying)
      const hasOtherUnpaid = otherUnpaidSnapshot.docs.length > 1;

      // Update student record
      transaction.update(studentRef, {
        fibonacciStreak: wasOverdue ? 0 : increment(1),
        status: hasOtherUnpaid ? 'at-risk' : 'active',
        lastInteractionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create activity log
      const logRef = doc(activityLogsCol(db, libraryId));
      transaction.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'payment_processed',
        details: {
          studentName: studentDoc.data().name,
          amount: paymentData.amount,
          paymentId: paymentId,
        },
        timestamp: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error processing payment:', e);
    return { success: false, error: e.message || "An unknown error occurred." };
  }
}
