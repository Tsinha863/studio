
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useFirebase } from '@/firebase';
import { Spinner } from '@/components/spinner';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function AuthRedirector() {
    const router = useRouter();
    const { user, role, isLoading, error } = useFirebase();

    React.useEffect(() => {
        // Wait until the Firebase provider has finished its initial loading.
        if (isLoading) {
            return;
        }

        // If the provider determined there's an error or no user is authenticated,
        // it's a definitive failure state. Redirect to login.
        if (error || !user) {
            router.replace('/login');
            return;
        }

        // If loading is complete and we have a user, redirect based on their role.
        // The provider is responsible for finding the role. If it couldn't, it would have
        // set the 'error' state, which is handled above.
        if (role === 'libraryOwner') {
            router.replace('/admin/dashboard');
        } else if (role === 'student') {
            router.replace('/student/dashboard');
        } else {
            // This is a fallback for an unexpected state where loading is done,
            // a user exists, but no role was resolved. This indicates a problem
            // in the data structure, and the safest action is to sign out.
            router.replace('/login');
        }
        
    }, [user, isLoading, role, error, router]);

    let content;
    if (error) {
        content = (
             <div className="text-center text-destructive">
                <h3 className="font-semibold">Authentication Error</h3>
                <p className="text-sm mt-1">{error.message}</p>
             </div>
        );
    } else {
        content = (
            <div className="flex flex-col items-center gap-4">
                <Spinner className="h-8 w-8" />
                <p className="text-muted-foreground">Authenticating and loading your dashboard...</p>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="font-headline text-2xl">CampusHub</CardTitle>
                <CardDescription>
                    Please wait while we get things ready for you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
}


export default function LoadingPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center p-4">
            <AuthRedirector />
        </main>
    );
}
