import { NextResponse } from 'next/server';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';

export const runtime = 'nodejs';

export async function GET() {
  const flags = await getActiveUxFlagsServer();
  return NextResponse.json({ flags });
}

