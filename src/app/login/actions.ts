'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema, type ActionState } from '@/lib/validations';

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? '') };
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values: { email: values.email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', values: { email: values.email } };
  }
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
