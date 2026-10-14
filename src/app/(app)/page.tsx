import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser, canEdit } from '@/lib/auth';
import { todayTH, formatTH, formatDateTimeTH } from '@/lib/dates';
import { dueInfo } from '@/lib/contracts';
import { DaysBadge } from '@/components/days-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'ภาพรวม' };

export default async function DashboardPage() {
  const { supabase, profile } = await requireUser();
  const today = todayTH();

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, project_name, contract_no, client_name, end_date, recurrence')
    .eq('status', 'active');

  const rows = (contracts ?? [])
    .map((c) => ({ ...c, ...dueInfo(c, today) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const stats = [
    { label: 'หมดอายุแล้ว', value: rows.filter((r) => r.daysLeft < 0).length, tone: 'text-zinc-700 dark:text-zinc-300' },
    { label: 'ภายใน 7 วัน', value: rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 7).length, tone: 'text-red-700 dark:text-red-400' },
    { label: 'ภายใน 30 วัน', value: rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30).length, tone: 'text-amber-700 dark:text-amber-400' },
    { label: 'สัญญาที่ใช้งาน', value: rows.length, tone: '' },
  ];
  const upcoming = rows.filter((r) => r.daysLeft >= 0).slice(0, 10);
  const expired = rows.filter((r) => r.daysLeft < 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ภาพรวม</h1>
          <p className="text-sm text-muted-foreground">ข้อมูล ณ วันที่ {formatTH(today)}</p>
        </div>
        {canEdit(profile.role) && (
          <Button asChild><Link href="/contracts/new">+ เพิ่มสัญญา</Link></Button>
        )}
      </div>

      {!profile.line_user_id && (
        <Alert>
          <AlertTitle>คุณยังไม่ได้ผูกบัญชี LINE</AlertTitle>
          <AlertDescription>
            <p>ผูกบัญชีเพื่อรับแจ้งเตือนสัญญาที่คุณรับผิดชอบ{' '}
              <Link href="/settings/line" className="font-medium underline underline-offset-4">ผูกบัญชีตอนนี้</Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardHeader className="px-4"><CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent className={cn('px-4 text-3xl font-semibold tabular-nums', s.tone)}>{s.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>ใกล้ครบกำหนด 10 รายการแรก</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีสัญญาที่ใกล้ครบกำหนด
              {canEdit(profile.role) && <> — <Link href="/contracts/new" className="underline">เพิ่มสัญญาแรก</Link></>}
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((r) => <ContractLine key={r.id} {...r} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      {expired.length > 0 && (
        <Card>
          <CardHeader><CardTitle>หมดอายุแล้วแต่ยังไม่ปิดสัญญา ({expired.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {expired.slice(0, 10).map((r) => <ContractLine key={r.id} {...r} />)}
            </ul>
          </CardContent>
        </Card>
      )}

      {profile.role === 'admin' && <AdminHealth />}
    </div>
  );
}

function ContractLine(r: { id: string; project_name: string; contract_no: string | null; dueDate: string; daysLeft: number }) {
  return (
    <li>
      <Link href={`/contracts/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md">
        <div className="min-w-0">
          <div className="truncate font-medium">{r.project_name}</div>
          <div className="text-xs text-muted-foreground">
            {r.contract_no && <>{r.contract_no} · </>}ครบกำหนด {formatTH(r.dueDate)}
          </div>
        </div>
        <DaysBadge daysLeft={r.daysLeft} />
      </Link>
    </li>
  );
}

/** โหลดข้อมูลสุขภาพระบบ (แยกจาก component เพราะใช้เวลาปัจจุบัน) */
async function loadHealth() {
  const { supabase } = await requireUser();
  const now = Date.now();
  const [{ data: lastRun }, { count: failed }, { count: pending }] = await Promise.all([
    supabase.from('cron_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .lt('created_at', new Date(now - 60 * 60_000).toISOString()),
  ]);
  const stale = !lastRun || now - new Date(lastRun.started_at).getTime() > 26 * 60 * 60_000;
  return { lastRun, failed, pending, stale };
}

/** admin: สถานะ cron ล่าสุด + log ที่มีปัญหา */
async function AdminHealth() {
  const { lastRun, failed, pending, stale } = await loadHealth();

  return (
    <Card>
      <CardHeader><CardTitle>สถานะระบบแจ้งเตือน (ผู้ดูแล)</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">รันอัตโนมัติล่าสุด</div>
          <div className={cn('font-medium', (stale || lastRun?.ok === false) && 'text-red-700 dark:text-red-400')}>
            {lastRun ? formatDateTimeTH(lastRun.started_at) : 'ยังไม่เคยรัน'}
            {lastRun?.ok === false && ' — ผิดพลาด'}
            {lastRun && stale && ' — ไม่ได้รันเกิน 1 วัน'}
          </div>
          {lastRun?.error && <div className="mt-1 text-xs text-red-700 dark:text-red-400">{lastRun.error}</div>}
        </div>
        <div>
          <div className="text-muted-foreground">ส่งไม่สำเร็จ (รอส่งใหม่)</div>
          <div className="font-medium tabular-nums">{failed ?? 0} รายการ</div>
        </div>
        <div>
          <div className="text-muted-foreground">ค้างสถานะกำลังส่ง &gt; 1 ชม.</div>
          <div className={cn('font-medium tabular-nums', (pending ?? 0) > 0 && 'text-red-700 dark:text-red-400')}>
            {pending ?? 0} รายการ
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
