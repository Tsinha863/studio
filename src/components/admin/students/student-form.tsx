'use client';

import * as React from 'react';
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';

type StudentWithId = Student & { id: string };

interface StudentFormProps {
  student?: StudentWithId;
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudentForm({ student, libraryId, onSuccess, onCancel }: StudentFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [studentId, setStudentId] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'active' | 'at-risk' | 'inactive'>('active');
  const [errors, setErrors] = React.useState<Partial<Record<keyof StudentFormValues, string>>>({});

  React.useEffect(() => {
    if (student) {
      setStudentId(student.id || '');
      setName(student.name || '');
      setEmail(student.email || '');
      setStatus(student.status || 'active');
    } else {
      setStudentId('');
      setName('');
      setEmail('');
      setStatus('active');
    }
  }, [student]);

  const handleSubmit = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to manage students.',
      });
      return;
    }

    setErrors({});
    
    const data = { id: studentId, name, email, status };
    const schema = student ? studentFormSchema.omit({ id: true }) : studentFormSchema;
    const validation = schema.safeParse(data);

    if (!validation.success) {
      const newErrors: Partial<Record<keyof StudentFormValues, string>> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path[0] as keyof StudentFormValues;
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
        const actor = { id: user.uid, name: user.displayName || 'Admin' };
        
        if (student?.id) { // UPDATE logic
            const batch = writeBatch(firestore);
            const studentRef = doc(firestore, `libraries/${libraryId}/students/${student.id}`);
            const { id, ...dataToUpdate } = validation.data;
            
            batch.update(studentRef, {
              ...dataToUpdate,
              lastInteractionAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
        
            const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
            batch.set(logRef, {
              libraryId,
              user: actor,
              activityType: 'student_updated',
              details: { studentId: student.id, studentName: validation.data.name || 'N/A' },
              timestamp: serverTimestamp(),
            });

            await batch.commit();

        } else { // CREATE logic must be atomic.
            await runTransaction(firestore, async (transaction) => {
                const validatedData = validation.data as StudentFormValues;
                const newStudentRef = doc(firestore, `libraries/${libraryId}/students`, validatedData.id);
                const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));

                const studentDoc = await transaction.get(newStudentRef);
                if (studentDoc.exists()) {
                    throw new Error(`A student with ID ${validatedData.id} already exists.`);
                }

                const { id, ...dataToSave } = validatedData;
                transaction.set(newStudentRef, {
                    ...dataToSave,
                    libraryId,
                    fibonacciStreak: 0,
                    paymentDue: 0,
                    notes: [],
                    tags: [],
                    lastInteractionAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            
                transaction.set(logRef, {
                    libraryId,
                    user: actor,
                    activityType: 'student_created',
                    details: { studentId: validatedData.id, studentName: validatedData.name },
                    timestamp: serverTimestamp(),
                });
            });
        }
        
        onSuccess();

    } catch (error) {
        toast({
            variant: "destructive",
            title: "An unexpected error occurred",
            description: error instanceof Error ? error.message : "The operation failed. Please try again."
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studentId">Student ID</Label>
          <Input
            id="studentId"
            placeholder="e.g., S12345"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isSubmitting || !!student} // Can't edit ID after creation
          />
          {errors.id && <p className="text-sm font-medium text-destructive">{errors.id}</p>}
        </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-sm font-medium text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          onValueChange={(value: 'active' | 'at-risk' | 'inactive') => setStatus(value)}
          value={status}
          disabled={isSubmitting}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="at-risk">At-Risk</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-sm font-medium text-destructive">{errors.status}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : student ? 'Save Changes' : 'Add Student'}
        </Button>
      </div>
    </div>
  );
}
