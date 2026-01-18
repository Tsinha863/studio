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

/**
 * Creates monthly payment obligations for active students and reconciles student/payment statuses.
 * This function is idempotent and safe to run multiple times.
 *
 * 1. Transitions any 'pending' payments with a past due date to 'overdue'.
 * 2. Identifies students who have become 'at-risk' due to inactivity.
 * 3. Creates new 'pending' payments for students who have no outstanding obligations.
 * 4. Transitions students with newly overdue payments to 'at-risk'.
 */
export async function createMonthlyPayments(
  db: Firestore,
  libraryId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - INACTIVITY_THRESHOLD_DAYS);
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month

    // Step 1: Transition 'pending' payments to 'overdue' if their due date has passed.
    const pendingToOverdueQuery = query(
        paymentsCol(db, libraryId), 
        where('status', '==', 'pending'),
        where('dueDate', '<', Timestamp.fromDate(today))
    );
    const pendingToOverdueSnapshot = await getDocs(pendingToOverdueQuery);
    const newlyOverdueStudentIds = new Set<string>();
    pendingToOverdueSnapshot.forEach(paymentDoc => {
        batch.update(paymentDoc.ref, { status: 'overdue', updatedAt: serverTimestamp() });
        newlyOverdueStudentIds.add(paymentDoc.data().studentId);
    });

    // Step 2: Query all students who are not 'inactive'.
    const activeStudentsQuery = query(studentsCol(db, libraryId), where('status', 'in', ['active', 'at-risk']));
    const studentsSnapshot = await getDocs(activeStudentsQuery);
    
    const allUnpaidPaymentsQuery = query(paymentsCol(db, libraryId), where('status', 'in', ['pending', 'overdue']));
    const allUnpaidPaymentsSnapshot = await getDocs(allUnpaidPaymentsQuery);
    const studentsWithUnpaidBills = new Set(allUnpaidPaymentsSnapshot.docs.map(doc => doc.data().studentId));

    let createdCount = 0;

    for (const studentDoc of studentsSnapshot.docs) {
      const student = { docId: studentDoc.id, ...studentDoc.data() } as Student;
      
      // Step 3: Create new payments for students with no unpaid bills.
      if (!studentsWithUnpaidBills.has(student.id)) {
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
      }

      // Step 4: Check for inactivity and update status to 'at-risk'.
      if (student.status === 'active' && student.lastInteractionAt.toDate() < ninetyDaysAgo) {
        batch.update(studentDoc.ref, { status: 'at-risk', updatedAt: serverTimestamp() });
      }
    }

    // Step 5: Transition students with newly overdue payments to 'at-risk'.
    for (const studentId of newlyOverdueStudentIds) {
      // We need to find the main student document ID, which is the custom ID itself in our case.
      const studentRef = doc(db, `libraries/${libraryId}/students/${studentId}`);
      batch.update(studentRef, { status: 'at-risk', updatedAt: serverTimestamp() });
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

/**
 * Marks a payment as 'paid' and updates the corresponding student's status and streak.
 * This is a fully atomic transaction.
 *
 * 1. Reads the Payment and Student documents.
 * 2. Updates the Payment status to 'paid'.
 * 3. Updates the Student's fibonacciStreak (resets if payment was overdue) and status to 'active'.
 * 4. Updates the Student's lastInteractionAt timestamp.
 * 5. Creates an activity log entry.
 */
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

      // Update student record. Student becomes active on payment.
      // The reconciliation job (`createMonthlyPayments`) will set them back to 'at-risk' if other payments are due.
      transaction.update(studentRef, {
        fibonacciStreak: wasOverdue ? 0 : increment(1),
        status: 'active',
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
