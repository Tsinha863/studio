'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { expenseFormSchema, type ExpenseFormValues } from '../schemas';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

const expensesCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/expenses`);
const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

export async function addExpense(
  db: Firestore,
  libraryId: string,
  data: ExpenseFormValues,
  actor: Actor
): Promise<ActionResponse> {
  const validation = expenseFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { expenseDate, ...expenseData } = validation.data;

  try {
    const batch = writeBatch(db);

    // 1. Create expense document
    const expenseRef = doc(expensesCol(db, libraryId));
    batch.set(expenseRef, {
      ...expenseData,
      libraryId,
      expenseDate: Timestamp.fromDate(expenseDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'expense_created',
      details: {
        amount: expenseData.amount,
        category: expenseData.category,
      },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error adding expense:', e);
    return { success: false, error: e.message };
  }
}

export async function updateExpense(
  db: Firestore,
  libraryId: string,
  docId: string,
  data: ExpenseFormValues,
  actor: Actor
): Promise<ActionResponse> {
  const validation = expenseFormSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { expenseDate, ...expenseData } = validation.data;

  try {
    const batch = writeBatch(db);

    // 1. Update expense document
    const expenseRef = doc(db, `libraries/${libraryId}/expenses/${docId}`);
    batch.update(expenseRef, {
      ...expenseData,
      expenseDate: Timestamp.fromDate(expenseDate),
      updatedAt: serverTimestamp(),
    });

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'expense_updated',
      details: {
        expenseId: docId,
        newAmount: expenseData.amount,
      },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error updating expense:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteExpense(
  db: Firestore,
  libraryId: string,
  docId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    // 1. Delete expense document
    const expenseRef = doc(db, `libraries/${libraryId}/expenses/${docId}`);
    batch.delete(expenseRef);

    // 2. Create activity log
    const logRef = doc(activityLogsCol(db, libraryId));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'expense_deleted',
      details: { expenseId: docId },
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting expense:', e);
    return { success: false, error: e.message };
  }
}
