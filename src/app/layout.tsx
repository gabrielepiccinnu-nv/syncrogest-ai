import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Syncrogest AI',
  description: 'Motore intelligente per la gestione Syncrogest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
