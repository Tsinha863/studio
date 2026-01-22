
'use client';

import * as React from 'react';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Student, PrintRequest } from '@/lib/types';
import { PrintRequestForm } from '@/components/student/print-on-desk/print-request-form';
import { PrintHistoryTable } from '@/components/student/print-on-desk/print-history-table';
import { LIBRARY_ID } from '@/lib/config';

export default function PrintOnDeskPage() {
  const { firestore, user } = useFirebase();

  // The AuthGuard ensures user is available. The user's UID is the student's document ID.
  const studentId = user?.uid;

  // 1. Get current student's data
  const studentDocRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return doc(firestore, `libraries/${LIBRARY_ID}/students`, studentId);
  }, [firestore, studentId]);

  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  // 2. Get student's print requests
  const printRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/printRequests`),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, studentId]);

  const { data: printRequests, isLoading: isLoadingPrintRequests } = useCollection<PrintRequest>(printRequestsQuery);

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
                student={student as (Student & {id: string}) | null}
                libraryId={LIBRARY_ID}
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
