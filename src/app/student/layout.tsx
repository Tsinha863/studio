'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Home,
  LogOut,
  Printer,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirebase, useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useToast } from '@/hooks/use-toast';

function UserMenu() {
  const { userProfile, isLoading } = useUser();
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
        >
          <Image
            src={userAvatar?.imageUrl || ''}
            alt={userAvatar?.description || 'User avatar'}
            width={40}
            height={40}
            className="rounded-full"
            data-ai-hint={userAvatar?.imageHint}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          {isLoading ? (
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userProfile?.name || 'Student'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userProfile?.email || 'No email'}
              </p>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MainSidebar() {
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Logo className="h-7 w-7 text-primary" />
                    <span className="text-lg font-semibold font-headline whitespace-nowrap group-data-[collapsible=icon]:hidden">
                        CampusHub
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/student/dashboard'}>
                            <Link href="/student/dashboard">
                                <Home />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Print on Desk" isActive={pathname === '/student/print-on-desk'}>
                            <Link href="/student/print-on-desk">
                                <Printer />
                                <span>Print on Desk</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  return (
    <AuthGuard requiredRole="student">
      <SidebarProvider>
          <div className="flex min-h-screen w-full">
              <MainSidebar />
              <SidebarInset className="flex flex-col">
                  <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
                      <SidebarTrigger className="md:hidden" />
                      <div className="flex-1">
                          {/* Can add breadcrumbs or page title here */}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => {
                          toast({
                            title: 'Notifications',
                            description: 'This feature is not yet implemented.',
                          });
                        }}
                      >
                          <Bell className="h-5 w-5" />
                          <span className="sr-only">Toggle notifications</span>
                      </Button>
                      <UserMenu />
                  </header>
                  <main className="flex-1 overflow-auto p-4 sm:p-6">
                      {children}
                  </main>
              </SidebarInset>
          </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
