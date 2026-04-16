import { NextResponse } from 'next/server';
import { getLandingEntryFlow } from '@/lib/landing/entryFlow';

export const runtime = 'nodejs';

export async function GET() {
  const flow = await getLandingEntryFlow();
  return NextResponse.json(flow, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
    },
  });
}
