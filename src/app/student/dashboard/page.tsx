'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase } from '@/firebase';
import type { Student, Bill, SeatBooking } from '@/lib/types';
import { WelcomeHeader } from '@/components/student/dashboard/welcome-header';
import { AssignedSeatCard } from '@/components/student/dashboard/assigned-seat-card';
import { UpcomingBillCard } from '@/components/student/dashboard/upcoming-bill-card';
import { FibonacciStreakCard } from '@/components/student/dashboard/fibonacci-streak-card';
import { SuggestionForm } from '@/components/student/dashboard/suggestion-form';
import { Skeleton } from '@/components/ui/skeleton';

const BillHistoryTable = dynamic(
  () => import('@/components/student/dashboard/bill-history-table').then(mod => mod.BillHistoryTable),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" /> 
  }
);

export default function StudentDashboardPage() {
  const { firestore, user, libraryId } = useFirebase();
  const studentId = user?.uid;

  const studentDocRef = React.useMemo(() => {
    if (!firestore || !studentId || !libraryId) return null;
    return doc(firestore, `libraries/${libraryId}/students`, studentId);
  }, [firestore, studentId, libraryId]);
  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  const billsQuery = React.useMemo(() => {
    if (!firestore || !studentId || !libraryId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/bills`),
      where('studentId', '==', studentId),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, studentId, libraryId]);
  const { data: bills, isLoading: isLoadingBills } = useCollection<Bill>(billsQuery);

  const bookingsQuery = React.useMemo(() => {
    if (!firestore || !studentId || !libraryId) return null;
    return query(
        collection(firestore, `libraries/${libraryId}/seatBookings`),
        where('studentId', '==', studentId),
        where('endTime', '>=', Timestamp.now()),
        orderBy('endTime', 'asc')
    );
  }, [firestore, studentId, libraryId]);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<SeatBooking>(bookingsQuery);

  const upcomingBill = React.useMemo(() => {
    return bills.find(b => b.status === 'Due' || b.status === 'Overdue');
  }, [bills]);

  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader studentName={student?.name} isLoading={isLoadingStudent} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AssignedSeatCard bookings={bookings} isLoading={isLoadingBookings} />
        <UpcomingBillCard bill={upcomingBill} isLoading={isLoadingBills} />
        <FibonacciStreakCard streak={student?.fibonacciStreak || 0} isLoading={isLoadingStudent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
            <BillHistoryTable bills={bills} isLoading={isLoadingBills} />
        </div>
        <div className="lg:col-span-2">
            <SuggestionForm student={student as (Student & {id: string}) | null} libraryId={libraryId} isLoading={isLoadingStudent}/>
        </div>
      </div>
    </div>
  );
}
