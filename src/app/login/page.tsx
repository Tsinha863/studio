
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { signInAnonymously, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowLeft } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDemoLoading, setIsDemoLoading] = React.useState(false);
  const { auth, firestore } = useFirebase();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const { formState: { isSubmitting } } = form;

  const ensureUserDocument = async (uid: string, role: 'libraryOwner' | 'student') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/users`, uid);
    
    // Set the document. If it exists, this will merge by default without overwriting.
    // If it's a new user, it will be created.
    await setDoc(userDocRef, {
      uid: uid,
      role: role,
      libraryId: HARDCODED_LIBRARY_ID,
    }, { merge: true });
  };

  const navigateToDashboard = (role: 'admin' | 'student', emailForSession?: string) => {
     toast({
      title: 'Login Successful',
      description: `Welcome back! Redirecting to your dashboard.`,
    });
    
    if (role === 'admin') {
      sessionStorage.removeItem('demoStudentEmail');
      router.push('/admin/dashboard');
    } else {
      if (emailForSession) {
        sessionStorage.setItem('demoStudentEmail', emailForSession);
      }
      router.push('/student/dashboard');
    }
  };

  const ensureFirebaseUser = async (): Promise<User> => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Initialization Error', description: 'Firebase is not ready.' });
      throw new Error("Firebase auth not ready");
    }
    if (auth.currentUser) {
      return auth.currentUser;
    }
    try {
      const creds = await signInAnonymously(auth);
      return creds.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      toast({
        variant: 'destructive',
        title: 'Firebase Auth Error',
        description: 'Could not sign in anonymously. ' + (error as Error).message,
      });
      throw error;
    }
  };

  const handleAdminDemo = async () => {
    setIsDemoLoading(true);
    try {
      const user = await ensureFirebaseUser();
      await ensureUserDocument(user.uid, 'libraryOwner');
      navigateToDashboard('admin');
    } catch (e) {
      // Error toast is handled in ensureFirebaseUser
    } finally {
      setIsDemoLoading(false);
    }
  };
  
  const handleStudentDemo = async () => {
    setIsDemoLoading(true);
    try {
      const user = await ensureFirebaseUser();
      await ensureUserDocument(user.uid, 'student');
      navigateToDashboard('student', 'student@campushub.com');
    } catch (e) {
      // Error toast is handled in ensureFirebaseUser
    } finally {
      setIsDemoLoading(false);
    }
  };

  const onFormSubmit = async (data: LoginFormValues) => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Initialization Error', description: 'Firebase is not ready.' });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      // The user document should already exist from signup, but this is a safe fallback.
      await ensureUserDocument(userCredential.user.uid, 'student');
      navigateToDashboard('student', userCredential.user.email!);
    } catch (error) {
      let title = 'Login Failed';
      let description = 'Invalid credentials. Please use the demo buttons or sign up.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
           // Keep the clear message for demo purposes
        } else {
            description = 'An unexpected error occurred. Please try again.';
        }
      }
      toast({
        variant: 'destructive',
        title,
        description,
      });
    }
  };

  const isFormDisabled = isSubmitting || isDemoLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-4">
              <Logo />
            </Link>
            <CardTitle className="font-headline text-2xl">CampusHub</CardTitle>
            <CardDescription>
              Sign in to access your dashboard
            </CardDescription>
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
                      disabled={isFormDisabled}
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
                      disabled={isFormDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isFormDisabled}
            >
              {isSubmitting ? <Spinner className="mr-2" /> : null}
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
            <div className="relative flex w-full items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">Or</span>
                <div className="flex-grow border-t border-muted"></div>
            </div>
            <div className='flex w-full gap-2'>
              <Button type="button" variant="outline" className="w-full" onClick={handleAdminDemo} disabled={isFormDisabled}>
                {isDemoLoading && <Spinner className="mr-2" />}
                Admin Demo
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleStudentDemo} disabled={isFormDisabled}>
                {isDemoLoading && <Spinner className="mr-2" />}
                Student Demo
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
  const heroImage = PlaceHolderImages.find(p => p.id === 'login-hero');

  return (
    <main className="flex min-h-screen w-full">
      <div className="relative flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
        <Link href="/" className="absolute top-4 left-4 sm:top-8 sm:left-8">
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
            &ldquo;This platform has revolutionized how we manage our student facilities. It's intuitive, powerful, and has saved us countless hours.&rdquo;
          </p>
          <footer className="mt-4 text-sm opacity-80">
            - Jane Doe, Library Administrator
          </footer>
        </div>
      </div>
    </main>
  );
}
