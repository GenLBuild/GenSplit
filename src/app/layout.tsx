import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GenSplit — Split Bills & Bulk Payouts on GenLayer',
  description: 'Split bills and send bulk GEN payments on GenLayer testnet with Intelligent Contract dispute resolution.',
  keywords: ['GenLayer', 'GEN', 'split bill', 'crypto payments', 'Web3'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('error', function (e) {
              if (e && e.message && /Loading chunk|ChunkLoadError|Failed to load chunk/i.test(e.message)) {
                window.location.reload();
              }
            });
            window.addEventListener('unhandledrejection', function (e) {
              var msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
              if (/Loading chunk|ChunkLoadError|Failed to load chunk/i.test(msg)) {
                window.location.reload();
              }
            });
          `,
        }}
      />
    <html lang="en" className="bg-white text-black">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
    </>
  );
}
