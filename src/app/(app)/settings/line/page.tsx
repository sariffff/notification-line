import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { addFriendUrl, lineOaId } from '@/lib/line';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkPanel, UnlinkButton } from './link-panel';

export const metadata: Metadata = { title: 'ตั้งค่า LINE' };

export default async function LineSettingsPage() {
  const { profile } = await requireUser();
  const linked = !!profile.line_user_id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">ตั้งค่า LINE</h1>

      <Card>
        <CardHeader>
          <CardTitle>สถานะ: {linked ? '✅ ผูกบัญชีแล้ว' : 'ยังไม่ได้ผูกบัญชี'}</CardTitle>
          <CardDescription>
            {linked
              ? 'คุณจะได้รับแจ้งเตือนสัญญาที่คุณเป็นผู้รับ ผ่าน LINE วันละไม่เกิน 1 ข้อความ เวลาประมาณ 08:00 น.'
              : 'ผูกบัญชี LINE เพื่อรับแจ้งเตือนเมื่อสัญญาที่คุณรับผิดชอบใกล้ครบกำหนด'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linked ? <UnlinkButton /> : (
            <ol className="space-y-6">
              <li>
                <p className="font-medium">1. เพิ่มเพื่อน LINE Official Account</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  บนมือถือ กดปุ่มด้านล่าง · บนคอมพิวเตอร์ ลิงก์จะแสดง QR ให้สแกนด้วย LINE
                  {lineOaId() && <> (ID: <span className="font-mono">{lineOaId()}</span>)</>}
                </p>
                <a href={addFriendUrl()} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex h-11 items-center rounded-lg bg-[#06C755] px-4 text-sm font-medium text-white hover:bg-[#05b34c]">
                  เพิ่มเพื่อนใน LINE
                </a>
              </li>
              <li>
                <p className="font-medium">2. สร้างรหัสแล้วส่งให้ LINE OA</p>
                <LinkPanel />
              </li>
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
