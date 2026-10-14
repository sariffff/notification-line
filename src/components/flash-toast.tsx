'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

const MESSAGES: Record<string, string> = {
  saved: 'บันทึกสัญญาเรียบร้อย',
  deleted: 'ลบสัญญาเรียบร้อย',
};

/** แสดง toast จาก ?flash=xxx หลัง redirect แล้วลบ param ออกจาก URL */
export function FlashToast({ flash }: { flash?: string | string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const key = typeof flash === 'string' ? flash : undefined;

  useEffect(() => {
    if (!key || !MESSAGES[key]) return;
    toast.success(MESSAGES[key]);
    const params = new URLSearchParams(window.location.search);
    params.delete('flash');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [key, pathname, router]);

  return null;
}
