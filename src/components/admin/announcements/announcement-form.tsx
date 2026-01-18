'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { announcementFormSchema, type AnnouncementFormValues } from '@/lib/schemas';
import { addAnnouncement } from '@/lib/actions/announcements';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';

interface AnnouncementFormProps {
  libraryId: string;
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

    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create an announcement.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
        const actor = { id: user.uid, name: user.displayName || 'Admin' };
        const result = await addAnnouncement(firestore, libraryId, validation.data, actor);
        if (result.success) {
          onSuccess();
        } else {
          toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: result.error || 'The operation failed. Please try again.',
          });
        }
    } catch (error) {
        console.error("Announcement form submission error:", error);
        toast({
            variant: "destructive",
            title: "An unexpected error occurred",
            description: error instanceof Error ? error.message : "Please check the console for details."
        });
    } finally {
        setIsSubmitting(false);
    }
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
