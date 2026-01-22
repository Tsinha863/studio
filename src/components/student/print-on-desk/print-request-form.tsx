'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection, writeBatch, serverTimestamp, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Paperclip } from 'lucide-react';

import { useFirebase, useStorage, errorEmitter } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { printRequestFormSchema, type PrintRequestFormValues } from '@/lib/schemas';
import type { Student } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestorePermissionError } from '@/firebase/errors';

type StudentWithId = Student & { id: string };

interface PrintRequestFormProps {
  student: StudentWithId | null;
  libraryId: string;
  isLoading: boolean;
}

export function PrintRequestForm({ student, libraryId, isLoading }: PrintRequestFormProps) {
  const { firestore, user } = useFirebase();
  const storage = useStorage();
  const { toast } = useToast();

  const form = useForm<PrintRequestFormValues>({
    resolver: zodResolver(printRequestFormSchema),
    defaultValues: {
      file: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: PrintRequestFormValues) => {
    if (!firestore || !storage || !user || !student) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot submit request. Missing required information.',
      });
      return;
    }

    try {
      // Find student's current seat booking
      const now = Timestamp.now();
      const bookingsQuery = query(
        collection(firestore, `libraries/${libraryId}/seatBookings`),
        where('studentId', '==', student.id),
        where('startTime', '<=', now),
        where('endTime', '>=', now),
        limit(1)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const currentSeatId = bookingsSnapshot.empty ? null : bookingsSnapshot.docs[0].data().seatId;

      // Upload file to storage
      const file = data.file;
      const uniqueFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `libraries/${libraryId}/printRequests/${student.id}/${uniqueFileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create documents in a batch
      const batch = writeBatch(firestore);
      const requestRef = doc(collection(firestore, `libraries/${libraryId}/printRequests`));
      const requestData = {
        libraryId,
        studentId: student.id,
        studentName: student.name,
        seatId: currentSeatId,
        fileUrl: downloadURL,
        fileName: file.name,
        notes: data.notes || '',
        status: 'Pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      batch.set(requestRef, requestData);

      const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
      batch.set(logRef, {
        libraryId,
        user: { id: user.uid, name: student.name },
        activityType: 'print_request_submitted',
        details: { requestId: requestRef.id, fileName: file.name },
        timestamp: serverTimestamp(),
      });

      batch.commit()
        .then(() => {
          toast({
            title: 'Request Submitted',
            description: 'Your document has been sent to the library for printing.',
          });
          form.reset();
        })
        .catch((serverError) => {
          if (serverError instanceof FirebaseError && serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: requestRef.path,
              operation: 'create',
              requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
          }
          toast({
            variant: "destructive",
            title: "Submission Failed",
            description: serverError instanceof Error ? serverError.message : "An unexpected error occurred."
          });
        });

    } catch (error) {
      // This catch block is for errors during file upload or query, before the batch commit.
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
      // Also ensure form is re-enabled if upload fails
      form.control._reset(); 
    }
  };

  const isFormDisabled = form.formState.isSubmitting || isLoading || !student;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>New Print Request</CardTitle>
            <CardDescription>Upload a document and add any notes for the librarian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : (
                <>
                    <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                        <FormLabel>Document (PDF, JPG, PNG)</FormLabel>
                        <FormControl>
                            <Input
                                type="file"
                                onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                                {...rest}
                                disabled={isFormDisabled}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (optional)</FormLabel>
                                <FormControl>
                                <Textarea
                                    placeholder="e.g., Please print pages 3-5 in color."
                                    className="resize-none"
                                    {...field}
                                    disabled={isFormDisabled}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isFormDisabled}>
              {form.formState.isSubmitting ? (
                <Spinner className="mr-2" />
              ) : (
                <Paperclip className="mr-2" />
              )}
              {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
