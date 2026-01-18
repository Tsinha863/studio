'use server';

/**
 * @deprecated All business logic has been moved to client components for improved error handling and debugging.
 * See `src/app/admin/payments/page.tsx`.
 */

import {
  Firestore,
  runTransaction,
} from 'firebase/firestore';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

export async function createMonthlyPayments(
  db: Firestore,
  libraryId: string,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}

export async function markPaymentAsPaid(
  db: Firestore,
  libraryId: string,
  paymentId: string,
  studentDocId: string,
  actor: Actor
): Promise<ActionResponse> {
  throw new Error('This function is deprecated. Use client-side logic instead.');
}
