import 'server-only';
import crypto from 'node:crypto';
import { requireEnv } from './config';

// LINE_API_BASE ใช้ชี้ไป mock server ตอนทดสอบเท่านั้น — production ไม่ต้องตั้ง
const API = `${process.env.LINE_API_BASE ?? 'https://api.line.me'}/v2/bot/message`;
function headers() {
  const token = requireEnv('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) throw new Error('ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * retryKey: ถ้าส่ง key เดิมซ้ำภายใน 24 ชม. LINE จะไม่ส่งซ้ำและตอบ 409 → ถือว่าสำเร็จ
 */
export async function pushText(to: string, text: string, retryKey?: string) {
  const res = await fetch(`${API}/push`, {
    method: 'POST',
    headers: { ...headers(), ...(retryKey && { 'X-Line-Retry-Key': retryKey }) },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 5000) }] }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`LINE push ${res.status}: ${await res.text()}`);
}

/** สร้าง UUID คงที่จาก seed — seed เดิม = key เดิม */
export function retryKeyFor(seed: string): string {
  const h = crypto.createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** reply ไม่นับโควตา — ใช้ตอบใน webhook */
export async function replyText(replyToken: string, text: string) {
  try {
    const res = await fetch(`${API}/reply`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    });
    if (!res.ok) console.error('LINE reply', res.status, await res.text());
  } catch (e) {
    console.error('LINE reply', e);   // ตอบไม่ได้ไม่ควรทำให้ webhook ทั้งก้อนล้ม
  }
}

/** ต้องเช็คก่อนว่ามี LINE_CHANNEL_SECRET (ใน webhook route) */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac('sha256', secret)
    .update(rawBody).digest('base64');
  const a = Buffer.from(hash), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const lineOaId = () => process.env.NEXT_PUBLIC_LINE_OA_ID ?? '';
export const addFriendUrl = () => `https://line.me/R/ti/p/${encodeURIComponent(lineOaId())}`;
