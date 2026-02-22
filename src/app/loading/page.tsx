
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Spinner } from '@/components/spinner';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function AuthRedirector() {
    const router = useRouter();
    const { user, role, isLoading, error, libraryId } = useFirebase();

    React.useEffect(() => {
        if (isLoading) return;

        if (error || !user) {
            router.replace('/login');
            return;
        }

        // If authenticated but no role or library mapping exists, 
        // they need to finish the join flow.
        if (!role || (!libraryId && role !== 'admin')) {
            router.replace('/join/library');
            return;
        }

        switch (role) {
            case 'admin':
                router.replace('/super-admin/dashboard');
                break;
            case 'libraryOwner':
            case 'libraryStaff':
                // Both roles use the unified /admin management portal
                router.replace('/admin/dashboard');
                break;
            case 'student':
                router.replace('/student/dashboard');
                break;
            default:
                router.replace('/login');
        }
        
    }, [user, isLoading, role, error, router, libraryId]);

    return (
        <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium text-sm">Resolving your institutional workspace...</p>
        </div>
    );
}

export default function LoadingPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 scale-110">
                        <Logo />
                    </div>
                    <CardTitle className="font-headline text-2xl">CampusHub</CardTitle>
                    <CardDescription>
                        Preparing your professional environment.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AuthRedirector />
                </CardContent>
            </Card>
        </main>
    );
}
