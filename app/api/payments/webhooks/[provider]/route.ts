import { NextResponse } from 'next/server';
import { isPaymentProvider } from '@/lib/payment/config';
import { verifyProviderWebhook } from '@/lib/payment/providerAdapters';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { provider } = await ctx.params;
  if (!isPaymentProvider(provider)) {
    return NextResponse.json({ code: 'invalid_provider' }, { status: 400 });
  }

  const signature = req.headers.get('x-signature') ?? req.headers.get('x-webhook-signature') ?? '';
  const rawBody = await req.text();
  const verified = verifyProviderWebhook(provider, signature, rawBody);
  if (!verified.ok) {
    return NextResponse.json({ code: 'invalid_signature', reason: verified.reason }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ code: 'invalid_json' }, { status: 400 });
  }

  const eventId = String(payload.event_id ?? payload.id ?? '').trim();
  if (!eventId) {
    return NextResponse.json({ code: 'missing_event_id' }, { status: 400 });
  }

  // TODO: payment_events(event_id UNIQUE)로 멱등 저장 + 상태전이 적용.
  return NextResponse.json({
    ok: true,
    provider,
    eventId,
    accepted: true,
  });
}
