'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createLinkCode, unlinkLine } from './actions';
import { Button } from '@/components/ui/button';

const sendCodeUrl = (code: string) =>
  `https://line.me/R/oaMessage/${encodeURIComponent(process.env.NEXT_PUBLIC_LINE_OA_ID ?? '')}/?${code}`;

export function LinkPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<{ code: string; expiresAt: number } | null>(null);
  // เริ่มที่ 0 (ห้ามเรียก Date.now() ตอน prerender) — ตั้งค่าจริงตอนสร้างรหัส
  const [now, setNow] = useState(0);

  const secondsLeft = link ? Math.max(0, Math.round((link.expiresAt - now) / 1000)) : 0;
  const expired = !!link && secondsLeft === 0;

  // ระหว่างรอผู้ใช้ส่งรหัส: นับถอยหลัง + refresh ทุก 4 วินาทีเพื่อดูว่าผูกสำเร็จหรือยัง
  useEffect(() => {
    if (!link || expired) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => router.refresh(), 4000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [link, expired, router]);

  const generate = () =>
    startTransition(async () => {
      const res = await createLinkCode();
      if (res.error || !res.code) { toast.error(res.error ?? 'สร้างรหัสไม่สำเร็จ'); return; }
      setNow(Date.now());
      setLink({ code: res.code, expiresAt: new Date(res.expiresAt!).getTime() });
    });

  if (!link || expired) {
    return (
      <div className="mt-2 space-y-2">
        {expired && <p className="text-sm text-red-700 dark:text-red-400">รหัสหมดอายุแล้ว กรุณาสร้างใหม่</p>}
        <Button onClick={generate} disabled={pending} className="h-11">
          {pending ? 'กำลังสร้าง…' : expired ? 'สร้างรหัสใหม่' : 'สร้างรหัสผูกบัญชี'}
        </Button>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="mt-3 space-y-4 rounded-xl border bg-muted/40 p-4">
      <div>
        <div className="text-sm text-muted-foreground">รหัสของคุณ</div>
        <div className="font-mono text-4xl font-semibold tracking-[0.2em] tabular-nums" aria-live="polite">
          {link.code}
        </div>
        <div className="text-sm text-muted-foreground">หมดอายุใน {mm}:{ss} นาที · ใช้ได้ครั้งเดียว</div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={sendCodeUrl(link.code)} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#06C755] px-4 text-sm font-medium text-white hover:bg-[#05b34c]">
          เปิด LINE และส่งรหัสอัตโนมัติ
        </a>
        <Button variant="outline" className="h-11" onClick={() => {
          navigator.clipboard.writeText(link.code).then(() => toast.success('คัดลอกรหัสแล้ว'));
        }}>
          คัดลอกรหัส
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        หรือพิมพ์รหัสนี้ในแชทกับ LINE OA เอง · เมื่อผูกสำเร็จ หน้านี้จะอัปเดตอัตโนมัติ
      </p>
    </div>
  );
}

export function UnlinkButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => {
      if (!confirm('ยกเลิกการผูก LINE? คุณจะไม่ได้รับแจ้งเตือนจนกว่าจะผูกใหม่')) return;
      startTransition(async () => {
        const res = await unlinkLine();
        if (res.error) toast.error(res.error);
        else toast.success('ยกเลิกการผูกบัญชีแล้ว');
      });
    }}>
      {pending ? 'กำลังยกเลิก…' : 'ยกเลิกการผูกบัญชี'}
    </Button>
  );
}
