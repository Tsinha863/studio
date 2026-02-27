
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Spinner } from '@/components/spinner';
import type { UserRole } from '@/lib/types';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole: UserRole | UserRole[];
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

        // Check if role is authorized
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const isAuthorized = allowedRoles.includes(role as UserRole);

        if (!isAuthorized) {
            // Hierarchy fallback: libraryOwner can access libraryStaff areas
            if (role === 'libraryOwner' && allowedRoles.includes('libraryStaff')) {
                return;
            }
            
            router.replace('/loading');
        }
    }, [isLoading, user, error, role, requiredRole, router, pathname]);

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const isAuthorized = role === 'admin' || (role && (allowedRoles.includes(role) || (role === 'libraryOwner' && allowedRoles.includes('libraryStaff'))));

    if (isLoading || !isAuthorized) {
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
