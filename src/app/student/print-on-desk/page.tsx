'use client';

import * as React from 'react';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase } from '@/firebase';
import type { Student, PrintRequest } from '@/lib/types';
import { PrintRequestForm } from '@/components/student/print-on-desk/print-request-form';
import { PrintHistoryTable } from '@/components/student/print-on-desk/print-history-table';

export default function PrintOnDeskPage() {
  const { firestore, user, libraryId } = useFirebase();
  const studentId = user?.uid;

  const studentDocRef = React.useMemo(() => {
    if (!firestore || !studentId || !libraryId) return null;
    return doc(firestore, `libraries/${libraryId}/students`, studentId);
  }, [firestore, studentId, libraryId]);
  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  const printRequestsQuery = React.useMemo(() => {
    if (!firestore || !studentId || !libraryId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/printRequests`),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, studentId, libraryId]);
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
                libraryId={libraryId}
                isLoading={isLoadingStudent}
            />
        </div>
        <div className="lg:col-span-3">
            <PrintHistoryTable
                requests={printRequests}
                isLoading={isLoadingPrintRequests}
            />
        </div>
      </div>
    </div>
  );
}
