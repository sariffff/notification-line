import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">ระบบแจ้งเตือนสัญญา</h1>
          <p className="mt-1 text-sm text-muted-foreground">เข้าสู่ระบบเพื่อจัดการสัญญาและการแจ้งเตือน</p>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
        </p>
      </div>
    </main>
  );
}
