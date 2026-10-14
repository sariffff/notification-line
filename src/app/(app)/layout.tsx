import { Suspense } from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/contracts';
import { signOut } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NavLinks } from './nav-links';

// layout เป็น static shell — ส่วนที่อ่าน session อยู่หลัง <Suspense> (Cache Components)
// ส่วน {children} มี loading.tsx เป็น boundary อยู่แล้ว
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="shrink-0 font-semibold">📋 แจ้งเตือนสัญญา</Link>
          <NavLinks className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={<Skeleton className="h-8 w-32" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
        <NavLinks className="flex overflow-x-auto border-t px-2 md:hidden" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const { profile } = await requireUser();
  return (
    <>
      <div className="hidden text-right text-sm leading-tight sm:block">
        <div className="font-medium">{profile.full_name}</div>
        <div className="text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</div>
      </div>
      <form action={signOut}>
        <Button variant="outline" size="sm" type="submit">ออกจากระบบ</Button>
      </form>
    </>
  );
}
