import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Baby Milk & Activity Tracker (Realtime PWA)',
  description: 'Aplikasi pelacak susu bayi realtime dan aktivitas untuk Ayah dan Ibu',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Baby Tracker',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-background text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
