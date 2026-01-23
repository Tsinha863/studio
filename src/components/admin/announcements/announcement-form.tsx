'use client';

import * as React from 'react';
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import { useFirebase, errorEmitter } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { announcementFormSchema, type AnnouncementFormValues } from '@/lib/schemas';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { FirestorePermissionError } from '@/firebase/errors';

interface AnnouncementFormProps {
  libraryId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AnnouncementForm({ libraryId, onSuccess, onCancel }: AnnouncementFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [errors, setErrors] = React.useState<{ title?: string; content?: string }>({});

  const handleSubmit = async () => {
    if (!firestore || !user || !libraryId) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create an announcement.',
      });
      return;
    }

    setErrors({});
    const data: AnnouncementFormValues = { title, content };
    const validation = announcementFormSchema.safeParse(data);
    if (!validation.success) {
      const newErrors: { title?: string; content?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'title') newErrors.title = err.message;
        if (err.path[0] === 'content') newErrors.content = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const announcementRef = doc(collection(firestore, `libraries/${libraryId}/announcements`));
    
    const validatedData = validation.data;
    const announcementPayload = {
        ...validatedData,
        libraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    batch.set(announcementRef, announcementPayload);

    const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
    batch.set(logRef, {
      libraryId,
      user: actor,
      activityType: 'announcement_created',
      details: {
        title: validatedData.title,
      },
      timestamp: serverTimestamp(),
    });

    batch.commit()
      .then(() => {
        onSuccess();
      })
      .catch((serverError) => {
        if (serverError instanceof FirebaseError && serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: announcementRef.path,
            operation: 'create',
            requestResourceData: announcementPayload,
          });
          errorEmitter.emit('permission-error', permissionError);
        }
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: serverError instanceof Error ? serverError.message : 'Could not create announcement.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., Library Closure Notice"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.title && <p className="text-sm font-medium text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          placeholder="The library will be closed on..."
          className="min-h-[120px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.content && <p className="text-sm font-medium text-destructive">{errors.content}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : (
            'Create Announcement'
          )}
        </Button>
      </div>
    </div>
  );
}
