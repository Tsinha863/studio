
'use client';

import * as React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Bell,
  IndianRupee,
  Home,
  LogOut,
  Settings,
  Users,
  Megaphone,
  Lightbulb,
  Printer,
  Receipt,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function UserMenu() {
  const { userProfile, role, isLoading } = useFirebase();
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  const roleLabels: Record<string, string> = {
    admin: 'Platform Admin',
    libraryOwner: 'Library Owner',
    libraryStaff: 'Library Staff',
    student: 'Student',
  };

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
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          {isLoading ? (
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">{userProfile?.name || ''}</p>
                <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-wider">
                    {role ? roleLabels[role] : ''}
                </Badge>
              </div>
              <p className="text-xs leading-none text-muted-foreground">
                {userProfile?.email || ''}
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
    const { role } = useFirebase();
    const isOwner = role === 'libraryOwner';

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-4">
                    <Logo className="h-7 w-7 text-primary" />
                    <span className="text-lg font-bold font-headline whitespace-nowrap group-data-[collapsible=icon]:hidden">
                        CampusHub
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/admin/dashboard'}>
                            <Link href="/admin/dashboard">
                                <Home />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Students" isActive={pathname === '/admin/students'}>
                            <Link href="/admin/students">
                                <Users />
                                <span>Students</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {isOwner && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Billing" isActive={pathname.startsWith('/admin/billing')}>
                                <Link href="/admin/billing">
                                    <Receipt />
                                    <span>Billing</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                    {isOwner && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Expenses" isActive={pathname === '/admin/expenses'}>
                                <Link href="/admin/expenses">
                                    <IndianRupee />
                                    <span>Expenses</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Seating" isActive={pathname === '/admin/seating'}>
                            <Link href="/admin/seating">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                <span>Seating</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                     <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Print Requests" isActive={pathname === '/admin/print-requests'}>
                            <Link href="/admin/print-requests">
                                <Printer />
                                <span>Print Queue</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Announcements" isActive={pathname === '/admin/announcements'}>
                            <Link href="/admin/announcements">
                                <Megaphone />
                                <span>Announcements</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Suggestions" isActive={pathname === '/admin/suggestions'}>
                            <Link href="/admin/suggestions">
                                <Lightbulb />
                                <span>Suggestions</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {isOwner && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Settings" isActive={pathname.startsWith('/admin/settings')}>
                                <Link href="/admin/settings">
                                    <Settings />
                                    <span>Settings</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  return (
    <AuthGuard requiredRole={['libraryOwner', 'libraryStaff']}>
      <SidebarProvider>
          <div className="flex min-h-screen w-full">
              <MainSidebar />
              <SidebarInset className="flex flex-col">
                  <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
                      <SidebarTrigger className="md:hidden" />
                      <div className="flex-1">
                          {/* Breadcrumbs or page title could go here */}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => {
                          toast({
                            title: 'Notifications',
                            description: 'No new notifications.',
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
