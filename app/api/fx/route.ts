import { NextResponse } from 'next/server';
import { fetchUsdFx } from '@/lib/fx/fetchUsdFx';

/** Frankfurter ECB 프록시 — Edge */
export const runtime = 'edge';

/** 클라이언트 환율 새로고침용 */
export async function GET() {
  const snap = await fetchUsdFx({ cache: 'no-store' });
  return NextResponse.json(snap);
}
