'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Paperclip } from 'lucide-react';

import { useFirebase, useStorage } from '@/firebase';
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

interface PrintRequestFormProps {
  student: Student | null;
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
      const file = data.file;
      const uniqueFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `libraries/${libraryId}/printRequests/${student.id}/${uniqueFileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const batch = writeBatch(firestore);
      
      const requestRef = doc(collection(firestore, `libraries/${libraryId}/printRequests`));
      batch.set(requestRef, {
        libraryId,
        studentId: student.id,
        studentName: student.name,
        seatId: student.assignedSeatId || null,
        fileUrl: downloadURL,
        fileName: file.name,
        notes: data.notes || '',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
      batch.set(logRef, {
        libraryId,
        user: { id: user.uid, name: student.name },
        activityType: 'print_request_submitted',
        details: { requestId: requestRef.id, fileName: file.name },
        timestamp: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: 'Request Submitted',
        description: 'Your document has been sent to the library for printing.',
      });
      form.reset();

    } catch (error) {
      console.error("Print request submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
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
