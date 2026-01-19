
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, orderBy, limit, doc, getDocs } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
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
  const [studentId, setStudentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // A real user's ID is the source of truth.
    // For the demo flow, we fall back to session storage for the email.
    if (user?.uid) {
      setStudentId(user.uid);
    } else {
      const demoEmail = sessionStorage.getItem('demoStudentEmail');
      if (demoEmail) {
        // This part is for the demo student, which doesn't have a real auth UID
        // and must be looked up by email.
        const fetchStudentIdByEmail = async () => {
          if (!firestore) return;
          const q = query(
            collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`),
            where('email', '==', demoEmail),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setStudentId(snapshot.docs[0].id);
          }
        };
        fetchStudentIdByEmail();
      }
    }
  }, [user, firestore]);

  // --- Data Fetching ---
  
  // 1. Get current student's data by their ID (UID or custom)
  const studentDocRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`, studentId);
  }, [firestore, studentId]);

  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  // 2. Get student's payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
      where('studentId', '==', studentId),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, studentId]);

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
