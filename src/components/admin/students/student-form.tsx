'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';
import { studentFormSchema, type StudentFormValues } from '@/lib/schemas';
import { addStudent, updateStudent } from '@/lib/actions/students';

interface StudentFormProps {
  student?: Student;
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudentForm({ student, libraryId, onSuccess, onCancel }: StudentFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      id: student?.id || '',
      name: student?.name || '',
      email: student?.email || '',
      paymentStatus: student?.paymentStatus || 'pending',
      assignedSeatId: student?.assignedSeatId || '',
    },
  });

  const onSubmit = async (data: StudentFormValues) => {
    setIsLoading(true);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database. Please try again.',
      });
      setIsLoading(false);
      return;
    }

    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    let result;

    if (student?.docId) {
      // Update existing student
      result = await updateStudent(firestore, libraryId, student.docId, data, actor);
    } else {
      // Add new student
      result = await addStudent(firestore, libraryId, data, actor);
    }

    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: result.error || 'The operation failed. Please try again.',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!student && (
          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., S12345" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignedSeatId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Seat ID (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., A12" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : student ? 'Save Changes' : 'Add Student'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
