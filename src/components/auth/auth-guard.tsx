
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Spinner } from '@/components/spinner';
import type { UserRole } from '@/lib/types';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole: UserRole;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, role, isLoading, error } = useFirebase();

    React.useEffect(() => {
        if (isLoading) return;

        if (error || !user) {
            router.replace(`/login?redirect=${pathname}`);
            return;
        }

        // Global admins can access any management route
        if (role === 'admin') return;

        // Specific role check
        if (role !== requiredRole) {
            // Logic for shared pages: Some pages under /admin are accessible by Staff
            const sharedPaths = ['/admin/students', '/admin/seating', '/admin/print-requests', '/admin/suggestions', '/admin/announcements'];
            const isShared = sharedPaths.some(p => pathname.startsWith(p));
            
            if (role === 'libraryStaff' && isShared) {
                return;
            }

            router.replace('/loading');
        }
    }, [isLoading, user, error, role, requiredRole, router, pathname]);

    if (isLoading || (role !== requiredRole && role !== 'admin' && !(role === 'libraryStaff' && pathname.startsWith('/admin/')))) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Spinner className="h-10 w-10 text-primary" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Authenticating access...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
