
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
        // Wait until loading is fully resolved.
        if (isLoading) {
            return;
        }

        // If there is an auth error or no user, always redirect to login.
        if (error || !user) {
            router.replace('/login');
            return;
        }
        
        // If the user is authenticated but the role could not be determined,
        // it's a critical error. The provider will have logged this.
        // The safest recovery is to send them back to the login page.
        if (!role) {
            router.replace('/login');
            return;
        }

        // If role is resolved, redirect to the correct dashboard.
        if (role === 'libraryOwner') {
            router.replace('/admin/dashboard');
        } else if (role === 'student') {
            router.replace('/student/dashboard');
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
