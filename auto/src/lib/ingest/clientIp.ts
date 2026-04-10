import type { NextRequest } from 'next/server';

/** Vercel 등 프록시 뒤에서 클라이언트(봇) IP 추정 — 첫 홉 우선 */
export function getRequestClientIp(req: NextRequest): string | null {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}
