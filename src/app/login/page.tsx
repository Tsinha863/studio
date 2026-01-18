'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { signInAnonymously } from 'firebase/auth';
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const { auth } = useFirebase();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setIsLoading(true);

    const successfulLogin =
      (data.email === 'admin@campushub.com' && data.password === 'password123') ||
      (data.email === 'student@campushub.com' && data.password === 'password123');

    if (!successfulLogin) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      setIsLoading(false);
      return;
    }

    const performLogin = () => {
      const isAdmin = data.email === 'admin@campushub.com';
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${isAdmin ? 'Admin' : 'Student'}! Redirecting to your dashboard.`,
      });
      // Store the email for the student dashboard to use
      if (!isAdmin) {
          sessionStorage.setItem('demoStudentEmail', data.email);
      } else {
          sessionStorage.removeItem('demoStudentEmail');
      }
      router.push(isAdmin ? '/admin/dashboard' : '/student/dashboard');
    };

    // This is a mock login flow. For the forms to be enabled on the next pages,
    // we need a Firebase user. We'll sign in anonymously here to ensure
    // that the `useFirebase` hook provides a user object.
    if (auth?.currentUser) {
      performLogin();
    } else if (auth) {
      signInAnonymously(auth)
        .then(() => {
          performLogin();
        })
        .catch((error) => {
          console.error('Anonymous sign-in failed:', error);
          toast({
            variant: 'destructive',
            title: 'Firebase Auth Error',
            description: 'Could not sign in anonymously. ' + error.message,
          });
          setIsLoading(false);
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Initialization Error',
            description: 'Firebase is not ready. Please try again in a moment.',
        });
        setIsLoading(false);
    }
  };
  
  const handleAdminDemo = () => {
    form.setValue('email', 'admin@campushub.com');
    form.setValue('password', 'password123');
    toast({
        title: 'Demo Mode',
        description: 'Admin credentials filled. Click "Sign In" to continue.',
    });
  }

  const handleStudentDemo = () => {
    form.setValue('email', 'student@campushub.com');
    form.setValue('password', 'password123');
    toast({
        title: 'Demo Mode',
        description: 'Student credentials filled. Click "Sign In" to continue.',
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            <div className='flex w-full gap-2'>
              <Button type="button" variant="outline" className="w-full" onClick={handleAdminDemo}>
                Admin Demo
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleStudentDemo}>
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
        <Link href="/" className="absolute top-8 left-8">
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
