'use client';

import * as React from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Student, PrintRequest } from '@/lib/types';
import { PrintRequestForm } from '@/components/student/print-on-desk/print-request-form';
import { PrintHistoryTable } from '@/components/student/print-on-desk/print-history-table';

// TODO: Replace with actual logged-in user's library and email
const HARDCODED_LIBRARY_ID = 'library1';
const HARDCODED_STUDENT_EMAIL = 'student@campushub.com';

export default function PrintOnDeskPage() {
  const { firestore, user } = useFirebase();

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

  // 2. Get student's print requests
  const printRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !student) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`),
      where('studentId', '==', student.id),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, student]);

  const { data: printRequests, isLoading: isLoadingPrintRequests } = useCollection<Omit<PrintRequest, 'docId'>>(printRequestsQuery);

  return (
    <div className="flex flex-col gap-6">
       <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                Print on Desk
            </h1>
            <p className="text-muted-foreground">
                Upload a document and send it to the library printer.
            </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
            <PrintRequestForm
                student={student}
                libraryId={HARDCODED_LIBRARY_ID}
                isLoading={isLoadingStudent}
            />
        </div>
        <div className="lg:col-span-3">
            <PrintHistoryTable
                requests={printRequests || []}
                isLoading={isLoadingPrintRequests}
            />
        </div>
      </div>
    </div>
  );
}
