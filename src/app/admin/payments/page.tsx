'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { HandCoins, PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Payment, Student } from '@/lib/types';
import {
  createMonthlyPayments,
  markPaymentAsPaid,
} from '@/lib/actions/payments';
import { generateSimulatedReceipt } from '@/ai/flows/generate-simulated-receipt';

import { columns as paymentColumns } from '@/components/admin/payments/columns';
import { ReceiptDialog } from '@/components/receipt-dialog';

const PaymentsDataTable = dynamic(
  () => import('@/components/admin/payments/data-table').then(mod => mod.PaymentsDataTable),
  { ssr: false }
);

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

type ReceiptState = {
  isOpen: boolean;
  receiptText?: string;
  studentName?: string;
};

// New type for payments with student seat details and docId
export type PaymentWithSeat = Payment & { seatNumber?: string | null, studentDocId?: string, docId: string };

export default function PaymentsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isCreating, setIsCreating] = React.useState(false);
  const [isPaying, setIsPaying] = React.useState<string | false>(false);
  const [receiptState, setReceiptState] = React.useState<ReceiptState>({ isOpen: false });

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, user]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`);
  }, [firestore, user]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Omit<Payment, 'id'>>(paymentsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  
  const paymentsWithDetails: PaymentWithSeat[] = React.useMemo(() => {
    if (!payments || !students) return [];
    const studentMap = new Map(students.map(s => [s.id, { 
        fibonacciStreak: s.fibonacciStreak, 
        status: s.status, 
        seatNumber: s.assignedSeatId,
        docId: s.docId // Firestore document ID
    }]));
    return payments.map(p => ({
        ...p,
        docId: p.id,
        seatNumber: studentMap.get(p.studentId)?.seatNumber || null,
        studentDocId: studentMap.get(p.studentId)?.docId,
    }));
  }, [payments, students]);

  const handleCreatePayments = async () => {
    if (!user || !firestore) return;
    setIsCreating(true);
    const result = await createMonthlyPayments(firestore, HARDCODED_LIBRARY_ID, {
      id: user.uid,
      name: user.displayName || 'Admin',
    });
    setIsCreating(false);

    if (result.success) {
      toast({
        title: 'Payments Created',
        description: 'Monthly payment records have been generated for active students.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not create payments.',
      });
    }
  };

  const handleMarkAsPaid = async (payment: PaymentWithSeat) => {
    if (!user || !firestore || !payment.studentDocId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: "Student document ID not found. Cannot process payment.",
      });
      return
    };
    setIsPaying(payment.id);

    const result = await markPaymentAsPaid(
      firestore,
      HARDCODED_LIBRARY_ID,
      payment.id,
      payment.studentDocId,
      { id: user.uid, name: user.displayName || 'Admin' }
    );

    if (result.success) {
      toast({
        title: 'Payment Confirmed',
        description: `${payment.studentName}'s payment of ₹${payment.amount} has been recorded.`,
      });

      const student = students?.find(s => s.docId === payment.studentDocId);
      if (student) {
          const receiptInput = {
              studentName: student.name,
              paymentAmount: payment.amount,
              paymentDate: new Date().toISOString().split('T')[0],
              fibonacciStreak: (student.fibonacciStreak || 0) + 1,
              studentStatus: 'active', // Assume they become active
              paymentId: payment.id,
          };
          
          try {
              const { receiptText } = await generateSimulatedReceipt(receiptInput);
              setReceiptState({ isOpen: true, receiptText, studentName: student.name });
          } catch (e) {
              console.error("Receipt generation failed:", e);
              toast({
                  variant: "destructive",
                  title: "Receipt Generation Failed",
                  description: "Could not generate AI receipt, but payment was recorded."
              })
          }
      }

    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not process payment.',
      });
    }
    setIsPaying(false);
  };
  
  const closeReceiptDialog = () => setReceiptState({ isOpen: false });

  const memoizedColumns = React.useMemo(() => paymentColumns({ handleMarkAsPaid, isPaying }), [isPaying]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Payment Management
          </h1>
          <p className="text-muted-foreground">
            Create monthly invoices and track student payments.
          </p>
        </div>
        <Button onClick={handleCreatePayments} disabled={isCreating}>
          <PlusCircle className="mr-2" />
          {isCreating ? 'Creating...' : 'Create Monthly Payments'}
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <PaymentsDataTable
            columns={memoizedColumns}
            data={paymentsWithDetails}
            isLoading={isLoadingPayments || isLoadingStudents}
          />
        </CardContent>
      </Card>
      
      <ReceiptDialog
        isOpen={receiptState.isOpen}
        onClose={closeReceiptDialog}
        receiptText={receiptState.receiptText}
        studentName={receiptState.studentName}
      />
    </div>
  );
}
