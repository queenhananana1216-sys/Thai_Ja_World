import { NextResponse } from 'next/server';
import { fetchUsdFx } from '@/lib/fx/fetchUsdFx';

export const runtime = 'nodejs';

/** 클라이언트 환율 새로고침용 */
export async function GET() {
  const snap = await fetchUsdFx({ cache: 'no-store' });
  return NextResponse.json(snap);
}
