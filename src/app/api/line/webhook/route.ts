import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, replyText } from '@/lib/line';
import { supabaseAdmin } from '@/lib/supabase/admin';

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-line-signature'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  const { events = [] } = JSON.parse(raw) as { events?: LineEvent[] };
  const db = supabaseAdmin();

  for (const ev of events) {
    const userId = ev.source?.userId;
    if (!userId || ev.source?.type !== 'user') continue;   // ไม่รับจากกลุ่ม/ห้อง

    if (ev.type === 'follow' && ev.replyToken) {
      await replyText(ev.replyToken, 'สวัสดีครับ 👋 ส่งรหัส 8 หลักจากหน้า "ตั้งค่า LINE" บนเว็บ เพื่อเริ่มรับการแจ้งเตือน');
    }

    if (ev.type === 'message' && ev.message?.type === 'text' && ev.replyToken) {
      const code = (ev.message.text ?? '').trim();
      if (!/^\d{8}$/.test(code)) {
        await replyText(ev.replyToken, 'กรุณาส่งรหัส 8 หลักจากหน้าเว็บ (เมนู ตั้งค่า LINE)');
        continue;
      }
      const { data: link } = await db.from('line_link_codes')
        .select('user_id').eq('code', code)
        .gt('expires_at', new Date().toISOString()).maybeSingle();

      if (!link) {
        await replyText(ev.replyToken, 'รหัสไม่ถูกต้องหรือหมดอายุ ❌ กรุณาสร้างรหัสใหม่บนเว็บ');
        continue;
      }

      // LINE นี้เคยผูกกับบัญชีอื่น → ย้ายมาบัญชีใหม่ (line_user_id เป็น unique)
      await db.from('profiles').update({ line_user_id: null }).eq('line_user_id', userId);
      const { error } = await db.from('profiles').update({ line_user_id: userId }).eq('id', link.user_id);
      if (error) {
        console.error('link LINE failed', error);
        await replyText(ev.replyToken, 'ผูกบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        continue;
      }
      await db.from('line_link_codes').delete().eq('user_id', link.user_id);
      await replyText(ev.replyToken, 'ผูกบัญชีสำเร็จ ✅ คุณจะได้รับแจ้งเตือนสัญญาผ่านช่องทางนี้');
    }

    if (ev.type === 'unfollow') {
      await db.from('profiles').update({ line_user_id: null }).eq('line_user_id', userId);
    }
  }
  return NextResponse.json({ ok: true });
}
