import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | CampusHub',
    default: 'CampusHub | Student Management System',
  },
  description: 'CampusHub brings everything—students, seating, and payments—into one simple, powerful platform for modern library and student facility management.',
  applicationName: 'CampusHub',
  keywords: ['student management', 'library software', 'campus management', 'seat booking', 'billing system', 'co-working space software'],
  authors: [{ name: 'Firebase Studio', url: 'https://firebase.google.com/studio' }],
  openGraph: {
    title: 'CampusHub | Your Campus, Organized',
    description: 'The all-in-one solution for modern student management.',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=630&fit=crop',
        width: 1200,
        height: 630,
        alt: 'A team collaborating in a modern workspace, representing CampusHub\'s features.',
      },
    ],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=PT+Sans:wght@400;700&family=Source+Code+Pro:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
