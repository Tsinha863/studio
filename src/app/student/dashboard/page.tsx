
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
import { Skeleton } from '@/components/ui/skeleton';

const PaymentHistoryTable = dynamic(
  () => import('@/components/student/dashboard/payment-history-table').then(mod => mod.PaymentHistoryTable),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" /> 
  }
);

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function StudentDashboardPage() {
  const { firestore, user } = useFirebase();
  const [studentEmail, setStudentEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Since this is a demo with anonymous auth, we retrieve the student's email from session storage.
    // In a production app, this would come from the authenticated user object (`user?.email`).
    const demoEmail = sessionStorage.getItem('demoStudentEmail');
    if (demoEmail) {
      setStudentEmail(demoEmail);
    } else if (user?.email) {
      setStudentEmail(user.email);
    }
  }, [user]);

  // --- Data Fetching ---
  
  // 1. Get current student's data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user || !studentEmail) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`),
      where('email', '==', studentEmail),
      limit(1)
    );
  }, [firestore, user, studentEmail]);

  const { data: studentData, isLoading: isLoadingStudent } = useCollection<Student>(studentQuery);
  const student = React.useMemo(() => (studentData && studentData[0]) ? studentData[0] : null, [studentData]);

  // 2. Get student's payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !student) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
      where('studentId', '==', student.id),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, user, student]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

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
            <SuggestionForm student={student} libraryId={HARDCODED_LIBRARY_ID} isLoading={isLoadingStudent}/>
        </div>
      </div>
    </div>
  );
}
