
'use client';

import * as React from 'react';
import { collection, query, where, orderBy, limit, doc, getDocs } from 'firebase/firestore';

import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Student, PrintRequest } from '@/lib/types';
import { PrintRequestForm } from '@/components/student/print-on-desk/print-request-form';
import { PrintHistoryTable } from '@/components/student/print-on-desk/print-history-table';

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function PrintOnDeskPage() {
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

  // 1. Get current student's data
  const studentDocRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`, studentId);
  }, [firestore, studentId]);

  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  // 2. Get student's print requests
  const printRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`),
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
