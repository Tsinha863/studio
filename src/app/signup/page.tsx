'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';

import { signupSchema, type SignupFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/spinner';

function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'libraryOwner',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      libraryName: '',
      libraryAddress: '',
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: SignupFormValues) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase service is not available. Please try again later.',
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const { user } = userCredential;

      // Update Auth profile and refresh token to ensure Firestore rules see the UID
      await updateProfile(user, { displayName: data.name });
      await user.getIdToken(true);

      const batch = writeBatch(firestore);
      const newLibraryRef = doc(collection(firestore, 'libraries'));
      const newLibraryId = newLibraryRef.id;

      // 1. Create Library
      batch.set(newLibraryRef, {
        id: newLibraryId,
        name: data.libraryName,
        address: data.libraryAddress,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create Global User Mapping (Rapid Resolution)
      const userMappingRef = doc(firestore, 'users', user.uid);
      batch.set(userMappingRef, { 
        libraryId: newLibraryId,
        role: data.role,
        createdAt: serverTimestamp() 
      });

      // 3. Create Library-Scoped User Profile
      const userProfileRef = doc(firestore, `libraries/${newLibraryId}/users`, user.uid);
      batch.set(userProfileRef, {
        id: user.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        libraryId: newLibraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Initial Activity Log
      const logRef = doc(collection(firestore, `libraries/${newLibraryId}/activityLogs`));
      batch.set(logRef, {
        libraryId: newLibraryId,
        user: { id: user.uid, name: data.name },
        activityType: 'library_created',
        details: { libraryName: data.libraryName, initialRole: data.role },
        timestamp: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: 'Success!',
        description: 'Your institutional workspace has been created.',
      });

      router.push('/loading');

    } catch (error) {
      console.error('Signup error:', error);
      let title = 'Registration failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            title = 'Email in Use';
            description = 'This email address is already associated with an account.';
            break;
          case 'auth/weak-password':
            title = 'Weak Password';
            description = 'The password is not strong enough. Please choose a stronger password.';
            break;
          case 'permission-denied':
          case 'firestore/permission-denied':
            title = 'Permission Error';
            description = 'Unable to create library data. Please check your Firestore security rules or contact support.';
            break;
          default:
            description = error.message;
            break;
        }
      }

      toast({
        variant: 'destructive',
        title,
        description,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-4">
              <Logo />
            </Link>
            <CardTitle className="font-headline text-2xl">
              Institutional Registration
            </CardTitle>
            <CardDescription>
              Create your library workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registering as...</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="libraryOwner">
                        <div className="flex items-center">
                            <Building2 className="mr-2 h-4 w-4 text-primary" />
                            <span>Founder / Owner</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="libraryStaff">
                        <div className="flex items-center">
                            <ShieldCheck className="mr-2 h-4 w-4 text-accent" />
                            <span>Manager / Staff</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
            control={form.control}
            name="libraryName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Library Name</FormLabel>
                <FormControl>
                    <Input
                    placeholder="e.g., Central City Library"
                    {...field}
                    disabled={isSubmitting}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="libraryAddress"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Library Address</FormLabel>
                <FormControl>
                    <Input
                    placeholder="e.g., 123 Main St, Central City"
                    {...field}
                    disabled={isSubmitting}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={isSubmitting}
                    />
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
                  <FormLabel>Work Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Create Workspace & Account
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

export default function SignupPage() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'login-hero');

  return (
    <main className="flex min-h-screen w-full">
      <div className="relative flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
        <Link href="/" className="absolute left-4 top-4 sm:left-8 sm:top-8">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Welcome
          </Button>
        </Link>
        <SignupForm />
      </div>
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="relative z-10">
          <Link href="/">
            <Logo className="h-10 w-10 text-primary-foreground" />
          </Link>
          <h1 className="mt-4 font-headline text-4xl font-bold">CampusHub</h1>
          <p className="mt-2 text-lg opacity-80">
            Professional facility management for modern co-working and study spaces.
          </p>
        </div>
        <div className="relative z-10 mt-auto">
          <p className="text-base font-medium">
            &ldquo;This platform has revolutionized how we manage our institutional facilities. It's intuitive, powerful, and built for scale.&rdquo;
          </p>
          <footer className="mt-4 text-sm opacity-80">
            - Alex Chen, Chief Operations Officer
          </footer>
        </div>
      </div>
    </main>
  );
}
