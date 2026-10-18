import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'YKB — You Know Ball', description: 'Football player-stat predictions, built for fans in Nigeria.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
