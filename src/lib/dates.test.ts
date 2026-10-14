import { describe, expect, it } from 'vitest';
import { addDays, currentDueDate, daysBetween, formatTH, todayTH } from './dates';

describe('todayTH', () => {
  it('17:00 UTC = เที่ยงคืนไทย → เป็นวันถัดไปแล้ว', () => {
    expect(todayTH(new Date('2026-10-14T17:00:00Z'))).toBe('2026-10-15');
  });
  it('16:59 UTC ยังเป็นวันเดิม', () => {
    expect(todayTH(new Date('2026-10-14T16:59:59Z'))).toBe('2026-10-14');
  });
  it('23:30 UTC เป็นวันถัดไปของไทย', () => {
    expect(todayTH(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});

describe('daysBetween / addDays', () => {
  it('นับวันข้ามเดือน', () => {
    expect(daysBetween('2026-10-16', '2026-11-15')).toBe(30);
  });
  it('ค่าติดลบเมื่อเลยกำหนด', () => {
    expect(daysBetween('2026-11-16', '2026-11-15')).toBe(-1);
  });
  it('ข้ามปีอธิกสุรทิน', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
  it('addDays', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('currentDueDate', () => {
  it('ครั้งเดียว → end_date เสมอ แม้เลยไปแล้ว', () => {
    expect(currentDueDate('2026-01-01', 'none', '2026-10-14')).toBe('2026-01-01');
  });
  it('รายปี: ครบรอบปีนี้ยังไม่ถึง', () => {
    expect(currentDueDate('2020-12-01', 'yearly', '2026-10-14')).toBe('2026-12-01');
  });
  it('รายปี: ครบรอบปีนี้ผ่านไปแล้ว → ปีหน้า', () => {
    expect(currentDueDate('2020-03-01', 'yearly', '2026-10-14')).toBe('2027-03-01');
  });
  it('รายปี: วันนี้คือวันครบรอบ → วันนี้', () => {
    expect(currentDueDate('2020-10-14', 'yearly', '2026-10-14')).toBe('2026-10-14');
  });
  it('รายปี: end_date อยู่ในอนาคตหลายปี → ใช้ end_date (ไม่แจ้งก่อนเวลา)', () => {
    expect(currentDueDate('2028-03-01', 'yearly', '2026-10-14')).toBe('2028-03-01');
  });
  it('รายปี: 29 ก.พ. ในปีปกติ → 28 ก.พ.', () => {
    expect(currentDueDate('2024-02-29', 'yearly', '2026-01-10')).toBe('2026-02-28');
  });
  it('รายปี: 29 ก.พ. ในปีอธิกสุรทิน → 29 ก.พ.', () => {
    expect(currentDueDate('2024-02-29', 'yearly', '2027-12-01')).toBe('2028-02-29');
  });
});

describe('formatTH', () => {
  it('แสดงปี พ.ศ.', () => {
    expect(formatTH('2026-11-15')).toContain('2569');
  });
});
