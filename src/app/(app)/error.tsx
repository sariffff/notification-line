'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ระบบไม่สามารถแสดงหน้านี้ได้ กรุณาลองใหม่อีกครั้ง
        {error.digest && <span className="block mt-1 font-mono text-xs">รหัสอ้างอิง: {error.digest}</span>}
      </p>
      <Button className="mt-6" onClick={() => retry()}>ลองใหม่</Button>
    </div>
  );
}
