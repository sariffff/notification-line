'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

const CODE_TTL_MS = 10 * 60_000;

/** สร้างรหัสผูก LINE 8 หลัก อายุ 10 นาที (แทนรหัสเดิมของผู้ใช้คนนี้) */
export async function createLinkCode(): Promise<{ code?: string; expiresAt?: string; error?: string }> {
  const { user } = await requireUser();
  const db = supabaseAdmin();   // line_link_codes ไม่มี RLS policy — เขียนได้เฉพาะ service role

  for (let i = 0; i < 5; i++) {
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    const { error } = await db.from('line_link_codes').upsert({ user_id: user.id, code, expires_at: expiresAt });
    if (!error) return { code, expiresAt };
    if (error.code !== '23505') {   // 23505 = รหัสชนกับของคนอื่น → สุ่มใหม่
      console.error('createLinkCode', error);
      break;
    }
  }
  return { error: 'สร้างรหัสไม่สำเร็จ กรุณาลองใหม่' };
}

export async function unlinkLine(): Promise<{ error?: string }> {
  const { user } = await requireUser();
  const db = supabaseAdmin();   // ผู้ใช้แก้ line_user_id เองไม่ได้ (column grant)
  const { error } = await db.from('profiles').update({ line_user_id: null }).eq('id', user.id);
  if (error) return { error: 'ยกเลิกการผูกไม่สำเร็จ กรุณาลองใหม่' };
  revalidatePath('/', 'layout');
  return {};
}
