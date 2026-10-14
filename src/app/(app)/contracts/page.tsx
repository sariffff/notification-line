import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser, canEdit } from '@/lib/auth';
import { formatTH, todayTH } from '@/lib/dates';
import { dueInfo, RECURRENCE_LABEL } from '@/lib/contracts';
import { DaysBadge } from '@/components/days-badge';
import { FlashToast } from '@/components/flash-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ContractStatus } from '@/types/database';

export const metadata: Metadata = { title: 'สัญญา' };

const STATUS_FILTERS = [
  { value: 'active', label: 'ใช้งาน' },
  { value: 'closed', label: 'ปิดแล้ว' },
  { value: 'all', label: 'ทั้งหมด' },
] as const;

export default async function ContractsPage({ searchParams }: PageProps<'/contracts'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const status = STATUS_FILTERS.some((f) => f.value === sp.status) ? (sp.status as string) : 'active';

  const { supabase, profile } = await requireUser();
  const today = todayTH();

  let query = supabase
    .from('contracts')
    .select('id, project_name, contract_no, client_name, end_date, recurrence, status')
    .limit(500);
  if (status !== 'all') query = query.eq('status', status as ContractStatus);
  if (q) {
    // ตัดอักขระพิเศษของ PostgREST filter ออก กัน query พัง/ถูกแทรก
    const safe = q.replace(/[,()*%\\:"]/g, ' ').trim();
    if (safe) query = query.or(['project_name', 'contract_no', 'client_name'].map((col) => `${col}.ilike."*${safe}*"`).join(','));
  }
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? [])
    .map((c) => ({ ...c, ...dueInfo(c, today) }))
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-4">
      <FlashToast flash={sp.flash} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">สัญญา</h1>
        {canEdit(profile.role) && <Button asChild><Link href="/contracts/new">+ เพิ่มสัญญา</Link></Button>}
      </div>

      {/* ตัวกรองเก็บใน URL — แชร์ลิงก์ได้ กด back ได้ */}
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">ค้นหา</label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="ค้นหาชื่อโครงการ เลขที่สัญญา หรือลูกค้า"
          className="h-11 sm:max-w-sm" />
        <label htmlFor="status" className="sr-only">สถานะ</label>
        <select id="status" name="status" defaultValue={status}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <Button type="submit" variant="secondary" className="h-11">ค้นหา</Button>
      </form>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {q ? `ไม่พบสัญญาที่ตรงกับ "${q}"` : 'ยังไม่มีสัญญา'}
            {!q && canEdit(profile.role) && (
              <div className="mt-3"><Button asChild variant="outline"><Link href="/contracts/new">เพิ่มสัญญาแรก</Link></Button></div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{rows.length} รายการ</p>

          {/* มือถือ: การ์ด */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/contracts/${r.id}`} className="block rounded-xl border p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{r.project_name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[r.contract_no, r.client_name].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <DaysBadge daysLeft={r.daysLeft} status={r.status} />
                  </div>
                  <div className="mt-2 text-sm">ครบกำหนด {formatTH(r.dueDate)} · {RECURRENCE_LABEL[r.recurrence]}</div>
                </Link>
              </li>
            ))}
          </ul>

          {/* จอใหญ่: ตาราง */}
          <div className="hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>โครงการ</TableHead>
                  <TableHead>เลขที่สัญญา</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>ครบกำหนด</TableHead>
                  <TableHead>รูปแบบ</TableHead>
                  <TableHead className="text-right">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-72 truncate font-medium">
                      <Link href={`/contracts/${r.id}`} className="hover:underline">{r.project_name}</Link>
                    </TableCell>
                    <TableCell>{r.contract_no ?? '—'}</TableCell>
                    <TableCell className="max-w-48 truncate">{r.client_name ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">{formatTH(r.dueDate)}</TableCell>
                    <TableCell>{RECURRENCE_LABEL[r.recurrence]}</TableCell>
                    <TableCell className="text-right"><DaysBadge daysLeft={r.daysLeft} status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
