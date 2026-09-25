import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { SkipLinks } from '@/components/a11y/SkipLinks';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlainClause — Read the contract you\'re about to sign',
  description:
    'Upload a rental agreement, offer letter, or freelance contract. ' +
    'PlainClause shows you what\'s in it, what\'s missing, and what to ask about. ' +
    'Information, not legal advice.',
  robots: 'noindex, nofollow', // Hackathon demo — no indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <SkipLinks />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
