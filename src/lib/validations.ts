import { z } from 'zod';

export const OFFSET_CHOICES = [90, 60, 30, 14, 7, 3, 1, 0] as const;
export const DEFAULT_OFFSETS = [30, 7, 1, 0];

const optionalText = (max: number) =>
  z.string().trim().max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`).transform((v) => v || null);

const isoDate = z.iso.date({ error: 'วันที่ไม่ถูกต้อง' });

export const contractSchema = z
  .object({
    project_name: z.string().trim().min(1, 'กรุณากรอกชื่อโครงการ').max(200, 'ยาวได้ไม่เกิน 200 ตัวอักษร'),
    contract_no: optionalText(100),
    client_name: optionalText(200),
    start_date: z.union([z.literal('').transform(() => null), isoDate]),
    end_date: z.string().min(1, 'กรุณาเลือกวันสิ้นสุด').pipe(isoDate),
    recurrence: z.enum(['none', 'yearly'], { error: 'กรุณาเลือกรูปแบบ' }),
    reminder_offsets: z
      .array(z.coerce.number().int().min(0).max(365))
      .min(1, 'เลือกรอบแจ้งเตือนอย่างน้อย 1 รอบ')
      .transform((a) => [...new Set(a)].sort((x, y) => y - x)),
    value: z
      .string()
      .trim()
      .transform((v) => v.replaceAll(',', ''))
      .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'มูลค่าต้องเป็นตัวเลขไม่ติดลบ')
      .transform((v) => (v === '' ? null : Number(v))),
    note: optionalText(2000),
    recipients: z.array(z.uuid()).min(1, 'เลือกผู้รับแจ้งเตือนอย่างน้อย 1 คน'),
  })
  .refine((d) => !d.start_date || d.start_date <= d.end_date, {
    path: ['end_date'],
    error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น',
  });

export type ContractInput = z.infer<typeof contractSchema>;

/** แปลง FormData → object ที่ schema รับ (ช่องที่เลือกได้หลายค่าใช้ getAll) */
export function contractFormData(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? '');
  return {
    project_name: s('project_name'),
    contract_no: s('contract_no'),
    client_name: s('client_name'),
    start_date: s('start_date'),
    end_date: s('end_date'),
    recurrence: s('recurrence'),
    reminder_offsets: fd.getAll('reminder_offsets').map(String),
    value: s('value'),
    note: s('note'),
    recipients: fd.getAll('recipients').map(String),
  };
}

export const loginSchema = z.object({
  email: z.email({ error: 'อีเมลไม่ถูกต้อง' }),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

/** ผลลัพธ์มาตรฐานของ server action ที่ใช้กับ useActionState */
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, unknown>;
  /** เปลี่ยนทุกครั้งที่ action คืนค่า — ใช้เป็น key ให้ฟอร์ม remount ด้วยค่าที่กรอกไว้ */
  ts?: number;
};
