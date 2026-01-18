'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Student, Payment } from '@/lib/types';
import { WelcomeHeader } from '@/components/student/dashboard/welcome-header';
import { AssignedSeatCard } from '@/components/student/dashboard/assigned-seat-card';
import { UpcomingPaymentCard } from '@/components/student/dashboard/upcoming-payment-card';
import { FibonacciStreakCard } from '@/components/student/dashboard/fibonacci-streak-card';
import { SuggestionForm } from '@/components/student/dashboard/suggestion-form';

const PaymentHistoryTable = dynamic(
  () => import('@/components/student/dashboard/payment-history-table').then(mod => mod.PaymentHistoryTable),
  { ssr: false }
);

// TODO: Replace with actual logged-in user's library and email
const HARDCODED_LIBRARY_ID = 'library1';
const HARDCODED_STUDENT_EMAIL = 'student@campushub.com'; 

export default function StudentDashboardPage() {
  const { firestore, user } = useFirebase();

  // --- Data Fetching ---
  
  // 1. Get current student's data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`),
      where('email', '==', HARDCODED_STUDENT_EMAIL),
      limit(1)
    );
  }, [firestore, user]);

  const { data: studentData, isLoading: isLoadingStudent } = useCollection<Omit<Student, 'docId'>>(studentQuery);
  const student = React.useMemo(() => (studentData && studentData[0]) ? { ...studentData[0], docId: studentData[0].id } : null, [studentData]);

  // 2. Get student's payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !student) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
      where('studentId', '==', student.id),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, user, student]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Omit<Payment, 'docId'>>(paymentsQuery);

  const upcomingPayment = React.useMemo(() => {
    return payments?.find(p => p.status === 'pending' || p.status === 'overdue');
  }, [payments]);

  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader studentName={student?.name} isLoading={isLoadingStudent} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AssignedSeatCard assignments={student?.assignments || []} isLoading={isLoadingStudent} />
        <UpcomingPaymentCard payment={upcomingPayment} isLoading={isLoadingPayments} />
        <FibonacciStreakCard streak={student?.fibonacciStreak || 0} isLoading={isLoadingStudent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
            <PaymentHistoryTable payments={payments || []} isLoading={isLoadingPayments} />
        </div>
        <div className="lg:col-span-2">
            <SuggestionForm studentId={student?.id} libraryId={HARDCODED_LIBRARY_ID} isLoading={isLoadingStudent}/>
        </div>
      </div>
    </div>
  );
}
