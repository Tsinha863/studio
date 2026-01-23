'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
      libraryName: '',
      libraryAddress: '',
    },
  });

  const {
    formState: { isSubmitting },
    watch,
  } = form;

  const role = watch('role');

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
      // 1. Create user in Firebase Auth.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const { user } = userCredential;

      // 2. Update the auth profile's display name for consistency.
      await updateProfile(user, { displayName: data.name });

      // 3. Atomically create all necessary Firestore documents.
      const batch = writeBatch(firestore);

      if (data.role === 'libraryOwner') {
        // Create a new library for the admin
        const newLibraryRef = doc(collection(firestore, 'libraries'));
        const newLibraryId = newLibraryRef.id;

        // a. Library Document
        batch.set(newLibraryRef, {
          id: newLibraryId,
          name: data.libraryName,
          address: data.libraryAddress,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // b. User-to-Library Mapping (for quick login resolution)
        const userMappingRef = doc(firestore, 'users', user.uid);
        batch.set(userMappingRef, { libraryId: newLibraryId });

        // c. Admin User Profile (inside the new library)
        const userProfileRef = doc(firestore, `libraries/${newLibraryId}/users`, user.uid);
        batch.set(userProfileRef, {
            id: user.uid,
            name: data.name,
            email: data.email,
            role: 'libraryOwner',
            libraryId: newLibraryId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

      } else {
        // For students, this demo assigns them to a default library.
        // A real app would have an invite system or a way to select a library.
        const defaultLibraryId = 'library1';

        // a. User-to-Library Mapping
        const userMappingRef = doc(firestore, 'users', user.uid);
        batch.set(userMappingRef, { libraryId: defaultLibraryId });
        
        // b. Student User Profile
        const userProfileRef = doc(firestore, `libraries/${defaultLibraryId}/users`, user.uid);
        batch.set(userProfileRef, {
            id: user.uid,
            name: data.name,
            email: data.email,
            role: 'student',
            libraryId: defaultLibraryId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // c. Student-specific data record
        const studentRef = doc(firestore, `libraries/${defaultLibraryId}/students`, user.uid);
        batch.set(studentRef, {
            id: user.uid,
            libraryId: defaultLibraryId,
            userId: user.uid,
            name: data.name,
            email: data.email,
            status: 'active',
            fibonacciStreak: 0,
            lastInteractionAt: serverTimestamp(),
            notes: [],
            tags: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
      }

      // Commit the atomic write.
      await batch.commit();

      // 4. Redirect to loading page, which will resolve role and redirect to dashboard.
      router.push('/loading');

    } catch (error) {
      let title = 'Sign-up failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            title = 'Email in Use';
            description =
              'This email address is already associated with an account.';
            break;
          case 'auth/weak-password':
            title = 'Weak Password';
            description =
              'The password is not strong enough. Please choose a stronger password.';
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
              Create an Account
            </CardTitle>
            <CardDescription>
              Enter your details below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                      disabled={isSubmitting}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="student" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Student
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="libraryOwner" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Library Owner (Admin)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'libraryOwner' && (
              <>
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
              </>
            )}

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
                  <FormLabel>Email</FormLabel>
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
              {isSubmitting ? <Spinner className="mr-2" /> : null}
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign In
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
            The all-in-one solution for modern student management.
          </p>
        </div>
        <div className="relative z-10 mt-auto">
          <p className="text-base font-medium">
            &ldquo;This platform has revolutionized how we manage our student
            facilities. It's intuitive, powerful, and has saved us countless
            hours.&rdquo;
          </p>
          <footer className="mt-4 text-sm opacity-80">
            - Jane Doe, Library Administrator
          </footer>
        </div>
      </div>
    </main>
  );
}
