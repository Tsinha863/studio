'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Calendar as CalendarIcon, X as ClearIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  collection,
  query,
  orderBy,
  doc,
  serverTimestamp,
  runTransaction,
  increment,
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
import { useCollection, useFirebase, errorEmitter } from '@/firebase';
import type { Bill, Student } from '@/lib/types';
import { generateBillText } from '@/ai/flows/generate-bill-text';
import { FirestorePermissionError } from '@/firebase/errors';

import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { columns as billColumns } from '@/components/admin/billing/columns';
import { Spinner } from '@/components/spinner';
import { Skeleton } from '@/components/ui/skeleton';

const BillDialog = dynamic(() => import('@/components/bill-dialog').then(mod => mod.BillDialog), { 
    ssr: false,
});


type BillWithId = Bill & { id: string };

type BillDialogState = {
  isOpen: boolean;
  billText?: string;
  bill?: BillWithId;
};

export default function BillingPage() {
  const { toast } = useToast();
  const { firestore, user, libraryId } = useFirebase();
  const [isPaying, setIsPaying] = React.useState<string | false>(false);
  const [billDialogState, setBillDialogState] = React.useState<BillDialogState>({ isOpen: false });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const billsQuery = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/bills`),
      orderBy('dueDate', 'desc')
    );
  }, [firestore, libraryId]);
  const { data: bills, isLoading: isLoadingBills, error } = useCollection<Bill>(billsQuery);
  
  const handleMarkAsPaid = React.useCallback(async (bill: BillWithId) => {
    if (!user || !firestore || !libraryId || !bill.studentId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: "Student ID not found. Cannot process payment.",
      });
      return;
    };
    setIsPaying(bill.id);

    const billRef = doc(firestore, `libraries/${libraryId}/bills/${bill.id}`);
    const studentRef = doc(firestore, `libraries/${libraryId}/students/${bill.studentId!}`);
    const paymentRef = doc(collection(firestore, `libraries/${libraryId}/payments`));

    try {
        const studentDoc = await runTransaction(firestore, async (transaction) => {
            const billDoc = await transaction.get(billRef);
            if (!billDoc.exists() || billDoc.data().status === 'Paid') {
                throw new Error("Bill not found or already paid.");
            }

            // 1. Create Payment
            transaction.set(paymentRef, {
                id: paymentRef.id,
                libraryId: libraryId,
                studentId: bill.studentId,
                billId: bill.id,
                amount: bill.totalAmount,
                paymentDate: serverTimestamp(),
                method: 'Admin',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 2. Update Bill
            transaction.update(billRef, {
                status: 'Paid',
                paidAt: serverTimestamp(),
                paymentId: paymentRef.id,
                updatedAt: serverTimestamp(),
            });

            // 3. Update Student's Fibonacci Streak
            const studentSnap = await transaction.get(studentRef);
            if (!studentSnap.exists()) throw new Error("Student not found.");
            
            const wasOverdue = bill.status === 'Overdue';
            transaction.update(studentRef, {
                fibonacciStreak: wasOverdue ? 0 : increment(1),
                status: 'active',
                lastInteractionAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            // 4. Create Activity Log
            const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
            transaction.set(logRef, {
                libraryId: libraryId,
                user: { id: user.uid, name: user.displayName || 'Admin' },
                activityType: 'payment_processed',
                details: { studentName: bill.studentName, amount: bill.totalAmount, billId: bill.id },
                timestamp: serverTimestamp(),
            });

            return studentSnap.data() as Student;
        });

        toast({
          title: 'Payment Confirmed',
          description: `${bill.studentName}'s payment of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.totalAmount)} has been recorded.`,
        });
        
        try {
            const { billText } = await generateBillText({
              bill: {
                id: bill.id,
                studentName: bill.studentName,
                issuedAt: (bill.issuedAt.toDate()).toISOString(),
                totalAmount: bill.totalAmount,
                lineItems: bill.lineItems,
              },
              library: { name: "CampusHub Library" }
            });
            setBillDialogState({ isOpen: true, billText, bill: bill });
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Receipt Generation Failed",
                description: "Could not generate AI bill, but payment was recorded."
            })
        }
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
          path: billRef.path,
          operation: 'update',
        });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsPaying(false);
    }
  }, [firestore, user, toast, libraryId]);

  const memoizedColumns = React.useMemo(() => billColumns({ handleMarkAsPaid, isPaying }), [handleMarkAsPaid, isPaying]);
  
  const table = useReactTable({
    data: bills,
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
  
  const closeBillDialog = () => setBillDialogState({ isOpen: false });

  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Billing Management
          </h1>
          <p className="text-muted-foreground">
            Track and process all student bills and payments.
          </p>
        </div>
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
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Due">Due</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>
            {isFiltered && (
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-10 w-full sm:w-auto" type="button">
                <ClearIcon className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
           {error && <p className="text-sm font-medium text-destructive">Error: {error.message}</p>}
          <DataTable
            table={table}
            columns={memoizedColumns}
            isLoading={isLoadingBills}
          />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>
      
      <BillDialog
        isOpen={billDialogState.isOpen}
        onClose={closeBillDialog}
        billText={billDialogState.billText}
        bill={billDialogState.bill}
      />
    </div>
  );
}
