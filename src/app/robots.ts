import type { MetadataRoute } from 'next';

// ระบบภายใน — ไม่ให้ search engine เก็บข้อมูล
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
