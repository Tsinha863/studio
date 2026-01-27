import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Users, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-semibold font-headline">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function WelcomePage() {
  const welcomeHeroImage = PlaceHolderImages.find((p) => p.id === 'welcome-hero');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-7 w-7" />
            <span className="text-lg font-semibold">CampusHub</span>
          </Link>
          <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild>
                <Link href="/login">
                    Sign In
                </Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/join">
                    Student Signup
                </Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Admin Signup <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 sm:py-24 lg:py-32">
          <div className="container text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              Your Campus, Organized.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              CampusHub brings everything—students, seating, and payments—into
              one simple, powerful platform.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login">
                  Explore the Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Image Section */}
        <section className="container pb-16">
            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-lg">
                {welcomeHeroImage && (
                    <Image
                        src={welcomeHeroImage.imageUrl}
                        alt={welcomeHeroImage.description}
                        width={1200}
                        height={600}
                        priority
                        className="h-auto w-full object-cover"
                        data-ai-hint={welcomeHeroImage.imageHint}
                    />
                )}
            </div>
        </section>


        {/* Features Section */}
        <section className="py-20 sm:py-24 lg:py-32">
          <div className="container">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline text-balance">
                Everything you need. All in one place.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Focus on your students, not your spreadsheets. CampusHub provides all the tools to run your library efficiently.
              </p>
            </div>
            <div className="grid max-w-5xl mx-auto gap-12 md:grid-cols-3">
              <FeatureCard
                icon={<Users className="h-8 w-8" />}
                title="Student Management"
                description="Easily add, edit, and manage student profiles, track their status, and handle seat assignments."
              />
              <FeatureCard
                icon={<BookOpen className="h-8 w-8" />}
                title="Seat & Room Planning"
                description="Visualize your library layout and assign students to specific seats for different time slots."
              />
              <FeatureCard
                icon={<BarChart className="h-8 w-8" />}
                title="Financial Tracking"
                description="Generate monthly invoices, track payments, manage expenses, and view insightful dashboards."
              />
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 sm:py-24 lg:py-32 bg-card border-t">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline text-balance">
              Ready to transform your library management?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Join other institutions simplifying their daily operations with
              CampusHub.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started for Free
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            Built by{' '}
            <a
              href="https://firebase.google.com/studio"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Firebase Studio
            </a>
            . Powered by Firebase and Next.js.
          </p>
           <div className="text-sm text-muted-foreground">
             &copy; {new Date().getFullYear()} CampusHub, Inc.
           </div>
        </div>
      </footer>
    </div>
  );
}
