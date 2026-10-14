import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, canEdit } from '@/lib/auth';
import { formatDateTimeTH, formatTH, todayTH } from '@/lib/dates';
import { dueInfo, formatMoney, offsetLabel, RECURRENCE_LABEL, STATUS_LABEL } from '@/lib/contracts';
import { DaysBadge } from '@/components/days-badge';
import { FlashToast } from '@/components/flash-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteContractButton } from './delete-button';
import type { LogStatus } from '@/types/database';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'รายละเอียดสัญญา' };

const LOG_LABEL: Record<LogStatus, { text: string; className: string }> = {
  sent: { text: 'ส่งแล้ว', className: 'text-emerald-700 dark:text-emerald-400' },
  pending: { text: 'กำลังส่ง', className: 'text-muted-foreground' },
  failed: { text: 'ส่งไม่สำเร็จ', className: 'text-red-700 dark:text-red-400' },
  skipped: { text: 'ข้าม (เลยรอบ)', className: 'text-muted-foreground' },
};

export default async function ContractDetailPage({ params, searchParams }: PageProps<'/contracts/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await requireUser();

  const [{ data: c }, { data: recipients }, { data: logs }] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', id).maybeSingle(),
    supabase.from('contract_recipients').select('profiles(id, full_name, line_user_id)').eq('contract_id', id),
    supabase.from('notification_logs')
      .select('id, due_date, offset_days, status, error, created_at, sent_at, profiles(full_name)')
      .eq('contract_id', id).order('created_at', { ascending: false }).limit(50),
  ]);
  if (!c) notFound();

  const { dueDate, daysLeft } = dueInfo(c, todayTH());
  const people = (recipients ?? []).flatMap((r) => (r.profiles ? [r.profiles] : []));

  const details: [string, React.ReactNode][] = [
    ['เลขที่สัญญา', c.contract_no ?? '—'],
    ['ลูกค้า / คู่สัญญา', c.client_name ?? '—'],
    ['วันเริ่มสัญญา', c.start_date ? formatTH(c.start_date) : '—'],
    ['วันสิ้นสุด', formatTH(c.end_date)],
    ['รูปแบบ', RECURRENCE_LABEL[c.recurrence]],
    ['ครบกำหนดรอบนี้', formatTH(dueDate)],
    ['มูลค่า', formatMoney(c.value)],
    ['สถานะ', STATUS_LABEL[c.status]],
    ['แจ้งเตือนล่วงหน้า', [...c.reminder_offsets].sort((a, b) => b - a).map(offsetLabel).join(', ')],
  ];

  return (
    <div className="space-y-6">
      <FlashToast flash={sp.flash} />
      <div>
        <Link href="/contracts" className="text-sm text-muted-foreground hover:underline">← กลับไปหน้าสัญญา</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold break-words">{c.project_name}</h1>
            <div className="mt-2"><DaysBadge daysLeft={daysLeft} status={c.status} /></div>
          </div>
          {canEdit(profile.role) && (
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href={`/contracts/${c.id}/edit`}>แก้ไข</Link></Button>
              <DeleteContractButton id={c.id} name={c.project_name} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>ข้อมูลสัญญา</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              {c.note && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">หมายเหตุ</dt>
                  <dd className="whitespace-pre-wrap">{c.note}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ผู้รับแจ้งเตือน</CardTitle></CardHeader>
          <CardContent>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีผู้รับ — จะไม่มีใครได้รับแจ้งเตือน</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.full_name}</span>
                    {p.line_user_id
                      ? <span className="text-xs text-emerald-700 dark:text-emerald-400">ผูก LINE แล้ว</span>
                      : <span className="text-xs text-amber-700 dark:text-amber-400">ยังไม่ผูก LINE</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>ประวัติการแจ้งเตือน</CardTitle></CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <div>
                    <span className="font-medium">{l.profiles?.full_name ?? '—'}</span>
                    <span className="text-muted-foreground"> · รอบ {offsetLabel(l.offset_days)} (ครบกำหนด {formatTH(l.due_date)})</span>
                    {l.error && <div className="text-xs text-red-700 dark:text-red-400">{l.error}</div>}
                  </div>
                  <div className="text-right">
                    <span className={cn('font-medium', LOG_LABEL[l.status].className)}>{LOG_LABEL[l.status].text}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatDateTimeTH(l.sent_at ?? l.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
