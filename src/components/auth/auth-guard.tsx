'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useUser } from '@/firebase';
import { useRole } from '@/hooks/use-role';
import { Spinner } from '@/components/spinner';

type Role = 'libraryOwner' | 'student';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole: Role;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isUserLoading, userError } = useUser();
    const { role, isLoading: isRoleLoading, error: roleError } = useRole(user);

    const isLoading = isUserLoading || isRoleLoading;

    React.useEffect(() => {
        // If still loading, do nothing.
        if (isLoading) {
            return;
        }

        // If there's an auth error or no user, redirect to login.
        if (userError || !user) {
            router.replace(`/login?redirect=${pathname}`);
            return;
        }

        // If there's a role error or the role doesn't match, redirect to login.
        // This prevents users from accessing pages they shouldn't.
        if (roleError || role !== requiredRole) {
            router.replace('/login');
        }
    }, [isLoading, user, userError, role, roleError, requiredRole, router, pathname]);

    if (isLoading || role !== requiredRole) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    // If all checks pass, render the protected content.
    return <>{children}</>;
}
