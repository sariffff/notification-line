import { currentDueDate, daysBetween } from './dates';
import type { Tables } from '@/types/database';

export type Urgency = 'expired' | 'critical' | 'soon' | 'ok' | 'inactive';

/** วันครบกำหนดของรอบปัจจุบัน + จำนวนวันคงเหลือ (ติดลบ = เลยกำหนดแล้ว) */
export function dueInfo(c: Pick<Tables<'contracts'>, 'end_date' | 'recurrence'>, today: string) {
  const dueDate = currentDueDate(c.end_date, c.recurrence, today);
  return { dueDate, daysLeft: daysBetween(today, dueDate) };
}

export function urgencyOf(daysLeft: number, status: Tables<'contracts'>['status'] = 'active'): Urgency {
  if (status !== 'active') return 'inactive';
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'soon';
  return 'ok';
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft < 0) return `หมดอายุแล้ว ${-daysLeft} วัน`;
  if (daysLeft === 0) return 'ครบกำหนดวันนี้';
  return `อีก ${daysLeft} วัน`;
}

export const STATUS_LABEL: Record<Tables<'contracts'>['status'], string> = {
  active: 'ใช้งาน',
  renewed: 'ต่อสัญญาแล้ว',
  closed: 'ปิดแล้ว',
};

export const RECURRENCE_LABEL: Record<Tables<'contracts'>['recurrence'], string> = {
  none: 'ครั้งเดียว',
  yearly: 'ทุกปี',
};

export const ROLE_LABEL = { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน', viewer: 'ดูอย่างเดียว' } as const;

export function offsetLabel(o: number): string {
  return o === 0 ? 'วันครบกำหนด' : `${o} วันก่อน`;
}

export function formatMoney(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v);
}
