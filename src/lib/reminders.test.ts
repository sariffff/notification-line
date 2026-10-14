import { describe, expect, it } from 'vitest';
import { buildMessage, computeDue, MAX_ITEMS, type ContractRow, type DueReminder } from './reminders';

const contract = (over: Partial<ContractRow> = {}): ContractRow => ({
  id: 'c1', project_name: 'โครงการ A', contract_no: 'CT-001', client_name: null,
  end_date: '2026-11-15', recurrence: 'none', reminder_offsets: [30, 7, 1, 0],
  ...over,
});

describe('computeDue', () => {
  it('ถึงรอบ 30 วันพอดี → ส่งรอบ 30', () => {
    const r = computeDue(contract(), '2026-10-16', new Set());
    expect(r).toMatchObject({ offset: 30, daysLeft: 30, dueDate: '2026-11-15', skipOffsets: [] });
  });

  it('ยังไม่ถึงรอบแรก → ไม่ส่ง', () => {
    expect(computeDue(contract(), '2026-10-15', new Set())).toBeNull();
  });

  it('ส่งรอบ 30 ไปแล้ว ระหว่างทาง (เหลือ 20 วัน) → ไม่ส่งซ้ำ', () => {
    expect(computeDue(contract(), '2026-10-26', new Set([30]))).toBeNull();
  });

  it('รันซ้ำวันเดียวกัน (pending/sent แล้ว) → ไม่ส่งซ้ำ', () => {
    expect(computeDue(contract(), '2026-10-16', new Set([30]))).toBeNull();
  });

  it('ระบบล่ม เหลือ 5 วัน ยังไม่ส่งอะไร → ส่งรอบ 7 และ skip 30', () => {
    const r = computeDue(contract(), '2026-11-10', new Set());
    expect(r).toMatchObject({ offset: 7, daysLeft: 5, skipOffsets: [30] });
  });

  it('ส่ง 30 แล้ว เหลือ 5 วัน → ส่งรอบ 7 ไม่ skip อะไร', () => {
    const r = computeDue(contract(), '2026-11-10', new Set([30]));
    expect(r).toMatchObject({ offset: 7, skipOffsets: [] });
  });

  it('รอบที่เคย failed (ไม่อยู่ใน done) → ส่งใหม่', () => {
    const r = computeDue(contract(), '2026-11-08', new Set([30]));
    expect(r?.offset).toBe(7);
  });

  it('วันหมดอายุ → รอบ 0', () => {
    const r = computeDue(contract(), '2026-11-15', new Set([30, 7, 1]));
    expect(r).toMatchObject({ offset: 0, daysLeft: 0 });
  });

  it('เลยวันหมดอายุ → ไม่ส่ง', () => {
    expect(computeDue(contract(), '2026-11-16', new Set())).toBeNull();
  });

  it('offsets ไม่เรียงก็ทำงานถูก', () => {
    const r = computeDue(contract({ reminder_offsets: [0, 30, 1, 7] }), '2026-11-14', new Set([30, 7]));
    expect(r?.offset).toBe(1);
  });

  it('รายปี: หลังครบรอบปีนี้ → นับรอบปีหน้า', () => {
    const c = contract({ end_date: '2025-11-15', recurrence: 'yearly' });
    const r = computeDue(c, '2026-10-16', new Set());
    expect(r).toMatchObject({ dueDate: '2026-11-15', offset: 30 });
  });

  it('รายปี: end_date ในอนาคตหลายปี → ไม่แจ้งก่อนเวลา', () => {
    const c = contract({ end_date: '2028-11-15', recurrence: 'yearly' });
    expect(computeDue(c, '2026-10-16', new Set())).toBeNull();
  });
});

describe('buildMessage', () => {
  const item = (id: string, daysLeft: number): DueReminder => ({
    contract: contract({ id, project_name: `P-${id}` }), dueDate: '2026-11-15', daysLeft, offset: daysLeft, skipOffsets: [],
  });

  it('เรียงจากใกล้สุด และใส่ลิงก์', () => {
    const text = buildMessage([item('a', 30), item('b', 0), item('c', 7)], 'https://app.test');
    expect(text.indexOf('P-b')).toBeLessThan(text.indexOf('P-c'));
    expect(text.indexOf('P-c')).toBeLessThan(text.indexOf('P-a'));
    expect(text).toContain('🔴 วันนี้');
    expect(text).toContain('3 รายการ');
    expect(text).toContain('https://app.test/contracts');
  });

  it('ตัดเมื่อเกิน MAX_ITEMS', () => {
    const items = Array.from({ length: MAX_ITEMS + 5 }, (_, i) => item(String(i), 10));
    const text = buildMessage(items, 'https://app.test');
    expect(text).toContain('และอีก 5 รายการ');
    expect(text.length).toBeLessThan(5000);
  });
});
