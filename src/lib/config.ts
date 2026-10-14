import 'server-only';

/** คืนค่า env หรือ log ชัดๆ ว่าขาดตัวไหน (ดูได้ใน Vercel → Logs) แล้วคืน undefined */
export function requireEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) console.error(`[config] ยังไม่ได้ตั้ง environment variable: ${name}`);
  return value || undefined;
}

/** URL ของเว็บสำหรับลิงก์ในข้อความ LINE — ไม่ได้ตั้ง APP_URL บน Vercel จะใช้โดเมน production ให้อัตโนมัติ */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}
