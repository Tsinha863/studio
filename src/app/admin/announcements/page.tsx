
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter } from '@/firebase';
import type { Announcement } from '@/lib/types';
import { columns as announcementColumns } from '@/components/admin/announcements/columns';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/spinner';
import { LIBRARY_ID } from '@/lib/config';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});

const AnnouncementForm = dynamic(() => import('@/components/admin/announcements/announcement-form').then(mod => mod.AnnouncementForm), { 
    ssr: false,
    loading: () => <div className="h-[280px] flex items-center justify-center"><Spinner /></div>
});


type AnnouncementWithId = Announcement & { id: string };

type ModalState = {
  isOpen: boolean;
};

type AlertState = {
  isOpen: boolean;
  announcementId?: string;
};

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/announcements`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

  const memoizedColumns = React.useMemo(
    () => announcementColumns({ openDeleteAlert }),
    []
  );

  const table = useReactTable({
    data: announcements || [],
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const openModal = () => setModalState({ isOpen: true });
  const closeModal = () => setModalState({ isOpen: false });

  const openDeleteAlert = (announcement: AnnouncementWithId) =>
    setAlertState({ isOpen: true, announcementId: announcement.id });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, announcementId: undefined });

  const handleDelete = () => {
    if (!alertState.announcementId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated or announcement not found.',
      });
      return;
    }
    
    // Optimistic UI update
    closeDeleteAlert();
    toast({
      title: 'Announcement Deleted',
      description: 'The announcement has been removed.',
    });

    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const announcementRef = doc(firestore, `libraries/${LIBRARY_ID}/announcements/${alertState.announcementId}`);
    
    batch.delete(announcementRef);

    const logRef = doc(collection(firestore, `libraries/${LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
      libraryId: LIBRARY_ID,
      user: actor,
      activityType: 'announcement_deleted',
      details: { announcementId: alertState.announcementId },
      timestamp: serverTimestamp(),
    });

    // Non-blocking commit with error handling
    batch.commit().catch((serverError) => {
      console.error("DELETE ANNOUNCEMENT ERROR:", serverError);
      const permissionError = new FirestorePermissionError({
        path: announcementRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Announcements
          </h1>
          <p className="text-muted-foreground">
            Create and manage global announcements for all users.
          </p>
        </div>
        <Button type="button" onClick={openModal}>
          <PlusCircle className="mr-2" />
          New Announcement
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Filter by title..."
              value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('title')?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          </div>
          <DataTable
            table={table}
            columns={memoizedColumns}
            isLoading={isLoading}
            noResultsMessage="No announcements found."
          />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
            <DialogDescription>
              Fill in the form to create a new global announcement.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            libraryId={LIBRARY_ID}
            onSuccess={() => {
              closeModal();
              toast({
                title: 'Announcement Created',
                description: 'The new announcement has been published.',
              });
            }}
            onCancel={closeModal}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDeleteAlert()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
