'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'ภาพรวม' },
  { href: '/contracts', label: 'สัญญา' },
  { href: '/settings/line', label: 'ตั้งค่า LINE' },
] as const;

/** เมนูหลัก — static shell แสดงลิงก์ก่อน แล้วค่อยไฮไลต์หน้าปัจจุบันเมื่อรู้ pathname */
export function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={cn('items-center gap-1', className)} aria-label="เมนูหลัก">
      <Suspense fallback={<Links pathname={null} />}>
        <ActiveLinks />
      </Suspense>
    </nav>
  );
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return LINKS.map(({ href, label }) => {
    const active = pathname != null && (href === '/' ? pathname === '/' : pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted',
          active ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </Link>
    );
  });
}
