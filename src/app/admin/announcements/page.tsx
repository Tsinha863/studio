'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

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
import { columns as announcementColumns } from '@/components/admin/announcements/columns';

const AnnouncementsDataTable = dynamic(
  () => import('@/components/admin/announcements/data-table').then(mod => mod.AnnouncementsDataTable),
  { ssr: false }
);

type AnnouncementWithId = Announcement & { id: string };

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
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/announcements`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

  const openModal = () => setModalState({ isOpen: true });
  const closeModal = () => setModalState({ isOpen: false });

  const openDeleteAlert = (announcement: AnnouncementWithId) =>
    setAlertState({ isOpen: true, announcementId: announcement.id });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, announcementId: undefined });

  const handleDelete = async () => {
    if (!alertState.announcementId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated or announcement not found.',
      });
      return;
    }
    
    try {
      const batch = writeBatch(firestore);
      const actor = { id: user.uid, name: user.displayName || 'Admin' };

      const announcementRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/announcements/${alertState.announcementId}`);
      batch.delete(announcementRef);
  
      const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
      batch.set(logRef, {
        libraryId: HARDCODED_LIBRARY_ID,
        user: actor,
        activityType: 'announcement_deleted',
        details: { announcementId: alertState.announcementId },
        timestamp: serverTimestamp(),
      });
  
      await batch.commit();

      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been removed.',
      });

    } catch (error) {
      console.error("DELETE ANNOUNCEMENT ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete the announcement.',
      });
    } finally {
      closeDeleteAlert();
    }
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
        <Button type="button" onClick={openModal}>
          <PlusCircle className="mr-2" />
          New Announcement
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <AnnouncementsDataTable
            columns={memoizedColumns}
            data={announcements || []}
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
