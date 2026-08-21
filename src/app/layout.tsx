import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GenSplit — Split Bills & Bulk Payouts on GenLayer',
  description: 'Split bills and send bulk GEN payments on GenLayer testnet with Intelligent Contract dispute resolution.',
  keywords: ['GenLayer', 'GEN', 'split bill', 'crypto payments', 'Web3'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-white text-black">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
