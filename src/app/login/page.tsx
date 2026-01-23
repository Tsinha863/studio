'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowLeft } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/spinner';
import { LIBRARY_ID } from '@/lib/config';
import { ensureStudentProfile, ensureUserProfile } from '@/firebase/auth/ensure-user-profile';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Demo credentials
const DEMO_ADMIN_EMAIL = 'admin@campushub.com';
const DEMO_ADMIN_PASSWORD = 'password123';
const DEMO_STUDENT_EMAIL = 'student@campushub.com';
const DEMO_STUDENT_PASSWORD = 'password123';

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const [isDemoLoading, setIsDemoLoading] = React.useState<
    'admin' | 'student' | null
  >(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { isSubmitting } = form.formState;
  const isAnyLoading = isSubmitting || !!isDemoLoading;

  // Handler for the manual email/password form
  const onFormSubmit = async (data: LoginFormValues) => {
    if (!auth) return;

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/loading');
    } catch (error) {
      handleAuthError(error);
    }
  };

  // Handler for both demo login buttons
  const handleDemoLogin = async (role: 'admin' | 'student') => {
    if (!auth || !firestore) return;
    setIsDemoLoading(role);

    const email = role === 'admin' ? DEMO_ADMIN_EMAIL : DEMO_STUDENT_EMAIL;
    const password =
      role === 'admin' ? DEMO_ADMIN_PASSWORD : DEMO_STUDENT_PASSWORD;

    try {
      // 1. Attempt to sign in.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // 2. If user does not exist, create them.
      if (
        error instanceof FirebaseError &&
        (error.code === 'auth/user-not-found' ||
          error.code === 'auth/invalid-credential')
      ) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (creationError) {
          handleAuthError(
            creationError,
            'Could not set up demo account.'
          );
          setIsDemoLoading(null);
          return;
        }
      } else {
        // Handle other sign-in errors
        handleAuthError(error);
        setIsDemoLoading(null);
        return;
      }
    }

    // 3. At this point, a user is guaranteed to be authenticated.
    // Now, idempotently ensure their profile exists in Firestore.
    const user = auth.currentUser;
    if (!user) {
      handleAuthError(new Error('Authentication failed unexpectedly.'));
      setIsDemoLoading(null);
      return;
    }
    
    const determinedRole = role === 'admin' ? 'libraryOwner' : 'student';
    const name = role === 'admin' ? 'Admin' : 'Student';
    
    try {
        if (!user.displayName) {
          await updateProfile(user, { displayName: name });
        }
    
        await ensureUserProfile({
          uid: user.uid,
          name: name,
          email: user.email,
          role: determinedRole,
          libraryId: LIBRARY_ID,
          firestore,
        });
    
        if (determinedRole === 'student') {
          await ensureStudentProfile({
            uid: user.uid,
            name: name,
            email: user.email,
            libraryId: LIBRARY_ID,
            firestore,
          });
        }
    
        router.push('/loading');
    } catch(profileError) {
        handleAuthError(profileError, "Failed to create user profile.");
        setIsDemoLoading(null);
    }
  };

  const handleAuthError = (error: unknown, defaultMessage?: string) => {
    let title = 'Login Failed';
    let description =
      defaultMessage || 'An unexpected error occurred. Please try again.';

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          title = 'Invalid Credentials';
          description =
            'Please check your email and password, or use the demo buttons.';
          break;
        case 'auth/too-many-requests':
          title = 'Too Many Attempts';
          description =
            'Access to this account has been temporarily disabled. Please try again later.';
          break;
        case 'auth/email-already-in-use':
          title = 'Email in Use';
          description =
            'This should not happen for demo accounts. Please contact support.';
          break;
        default:
          description = error.message;
          break;
      }
    }
    toast({ variant: 'destructive', title, description });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-4">
              <Logo />
            </Link>
            <CardTitle className="font-headline text-2xl">CampusHub</CardTitle>
            <CardDescription>Sign in or use a demo account</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
                      disabled={isAnyLoading}
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
                      disabled={isAnyLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isAnyLoading}>
              {isSubmitting ? <Spinner className="mr-2" /> : null}
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
            <div className="relative flex w-full items-center">
              <div className="flex-grow border-t border-muted"></div>
              <span className="mx-4 flex-shrink text-xs uppercase text-muted-foreground">
                Or Use a Demo
              </span>
              <div className="flex-grow border-t border-muted"></div>
            </div>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleDemoLogin('admin')}
                disabled={isAnyLoading}
              >
                {isDemoLoading === 'admin' ? (
                  <Spinner className="mr-2" />
                ) : null}
                {isDemoLoading === 'admin' ? 'Loading...' : 'Admin Demo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleDemoLogin('student')}
                disabled={isAnyLoading}
              >
                {isDemoLoading === 'student' ? (
                  <Spinner className="mr-2" />
                ) : null}
                {isDemoLoading === 'student' ? 'Loading...' : 'Student Demo'}
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

export default function LoginPage() {
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
        <LoginForm />
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
