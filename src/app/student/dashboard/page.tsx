
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Student, Payment, SeatBooking } from '@/lib/types';
import { WelcomeHeader } from '@/components/student/dashboard/welcome-header';
import { AssignedSeatCard } from '@/components/student/dashboard/assigned-seat-card';
import { UpcomingPaymentCard } from '@/components/student/dashboard/upcoming-payment-card';
import { FibonacciStreakCard } from '@/components/student/dashboard/fibonacci-streak-card';
import { SuggestionForm } from '@/components/student/dashboard/suggestion-form';
import { Skeleton } from '@/components/ui/skeleton';
import { LIBRARY_ID } from '@/lib/config';

const PaymentHistoryTable = dynamic(
  () => import('@/components/student/dashboard/payment-history-table').then(mod => mod.PaymentHistoryTable),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" /> 
  }
);

export default function StudentDashboardPage() {
  const { firestore, user } = useFirebase();

  // The AuthGuard ensures user is available. The user's UID is the student's document ID.
  const studentId = user?.uid;

  // --- Data Fetching ---
  
  // 1. Get current student's data by their ID (UID)
  const studentDocRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return doc(firestore, `libraries/${LIBRARY_ID}/students`, studentId);
  }, [firestore, studentId]);

  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  // 2. Get student's payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/payments`),
      where('studentId', '==', studentId),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, studentId]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  // 3. Get student's upcoming seat bookings
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
        collection(firestore, `libraries/${LIBRARY_ID}/seatBookings`),
        where('studentId', '==', studentId),
        where('endTime', '>=', Timestamp.now()),
        orderBy('endTime', 'asc')
    );
  }, [firestore, studentId]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<SeatBooking>(bookingsQuery);

  const upcomingPayment = React.useMemo(() => {
    return payments?.find(p => p.status === 'pending' || p.status === 'overdue');
  }, [payments]);

  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader studentName={student?.name} isLoading={isLoadingStudent} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AssignedSeatCard bookings={bookings || []} isLoading={isLoadingBookings} />
        <UpcomingPaymentCard payment={upcomingPayment} isLoading={isLoadingPayments} />
        <FibonacciStreakCard streak={student?.fibonacciStreak || 0} isLoading={isLoadingStudent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
            <PaymentHistoryTable payments={payments || []} isLoading={isLoadingPayments} />
        </div>
        <div className="lg:col-span-2">
            <SuggestionForm student={student as (Student & {id: string}) | null} libraryId={LIBRARY_ID} isLoading={isLoadingStudent}/>
        </div>
      </div>
    </div>
  );
}
