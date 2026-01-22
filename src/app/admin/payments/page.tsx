
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle, Calendar as CalendarIcon, X as ClearIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
  where,
  Timestamp,
  getDocs,
  runTransaction,
  increment,
  getDoc,
} from 'firebase/firestore';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter } from '@/firebase';
import type { Payment, Student } from '@/lib/types';
import { generateSimulatedReceipt } from '@/ai/flows/generate-simulated-receipt';

import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { columns as paymentColumns } from '@/components/admin/payments/columns';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { Spinner } from '@/components/spinner';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';
const MONTHLY_FEE = 50.00;
const INACTIVITY_THRESHOLD_DAYS = 90;

type StudentWithId = Student & { id: string };
type PaymentWithId = Payment & { id: string };

type ReceiptState = {
  isOpen: boolean;
  receiptText?: string;
  studentName?: string;
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isCreating, setIsCreating] = React.useState(false);
  const [isPaying, setIsPaying] = React.useState<string | false>(false);
  const [receiptState, setReceiptState] = React.useState<ReceiptState>({ isOpen: false });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, user]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);
  
  const memoizedColumns = React.useMemo(() => paymentColumns({ handleMarkAsPaid, isPaying }), [isPaying]);
  
  const table = useReactTable({
    data: payments || [],
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const handleCreatePayments = () => {
    if (!user || !firestore) return;
    setIsCreating(true);

    toast({
      title: 'Payment Generation Started',
      description: 'Processing student payments in the background.',
    });

    const createPaymentsLogic = async () => {
      const batch = writeBatch(firestore);
      const actor = { id: user.uid, name: user.displayName || 'Admin' };
      const today = new Date();
      const ninetyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - INACTIVITY_THRESHOLD_DAYS);
      const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
  
      const paymentsCol = collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`);
      const studentsCol = collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`);

      // 1. Transition 'pending' payments to 'overdue'
      const pendingToOverdueQuery = query(
          paymentsCol, 
          where('status', '==', 'pending'),
          where('dueDate', '<', Timestamp.fromDate(today))
      );
      const pendingToOverdueSnapshot = await getDocs(pendingToOverdueQuery);
      const newlyOverdueStudentIds = new Set<string>();
      pendingToOverdueSnapshot.forEach(paymentDoc => {
          batch.update(paymentDoc.ref, { status: 'overdue', updatedAt: serverTimestamp() });
          newlyOverdueStudentIds.add(paymentDoc.data().studentId);
      });
  
      // 2. Query all students not 'inactive' and all unpaid payments
      const activeStudentsQuery = query(studentsCol, where('status', 'in', ['active', 'at-risk']));
      const studentsSnapshot = await getDocs(activeStudentsQuery);
      
      const allUnpaidPaymentsQuery = query(paymentsCol, where('status', 'in', ['pending', 'overdue']));
      const allUnpaidPaymentsSnapshot = await getDocs(allUnpaidPaymentsQuery);
      const studentsWithUnpaidBills = new Set(allUnpaidPaymentsSnapshot.docs.map(doc => doc.data().studentId));
  
      let createdCount = 0;
  
      for (const studentDoc of studentsSnapshot.docs) {
        const student = { id: studentDoc.id, ...studentDoc.data() } as StudentWithId;
        
        // 3. Create new payments for students with no unpaid bills
        if (!studentsWithUnpaidBills.has(student.id)) {
          const paymentRef = doc(paymentsCol);
          batch.set(paymentRef, {
            libraryId: HARDCODED_LIBRARY_ID,
            studentId: student.id,
            studentName: student.name,
            amount: MONTHLY_FEE,
            status: 'pending',
            dueDate: Timestamp.fromDate(dueDate),
            paymentDate: null,
            method: 'Online',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          createdCount++;
        }
  
        // 4. Check for inactivity
        if (student.status === 'active' && student.lastInteractionAt.toDate() < ninetyDaysAgo) {
          batch.update(studentDoc.ref, { status: 'at-risk', updatedAt: serverTimestamp() });
        }
      }
  
      // 5. Update students with newly overdue payments to 'at-risk'
      for (const studentId of newlyOverdueStudentIds) {
        const studentDocRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students/${studentId}`);
        batch.update(studentDocRef, { status: 'at-risk', updatedAt: serverTimestamp() });
      }
  
      if (createdCount > 0) {
          const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
          batch.set(logRef, {
            libraryId: HARDCODED_LIBRARY_ID,
            user: actor,
            activityType: 'monthly_payments_created',
            details: { count: createdCount },
            timestamp: serverTimestamp(),
          });
      }
      
      return { count: createdCount };
    };

    // Run the logic and commit non-blockingly
    createPaymentsLogic().then(({ count }) => {
      toast({
        title: 'Payments Generated',
        description: `${count} new payment obligations were created.`,
      });
    }).catch(error => {
      console.error("CREATE MONTHLY PAYMENTS ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : "Could not create payments.",
      });
    }).finally(() => {
      setIsCreating(false);
    });
  };

  const handleMarkAsPaid = (payment: PaymentWithId) => {
    if (!user || !firestore || !payment.studentId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: "Student ID not found. Cannot process payment.",
      });
      return;
    };
    setIsPaying(payment.id);

    // Optimistic UI updates
    toast({
      title: 'Payment Confirmed',
      description: `${payment.studentName}'s payment of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)} has been recorded.`,
    });

    const transactionPromise = runTransaction(firestore, async (transaction) => {
      const paymentRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments/${payment.id}`);
      const studentRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students/${payment.studentId}`);
      
      const [paymentDoc, studentDoc] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(studentRef),
      ]);

      if (!paymentDoc.exists()) throw new Error('Payment document not found.');
      if (!studentDoc.exists()) throw new Error('Student document not found.');
      
      const paymentData = paymentDoc.data() as Payment;
      if (paymentData.status === 'paid') return; // Idempotent
      
      const wasOverdue = paymentData.status === 'overdue';

      // Update payment
      transaction.update(paymentRef, {
        status: 'paid',
        paymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update student
      transaction.update(studentRef, {
        fibonacciStreak: wasOverdue ? 0 : increment(1),
        status: 'active',
        lastInteractionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create activity log
      const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
      transaction.set(logRef, {
        libraryId: HARDCODED_LIBRARY_ID,
        user: { id: user.uid, name: user.displayName || 'Admin' },
        activityType: 'payment_processed',
        details: {
          studentName: studentDoc.data().name,
          amount: paymentData.amount,
          paymentId: payment.id,
        },
        timestamp: serverTimestamp(),
      });
    });

    transactionPromise.then(async () => {
        // This now runs after transaction is successful
        const studentRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students/${payment.studentId!}`);
        const studentDoc = await getDoc(studentRef);

        if (studentDoc.exists()) {
            const student = studentDoc.data() as Student;
            const receiptInput = {
                studentName: student.name,
                paymentAmount: payment.amount,
                paymentDate: new Date().toISOString().split('T')[0],
                fibonacciStreak: student.fibonacciStreak || 0,
                studentStatus: 'active',
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
    }).catch(error => {
      console.error("MARK AS PAID ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not process payment.',
      });
    }).finally(() => {
      setIsPaying(false);
    });
  };
  
  const closeReceiptDialog = () => setReceiptState({ isOpen: false });

  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Payment Management
          </h1>
          <p className="text-muted-foreground">
            Create monthly invoices and track student payments.
          </p>
        </div>
        <Button type="button" onClick={handleCreatePayments} disabled={isCreating}>
          {isCreating ? <Spinner className="mr-2" /> : <PlusCircle className="mr-2" />}
          {isCreating ? 'Creating...' : 'Create Monthly Payments'}
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              placeholder="Filter by student name..."
              value={(table.getColumn('studentName')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('studentName')?.setFilterValue(event.target.value)
              }
              className="h-10 w-full sm:max-w-sm"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn(
                    "h-10 w-full justify-start text-left font-normal sm:w-[240px]",
                    !table.getColumn('dueDate')?.getFilterValue() && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {table.getColumn('dueDate')?.getFilterValue() ? format(table.getColumn('dueDate')?.getFilterValue() as Date, "PPP") : <span>Filter by due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={table.getColumn('dueDate')?.getFilterValue() as Date}
                  onSelect={(date) => table.getColumn('dueDate')?.setFilterValue(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn(
                    "h-10 w-full justify-start text-left font-normal sm:w-[240px]",
                    !table.getColumn('paymentDate')?.getFilterValue() && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {table.getColumn('paymentDate')?.getFilterValue() ? format(table.getColumn('paymentDate')?.getFilterValue() as Date, "PPP") : <span>Filter by payment date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={table.getColumn('paymentDate')?.getFilterValue() as Date}
                  onSelect={(date) => table.getColumn('paymentDate')?.setFilterValue(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select
                value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
                onValueChange={(value) => {
                    const filterValue = value === 'all' ? null : [value];
                    table.getColumn('status')?.setFilterValue(filterValue);
                }}
            >
                <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>
            {isFiltered && (
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-10 w-full sm:w-auto" type="button">
                <ClearIcon className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
          <DataTable
            table={table}
            columns={memoizedColumns}
            isLoading={isLoadingPayments}
          />
          <DataTablePagination table={table} />
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
