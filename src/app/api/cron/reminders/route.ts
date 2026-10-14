import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { todayTH, currentDueDate } from '@/lib/dates';
import { computeDue, buildMessage, type ContractRow, type DueReminder } from '@/lib/reminders';
import { pushText, retryKeyFor } from '@/lib/line';
import type { Database } from '@/types/database';

export const maxDuration = 60;

type LogInsert = Database['public']['Tables']['notification_logs']['Insert'];

const LOG_KEY = 'contract_id,user_id,due_date,offset_days,channel';
const k = (contractId: string, userId: string, x: string | number) => `${contractId}:${userId}:${x}`;

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ทดสอบย้อน/ล่วงหน้าได้ใน dev: /api/cron/reminders?date=2026-11-14
  const override = req.nextUrl.searchParams.get('date');
  const today = process.env.NODE_ENV !== 'production' && override && /^\d{4}-\d{2}-\d{2}$/.test(override)
    ? override : todayTH();
  const dryRun = req.nextUrl.searchParams.get('dry') === '1';
  const appUrl = process.env.APP_URL!;
  const db = supabaseAdmin();

  const { data: run } = dryRun
    ? { data: null }
    : await db.from('cron_runs').insert({ run_date: today }).select('id').single();

  try {
    // ---------- 1) ดึงข้อมูลครั้งเดียว ----------
    const [contractsRes, logsRes] = await Promise.all([
      db.from('contracts')
        .select('id, project_name, contract_no, client_name, end_date, recurrence, reminder_offsets, contract_recipients(user_id)')
        .eq('status', 'active'),
      db.from('notification_logs')
        .select('id, contract_id, user_id, due_date, offset_days, status')
        .eq('channel', 'line').gte('due_date', today),   // dueDate ของรอบปัจจุบัน >= วันนี้เสมอ
    ]);
    if (contractsRes.error) throw contractsRes.error;
    if (logsRes.error) throw logsRes.error;

    const logsByKey = Map.groupBy(logsRes.data, (l) => k(l.contract_id, l.user_id, l.due_date));

    // ---------- 2) คำนวณว่าใครต้องได้อะไร ----------
    const plan: { userId: string; r: DueReminder }[] = [];
    const skipRows: LogInsert[] = [];
    const failedIds: number[] = [];

    for (const c of contractsRes.data) {
      const contract: ContractRow = c;
      const dueDate = currentDueDate(c.end_date, c.recurrence, today);
      for (const { user_id } of c.contract_recipients) {
        const logs = logsByKey.get(k(c.id, user_id, dueDate)) ?? [];
        const done = new Set(logs.filter((l) => l.status !== 'failed').map((l) => l.offset_days));
        const r = computeDue(contract, today, done);
        if (!r) continue;

        r.skipOffsets.forEach((o) => skipRows.push({
          contract_id: c.id, user_id, due_date: r.dueDate, offset_days: o, channel: 'line', status: 'skipped',
        }));
        const failed = logs.find((l) => l.offset_days === r.offset && l.status === 'failed');
        if (failed) failedIds.push(failed.id);
        plan.push({ userId: user_id, r });
      }
    }

    const userIds = [...new Set(plan.map((p) => p.userId))];
    const { data: profiles, error: pErr } = userIds.length
      ? await db.from('profiles').select('id, line_user_id').in('id', userIds)
      : { data: [], error: null };
    if (pErr) throw pErr;
    const lineIdOf = new Map(profiles.map((p) => [p.id, p.line_user_id]));

    if (dryRun) {
      const grouped = Map.groupBy(plan, (p) => p.userId);
      return NextResponse.json({
        today,
        skipped: skipRows.length,
        users: [...grouped].map(([id, ps]) => ({
          id, linked: !!lineIdOf.get(id), count: ps.length,
          text: buildMessage(ps.map((p) => p.r), appUrl),
        })),
      });
    }

    // ---------- 3) จองสิทธิ์ส่ง (กัน cron ซ้อน) ----------
    if (skipRows.length) {
      const { error } = await db.from('notification_logs')
        .upsert(skipRows, { onConflict: LOG_KEY, ignoreDuplicates: true });
      if (error) throw error;
    }
    const pendingRows: LogInsert[] = plan.map(({ userId, r }) => ({
      contract_id: r.contract.id, user_id: userId, due_date: r.dueDate,
      offset_days: r.offset, channel: 'line', status: 'pending',
    }));
    // insert ... on conflict do nothing → ได้คืนเฉพาะแถวที่ "เราจองได้"
    const { data: inserted, error: insErr } = pendingRows.length
      ? await db.from('notification_logs')
          .upsert(pendingRows, { onConflict: LOG_KEY, ignoreDuplicates: true })
          .select('id, contract_id, user_id, offset_days')
      : { data: [], error: null };
    if (insErr) throw insErr;
    // แถว failed เดิม → เปลี่ยนเป็น pending แบบมีเงื่อนไข (ถ้า cron อีกตัวจองไปแล้วจะไม่ได้คืน)
    const { data: retried, error: rErr } = failedIds.length
      ? await db.from('notification_logs').update({ status: 'pending', error: null })
          .in('id', failedIds).eq('status', 'failed')
          .select('id, contract_id, user_id, offset_days')
      : { data: [], error: null };
    if (rErr) throw rErr;

    const claimed = new Map([...inserted, ...retried].map((l) => [k(l.contract_id, l.user_id, l.offset_days), l.id]));

    // ---------- 4) ส่ง 1 ข้อความ/คน แล้วอัปเดตผล ----------
    const perUser = Map.groupBy(
      plan.filter(({ userId, r }) => claimed.has(k(r.contract.id, userId, r.offset))),
      (p) => p.userId,
    );
    let sent = 0, failed = 0;

    for (const [userId, ps] of perUser) {
      const ids = ps.map(({ r }) => claimed.get(k(r.contract.id, userId, r.offset))!).sort((a, b) => a - b);
      const lineId = lineIdOf.get(userId);
      try {
        if (!lineId) throw new Error('ผู้ใช้ยังไม่ได้ผูกบัญชี LINE');
        const seed = `${userId}:${today}:${ids.join(',')}`;   // ชุดรายการเดิม = key เดิม
        await pushText(lineId, buildMessage(ps.map((p) => p.r), appUrl), retryKeyFor(seed));
        await db.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).in('id', ids);
        sent++;
      } catch (e) {
        await db.from('notification_logs').update({ status: 'failed', error: errorMessage(e) }).in('id', ids);
        failed++;
      }
    }

    const stats = { users: perUser.size, sent, failed, skipped: skipRows.length };
    if (run) {
      await db.from('cron_runs')
        .update({ ok: failed === 0, stats, finished_at: new Date().toISOString() }).eq('id', run.id);
    }
    return NextResponse.json({ today, ...stats });
  } catch (e) {
    const message = errorMessage(e);
    if (run) {
      await db.from('cron_runs')
        .update({ ok: false, error: message, finished_at: new Date().toISOString() }).eq('id', run.id);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String(e.message);
  return String(e);
}
