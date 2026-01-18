'use server';

/**
 * @deprecated All business logic has been moved to client components for improved error handling and debugging.
 * See `src/app/admin/expenses/page.tsx` and `src/components/admin/expenses/expense-form.tsx`.
 */

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


export async function addExpense(
  db: Firestore,
  libraryId: string,
  data: ExpenseFormValues,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function updateExpense(
  db: Firestore,
  libraryId: string,
  docId: string,
  data: ExpenseFormValues,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function deleteExpense(
  db: Firestore,
  libraryId: string,
  docId: string,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}
