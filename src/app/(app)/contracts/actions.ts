'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { contractFormData, contractSchema, type ActionState } from '@/lib/validations';

/** สร้าง (id = null) หรือแก้ไขสัญญา พร้อมผู้รับแจ้งเตือน — ใช้กับ saveContract.bind(null, id) */
export async function saveContract(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = contractFormData(formData);
  const ts = Date.now();

  let ctx;
  try {
    ctx = await requireRole('admin', 'staff');
  } catch (e) {
    return { message: (e as Error).message, values: raw, ts };
  }

  const parsed = contractSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: 'กรุณาตรวจสอบข้อมูลที่กรอก', fieldErrors: parsed.error.flatten().fieldErrors, values: raw, ts };
  }

  const { recipients, ...data } = parsed.data;
  const { data: savedId, error } = await ctx.supabase.rpc('save_contract', {
    p_id: id, p_data: data, p_recipients: recipients,
  });
  if (error || !savedId) {
    console.error('save_contract', error);
    return { message: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', values: raw, ts };
  }

  revalidatePath('/', 'layout');
  redirect(`/contracts/${savedId}?flash=saved`);
}

export async function deleteContract(id: string): Promise<ActionState> {
  try {
    const { supabase } = await requireRole('admin', 'staff');
    const { error, count } = await supabase.from('contracts').delete({ count: 'exact' }).eq('id', id);
    if (error || !count) return { message: 'ลบไม่สำเร็จ หรือคุณไม่มีสิทธิ์ลบสัญญานี้' };
  } catch (e) {
    return { message: (e as Error).message };
  }
  revalidatePath('/', 'layout');
  redirect('/contracts?flash=deleted');
}
