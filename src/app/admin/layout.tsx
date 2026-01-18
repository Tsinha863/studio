'use client';

import * as React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CreditCard,
  IndianRupee,
  Home,
  LogOut,
  Settings,
  User,
  Users,
  Megaphone,
  Lightbulb,
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
  useSidebar,
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
import Link from 'next/link';

function UserMenu() {
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
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Admin</p>
            <p className="text-xs leading-none text-muted-foreground">
              admin@campushub.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
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
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Payments" isActive={pathname === '/admin/payments'}>
                            <Link href="/admin/payments">
                                <CreditCard />
                                <span>Payments</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Expenses" isActive={pathname === '/admin/expenses'}>
                            <Link href="/admin/expenses">
                                <IndianRupee />
                                <span>Expenses</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
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
                                <span>Print Requests</span>
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
  return (
    <SidebarProvider>
        <div className="flex min-h-screen w-full">
            <MainSidebar />
            <SidebarInset className="flex flex-col">
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
                    <SidebarTrigger className="md:hidden" />
                    <div className="flex-1">
                        {/* Can add breadcrumbs or page title here */}
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full">
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
  );
}
