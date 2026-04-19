import { NextResponse } from 'next/server';
import { createProviderCheckout } from '@/lib/payment/providerAdapters';
import { isPaymentProvider } from '@/lib/payment/config';

export const runtime = 'nodejs';

type Body = {
  profileId?: string;
  provider?: string;
  currency?: string;
  amountMinor?: number;
  orderNo?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ code: 'invalid_json' }, { status: 400 });
  }

  const providerRaw = (body.provider ?? '').trim();
  if (!isPaymentProvider(providerRaw)) {
    return NextResponse.json({ code: 'invalid_provider' }, { status: 400 });
  }

  const profileId = (body.profileId ?? '').trim();
  const orderNo = (body.orderNo ?? '').trim();
  const currency = (body.currency ?? '').trim().toUpperCase();
  const idempotencyKey = (body.idempotencyKey ?? '').trim();
  const amountMinor = Number(body.amountMinor ?? 0);

  if (!profileId || !orderNo || !idempotencyKey) {
    return NextResponse.json({ code: 'invalid_request' }, { status: 400 });
  }
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ code: 'invalid_amount' }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ code: 'invalid_currency' }, { status: 400 });
  }

  try {
    const checkout = await createProviderCheckout({
      profileId,
      provider: providerRaw,
      currency,
      amountMinor,
      orderNo,
      idempotencyKey,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({
      ok: true,
      provider: providerRaw,
      orderNo,
      externalPaymentId: checkout.externalPaymentId,
      externalCheckoutUrl: checkout.externalCheckoutUrl ?? null,
      nextAction: checkout.nextAction ?? 'none',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'checkout_error';
    return NextResponse.json({ code: 'checkout_failed', message }, { status: 422 });
  }
}
