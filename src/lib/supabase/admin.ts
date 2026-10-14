import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/** ใช้ secret key ข้าม RLS — ใช้เฉพาะ cron / webhook / server action ที่ตรวจสิทธิ์แล้ว */
export const supabaseAdmin = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
