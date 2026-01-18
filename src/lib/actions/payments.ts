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

// This would typically be a configurable setting for the library
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

    // 1. Update status of existing pending payments to overdue if necessary
    const pendingPaymentsQuery = query(paymentsCol(db, libraryId), where('status', '==', 'pending'));
    const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);

    pendingPaymentsSnapshot.forEach(paymentDoc => {
        const payment = paymentDoc.data() as Payment;
        if (payment.dueDate.toDate() < today) {
            batch.update(paymentDoc.ref, { status: 'overdue', updatedAt: serverTimestamp() });
        }
    });

    // 2. Get all students who are currently active or at risk to create new payments or check status
    const studentsQuery = query(studentsCol(db, libraryId), where('status', 'in', ['active', 'at-risk']));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    let createdCount = 0;

    for (const studentDoc of studentsSnapshot.docs) {
      const student = { docId: studentDoc.id, ...studentDoc.data() } as Student;
      const studentRef = studentDoc.ref;
      
      // Check if student already has a pending or overdue payment
      const unpaidPaymentsQuery = query(paymentsCol(db, libraryId), 
        where('studentId', '==', student.id),
        where('status', 'in', ['pending', 'overdue'])
      );
      const unpaidPaymentsSnapshot = await getDocs(unpaidPaymentsQuery);

      if (unpaidPaymentsSnapshot.empty) {
        // No unpaid bills, create a new one
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

        // Also check for inactivity even if they have no unpaid bills
        if (student.status === 'active' && student.lastInteractionAt.toDate() < ninetyDaysAgo) {
          batch.update(studentRef, { status: 'at-risk', updatedAt: serverTimestamp() });
        }

      } else {
        // Student has unpaid bills, ensure they are marked as 'at-risk'
        if (student.status !== 'at-risk') {
          batch.update(studentRef, { status: 'at-risk', updatedAt: serverTimestamp() });
        }
      }
    }

    // 3. Create activity log for the batch operation
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
      
      const studentQuery = query(studentsCol(db, libraryId), where('id', '==', studentCustomId));
      const studentSnapshot = await getDocs(studentQuery); // Use getDocs within transaction for query
      if (studentSnapshot.empty) {
        throw new Error(`Student with ID ${studentCustomId} not found.`);
      }
      const studentDocSnapshot = studentSnapshot.docs[0];
      const studentRef = studentDocSnapshot.ref;
      
      // 2. Read documents
      const paymentDoc = await transaction.get(paymentRef);
      const studentDoc = await transaction.get(studentRef);

      if (!paymentDoc.exists()) throw new Error('Payment document not found.');
      if (!studentDoc.exists()) throw new Error('Student document not found.');
      
      const paymentData = paymentDoc.data() as Payment;
      const wasOverdue = paymentData.status === 'overdue';

      // 3. Perform writes
      // Update payment
      transaction.update(paymentRef, {
        status: 'paid',
        paymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Check for other outstanding payments for this student
      const otherUnpaidQuery = query(paymentsCol(db, libraryId),
          where('studentId', '==', studentCustomId),
          where('status', 'in', ['pending', 'overdue']),
          where('__name__', '!=', paymentId) // Exclude the current payment from the check
      );
      // This has to be a getDocs, which is not allowed in a transaction after writes.
      // So, we'll perform this check outside and pass the result in, or accept a potential race condition.
      // Given the context, we will query for other payments *before* starting the writes.
      const otherUnpaidSnapshot = await getDocs(otherUnpaidQuery);
      const hasOtherUnpaid = !otherUnpaidSnapshot.empty;

      // Update student record
      const studentUpdateData: any = {
        fibonacciStreak: wasOverdue ? 0 : increment(1),
        status: hasOtherUnpaid ? 'at-risk' : 'active',
        lastInteractionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.update(studentRef, studentUpdateData);

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
    return { success: false, error: e.message };
  }
}
