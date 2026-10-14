import { daysBetween, currentDueDate, formatTH } from './dates';

export type ContractRow = {
  id: string; project_name: string; contract_no: string | null; client_name: string | null;
  end_date: string; recurrence: 'none' | 'yearly'; reminder_offsets: number[];
};

export type DueReminder = {
  contract: ContractRow; dueDate: string; daysLeft: number;
  offset: number;            // รอบที่จะส่ง
  skipOffsets: number[];     // รอบใหญ่กว่าที่พลาดไป → บันทึกเป็น skipped
};

/**
 * เลือก "รอบที่เล็กที่สุดที่ >= daysLeft" ที่ยังไม่ได้ทำ
 * doneOffsets = รอบของ dueDate นี้ที่ sent / skipped / pending แล้ว (failed ไม่นับ → retry)
 * ตัวอย่าง offsets [30,7,1,0], daysLeft = 5, ยังไม่ส่งอะไรเลย (ระบบล่มไป)
 *   → ส่งรอบ 7, บันทึก 30 เป็น skipped (ไม่ส่งข้อความเก่าซ้ำ)
 */
export function computeDue(
  c: ContractRow, today: string, doneOffsets: Set<number>
): DueReminder | null {
  const dueDate = currentDueDate(c.end_date, c.recurrence, today);
  const daysLeft = daysBetween(today, dueDate);
  if (daysLeft < 0) return null;

  const offsets = [...c.reminder_offsets].sort((a, b) => a - b);
  const candidate = offsets.find((o) => o >= daysLeft);
  if (candidate === undefined || doneOffsets.has(candidate)) return null;

  const skipOffsets = offsets.filter((o) => o > candidate && !doneOffsets.has(o));
  return { contract: c, dueDate, daysLeft, offset: candidate, skipOffsets };
}

export const MAX_ITEMS = 20; // กันข้อความเกิน 5,000 ตัวอักษรของ LINE

export function buildMessage(items: DueReminder[], appUrl: string): string {
  const sorted = [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  const lines = sorted.slice(0, MAX_ITEMS).map((r) => {
    const when = r.daysLeft === 0 ? '🔴 วันนี้' : r.daysLeft <= 7 ? `🟠 อีก ${r.daysLeft} วัน` : `🟢 อีก ${r.daysLeft} วัน`;
    const no = r.contract.contract_no ? ` (${r.contract.contract_no})` : '';
    return `${when} — ${r.contract.project_name}${no}\nครบกำหนด ${formatTH(r.dueDate)}`;
  });
  const more = sorted.length > MAX_ITEMS ? `\n\n…และอีก ${sorted.length - MAX_ITEMS} รายการ` : '';
  return `📋 แจ้งเตือนสัญญาใกล้ครบกำหนด ${items.length} รายการ\n\n${lines.join('\n\n')}${more}\n\nดูรายละเอียด: ${appUrl}/contracts`;
}
