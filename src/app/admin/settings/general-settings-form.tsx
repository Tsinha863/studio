'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { useFirebase, errorEmitter } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { Library } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestorePermissionError } from '@/firebase/errors';

const settingsSchema = z.object({
  name: z.string().min(3, 'Library name must be at least 3 characters.'),
  address: z.string().min(10, 'Address must be at least 10 characters.'),
  contactEmail: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function GeneralSettingsForm() {
  const { firestore, user, libraryId } = useFirebase();
  const { toast } = useToast();

  const libraryRef = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    return doc(firestore, 'libraries', libraryId);
  }, [firestore, libraryId]);
  const { data: library, isLoading: isLoadingLibrary } = useDoc<Library>(libraryRef);

  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      address: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  React.useEffect(() => {
    if (library) {
      reset({
        name: library.name || '',
        address: library.address || '',
        contactEmail: library.contactEmail || '',
        contactPhone: library.contactPhone || '',
      });
    }
  }, [library, reset]);
  
  const onSubmit = async (data: SettingsFormValues) => {
    if (!firestore || !user || !libraryId || !libraryRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save settings.' });
      return;
    }
    
    const payload = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(libraryRef, payload);
        toast({ title: 'Settings Saved', description: 'Your library details have been updated.' });
    } catch(serverError) {
      const permissionError = new FirestorePermissionError({
        path: libraryRef.path,
        operation: 'update',
        requestResourceData: payload
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  if (isLoadingLibrary) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Library Details</CardTitle>
          <CardDescription>Update the name, address, and contact information for your library.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Library Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input id="name" {...field} disabled={isSubmitting} />}
            />
            {errors.name && <p className="text-sm font-medium text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => <Input id="address" {...field} disabled={isSubmitting} />}
            />
            {errors.address && <p className="text-sm font-medium text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Controller
                name="contactEmail"
                control={control}
                render={({ field }) => <Input id="contactEmail" type="email" {...field} disabled={isSubmitting} />}
                />
                {errors.contactEmail && <p className="text-sm font-medium text-destructive">{errors.contactEmail.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => <Input id="contactPhone" {...field} disabled={isSubmitting} />}
                />
                {errors.contactPhone && <p className="text-sm font-medium text-destructive">{errors.contactPhone.message}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
