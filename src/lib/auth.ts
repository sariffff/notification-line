import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Role, Tables } from '@/types/database';

/** ผู้ใช้ปัจจุบัน + profile (cache ต่อ request) — ไม่ได้ login → redirect /login */
export const requireUser = cache(async () => {
  // ข้อมูลผู้ใช้เป็นของ request นี้เท่านั้น — Supabase auth อ่านเวลาปัจจุบัน (ตรวจ token หมดอายุ)
  // จึงต้องบอก Next ว่าเป็นงาน request-time ก่อน ไม่งั้น Cache Components จะเตือน Date.now()
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');
  return { supabase, user, profile: profile as Tables<'profiles'> };
});

export const canEdit = (role: Role) => role === 'admin' || role === 'staff';

/** ใช้ใน server action: ตรวจ role แล้วโยน error (ไม่ redirect) */
export async function requireRole(...roles: Role[]) {
  const ctx = await requireUser();
  if (!roles.includes(ctx.profile.role)) throw new Error('คุณไม่มีสิทธิ์ทำรายการนี้');
  return ctx;
}
