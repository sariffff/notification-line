import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const plexThai = IBM_Plex_Sans_Thai({
  variable: '--font-sans',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: { default: 'ระบบแจ้งเตือนสัญญา', template: '%s · ระบบแจ้งเตือนสัญญา' },
  description: 'บันทึกสัญญาและแจ้งเตือนผ่าน LINE ก่อนหมดอายุ',
  robots: { index: false, follow: false },   // ระบบภายใน ไม่ให้ search engine index
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
