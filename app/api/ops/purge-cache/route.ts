import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!isCronAuthorized(authHeader)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath('/news');
    revalidatePath('/community/boards', 'layout');
    return NextResponse.json({
      ok: true,
      message: 'cache purged',
      revalidated: ['/', '/news', '/community/boards'],
      at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'purge_failed',
      },
      { status: 500 },
    );
  }
}
