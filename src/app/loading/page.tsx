'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useUser } from '@/firebase';
import { useRole } from '@/hooks/use-role';
import { Spinner } from '@/components/spinner';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function AuthRedirector() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { role, isLoading: isRoleLoading, error: roleError } = useRole(user);

    React.useEffect(() => {
        // Wait until both user and role are resolved
        if (isUserLoading || isRoleLoading) {
            return;
        }

        // If no user is logged in after checking, go to login
        if (!user) {
            router.replace('/login');
            return;
        }

        // If there's an error fetching the role, stay on this page to show it
        if (roleError) {
            return;
        }

        // Route based on role
        if (role === 'libraryOwner') {
            router.replace('/admin/dashboard');
        } else if (role === 'student') {
            router.replace('/student/dashboard');
        } else {
            // This case handles a logged-in user with no valid role document.
            // This can happen if Firestore profile creation fails after auth user is created.
            // We log an error and prevent infinite redirects by not routing.
             console.error("No valid role found for user:", user.uid);
        }
    }, [user, isUserLoading, role, isRoleLoading, roleError, router]);

    let content;
    if (roleError) {
        content = (
             <div className="text-center text-destructive">
                <h3 className="font-semibold">Authentication Error</h3>
                <p className="text-sm mt-1">{roleError.message}</p>
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
