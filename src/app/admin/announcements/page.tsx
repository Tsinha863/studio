'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';

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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Announcement } from '@/lib/types';
import { AnnouncementForm } from '@/components/admin/announcements/announcement-form';
import { AnnouncementsDataTable } from '@/components/admin/announcements/data-table';
import { columns as announcementColumns } from '@/components/admin/announcements/columns';
import { deleteAnnouncement } from '@/lib/actions/announcements';

type ModalState = {
  isOpen: boolean;
};

type AlertState = {
  isOpen: boolean;
  announcementId?: string;
};

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/announcements`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Omit<Announcement, 'id'>>(announcementsQuery);

  const announcementsWithDocId = React.useMemo(() => {
    return announcements?.map((a) => ({ ...a, docId: a.id })) ?? [];
  }, [announcements]);

  const openModal = () => setModalState({ isOpen: true });
  const closeModal = () => setModalState({ isOpen: false });

  const openDeleteAlert = (announcement: Announcement) =>
    setAlertState({ isOpen: true, announcementId: announcement.docId });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, announcementId: undefined });

  const handleDelete = async () => {
    if (!alertState.announcementId || !user || !firestore) return;

    const result = await deleteAnnouncement(
      firestore,
      HARDCODED_LIBRARY_ID,
      alertState.announcementId,
      { id: user.uid, name: user.displayName || 'Admin' }
    );

    if (result.success) {
      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been removed.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not delete the announcement.',
      });
    }
    closeDeleteAlert();
  };

  const memoizedColumns = React.useMemo(
    () => announcementColumns({ openDeleteAlert }),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Announcements
          </h1>
          <p className="text-muted-foreground">
            Create and manage global announcements for all users.
          </p>
        </div>
        <Button onClick={openModal}>
          <PlusCircle className="mr-2" />
          New Announcement
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <AnnouncementsDataTable
            columns={memoizedColumns}
            data={announcementsWithDocId}
            isLoading={isLoading}
          />
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
            libraryId={HARDCODED_LIBRARY_ID}
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
            <AlertDialogCancel onClick={closeDeleteAlert}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
