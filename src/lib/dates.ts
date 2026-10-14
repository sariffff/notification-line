// ทุกอย่างคิดเป็น "วันที่" (ไม่มีเวลา) โซนไทย รูปแบบ YYYY-MM-DD
// string รูปแบบนี้เทียบมากกว่า/น้อยกว่ากันตรงๆ ได้

const TZ = 'Asia/Bangkok';

/** วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayTH(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function toUTC(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

/** จำนวนวันจาก a ถึง b (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function addDays(d: string, n: number): string {
  return new Date(toUTC(d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** วันครบกำหนดของรอบปัจจุบัน: ครั้งเดียว = end_date, รายปี = ครบรอบครั้งถัดไป (>= วันนี้) */
export function currentDueDate(endDate: string, recurrence: 'none' | 'yearly', today: string): string {
  // ยังไม่ถึงครบรอบแรก (รวมกรณี end_date อยู่อีกหลายปี) → ใช้ end_date ตรงๆ
  if (recurrence === 'none' || endDate >= today) return endDate;
  const [, m, d] = endDate.split('-').map(Number);
  let year = Number(today.slice(0, 4));
  const make = (y: number) => {
    // 29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทิน → 28 ก.พ.
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = m === 2 && d === 29 && !isLeap ? 28 : d;
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  let due = make(year);
  if (due < today) due = make(++year);
  return due;
}

/** แสดงวันที่แบบไทย เช่น "15 พ.ย. 2569" */
export function formatTH(d: string): string {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(toUTC(d)));
}

/** แสดงวันเวลาแบบไทยจาก timestamp */
export function formatDateTimeTH(ts: string): string {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
    .format(new Date(ts));
}
