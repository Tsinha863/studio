'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Users, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center p-6 text-center bg-card rounded-lg shadow-md">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}


export default function WelcomePage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'login-hero');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo className="h-6 w-6" />
              <span className="font-bold">CampusHub</span>
            </Link>
          </div>
          <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild>
              <Link href="/login">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32">
            {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    priority
                    className="absolute inset-0 h-full w-full object-cover opacity-10"
                    data-ai-hint={heroImage.imageHint}
                />
            )}
            <div className="container relative z-10 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight font-headline lg:text-5xl">
                    The All-in-One Solution for Modern Student Management
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                    Streamline your library operations, manage students, track payments, and gain valuable insights with one intuitive platform.
                </p>
                <div className="mt-8 flex justify-center">
                    <Button asChild size="lg">
                    <Link href="/login">
                        Get Started for Free
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight">Powerful Features, Simple Interface</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                        Everything you need to run your student library efficiently.
                    </p>
                </div>
                <div className="grid gap-8 md:grid-cols-3">
                    <FeatureCard
                        icon={<Users className="h-10 w-10" />}
                        title="Student Management"
                        description="Easily add, edit, and manage student profiles, track their status, and handle seat assignments across multiple rooms and time slots."
                    />
                    <FeatureCard
                        icon={<BookOpen className="h-10 w-10" />}
                        title="Seat & Room Planning"
                        description="Visualize your library layout, create rooms with customizable seat tiers, and assign students to specific seats for different time slots."
                    />
                    <FeatureCard
                        icon={<BarChart className="h-10 w-10" />}
                        title="Financial Tracking"
                        description="Generate monthly payment invoices, track payments, manage expenses, and view insightful dashboards on your revenue and costs."
                    />
                </div>
            </div>
        </section>

         {/* Call to Action Section */}
        <section className="py-20">
            <div className="container text-center">
                 <h2 className="text-3xl font-bold tracking-tight">Ready to Transform Your Library Management?</h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                    Join other institutions simplifying their daily operations with CampusHub.
                </p>
                 <div className="mt-8">
                    <Button asChild size="lg">
                    <Link href="/login">
                        Sign In & Explore the Demo
                    </Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built by <a href="https://firebase.google.com/studio" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">Firebase Studio</a>. 
                Powered by Firebase and Next.js.
            </p>
        </div>
      </footer>
    </div>
  );
}
