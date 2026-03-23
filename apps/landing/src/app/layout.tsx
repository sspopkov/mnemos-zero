import type { ReactNode } from 'react';
import { Metadata } from 'next';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
  },
};
