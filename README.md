# ระบบแจ้งเตือนสัญญาใกล้หมดอายุ

บันทึกสัญญา แล้วระบบส่ง LINE แจ้งผู้รับผิดชอบก่อนหมดอายุ (ค่าเริ่มต้น 30 / 7 / 1 วัน และวันครบกำหนด)

**Stack:** Next.js 16 (App Router, Cache Components) · Supabase · LINE Messaging API · Vercel Cron
แผนพัฒนาฉบับเต็ม: `../plan.md`

## เริ่มต้นใช้งาน (เครื่อง dev)

1. **ติดตั้ง package:** `npm install`
2. **Supabase:** สร้างโปรเจกต์ (region Singapore) แล้วรัน `supabase/migrations/0001_init.sql`
   ใน SQL Editor (หรือ `npx supabase link` + `npx supabase db push`)
3. **Generate types** (แทนไฟล์ที่เขียนมือไว้):
   `npx supabase gen types typescript --project-id <project-id> > src/types/database.ts`
4. **ปิดการสมัครเอง:** Authentication → Sign In / Providers → ปิด "Allow new users to sign up"
5. **สร้างผู้ใช้คนแรก:** Authentication → Users → **Add user → Create new user** (ใส่อีเมล + รหัสผ่าน, ติ๊ก Auto Confirm)
   แล้วตั้งเป็น admin:
   ```sql
   update public.profiles set role = 'admin', full_name = 'ชื่อของคุณ' where id = '<uuid>';
   ```
6. **LINE:** สร้าง OA + เปิด Messaging API (ดูขั้นตอนใน `plan.md` ข้อ 1.1)
7. **Environment:** `cp .env.example .env.local` แล้วกรอกค่าทั้งหมด (`CRON_SECRET` สร้างด้วย `openssl rand -hex 32`)
8. `npm run dev` → http://localhost:3000

### ทดสอบ webhook LINE ในเครื่อง
```bash
npx ngrok http 3000
# เอา https://xxxx.ngrok-free.app/api/line/webhook ไปใส่ Webhook URL ใน LINE Developers → กด Verify
```

### ทดสอบ cron ด้วยมือ
```bash
# ดูว่าจะส่งอะไร (ไม่ส่งจริง) — ?date= ใช้ได้เฉพาะตอน dev
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/reminders?date=2026-11-14&dry=1"
# ส่งจริง
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/reminders?date=2026-11-14"
```

## คำสั่ง

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm test` | unit test (logic วันที่ / รอบแจ้งเตือน / ข้อความ LINE) |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | build production |

## Deploy (Vercel)

1. Push ขึ้น GitHub → Import ใน Vercel (`vercel.json` ตั้ง region `sin1` และ cron `0 1 * * *` = 08:00 น. ไทยไว้แล้ว)
2. ใส่ Environment Variables ทั้งหมด (`APP_URL` = โดเมนจริง)
3. เปลี่ยน LINE Webhook URL เป็น `https://<โดเมน>/api/line/webhook` → Verify
4. Supabase → Authentication → URL Configuration → ใส่โดเมนจริง
5. Supabase → Advisors → ตรวจ Security / Performance
6. Vercel → Settings → Cron Jobs → กด **Run** แล้วดูสถานะบน Dashboard (admin)

> งานเชิงพาณิชย์ต้องใช้ Vercel **Pro** (Hobby ห้ามใช้เชิงพาณิชย์)

## โครงสร้างสำคัญ

```
src/lib/dates.ts          วันที่โซนไทย, currentDueDate (รายปี / 29 ก.พ.)
src/lib/reminders.ts      computeDue (เลือกรอบที่ต้องส่ง), buildMessage
src/lib/line.ts           push / reply / verify signature / retry key
src/app/api/cron/reminders  cron: ดึงข้อมูล → จองสิทธิ์ส่ง (pending) → ส่ง → บันทึกผล
src/app/api/line/webhook    รับรหัส 8 หลักเพื่อผูกบัญชี LINE
src/proxy.ts              refresh session + redirect ไป /login
supabase/migrations       schema + RLS + save_contract()
```
