import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Replora Voice Studio — Rumik ₹1 AI Voice Agent',
  description: 'Self-hosted AI Voice Agent Management Console with Dograh, Rumik Silk Mulberry TTS, Deepgram Nova-3, and VoBiz Telephony.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
