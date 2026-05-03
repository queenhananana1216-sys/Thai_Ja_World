/**
 * 빌드 후 `public/robots.txt`를 생성합니다.
 * 런타임의 정본은 `app/robots.ts`이며, 동일 규칙을 유지합니다.
 * 동적 URL 목록은 `app/sitemap.ts`의 `/sitemap.xml`만 사용합니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thaijaworld.com').replace(/\/+$/u, '');
const host = siteUrl.replace(/^https?:\/\//u, '');

const body = `# ${siteUrl} — crawler hints (keep in sync with app/robots.ts)
User-agent: Googlebot
Allow: /

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /community/boards/new

Sitemap: ${siteUrl}/sitemap.xml
Host: ${host}
`;

const out = path.join(root, 'public', 'robots.txt');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body, 'utf8');
console.log('[sync-public-seo] wrote', out);
