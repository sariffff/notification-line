import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/auth'];

/** refresh session ของ Supabase + redirect ไป /login ถ้ายังไม่ได้เข้าสู่ระบบ
 *  (เป็นแค่ด่านแรก — server action / page ต้องตรวจสิทธิ์ซ้ำเองเสมอ) */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // ห้ามมีโค้ดอื่นคั่นระหว่าง createServerClient กับ getClaims
  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // ไม่รวม api (cron/webhook ตรวจสิทธิ์เอง), ไฟล์ static, รูปภาพ
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
