import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type CoinbaseWebhook = {
  event?: {
    id?: string;
    type?: string;
    data?: {
      id?: string;
      metadata?: { orderId?: string };
      timeline?: Array<{ status?: string }>;
    };
  };
};

function verifySignature(body: string, received: string, secret: string): boolean {
  const digest = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(received));
  } catch {
    return false;
  }
}

async function syncCoinbaseOrder(input: {
  orderId: string;
  paymentStatus: string;
  orderStatus: 'pending' | 'paid' | 'cancelled';
  eventId: string;
}) {
  const admin = createServiceRoleClient();
  const { error: paymentError } = await admin
    .from('order_payment_intents')
    .update({
      status: input.paymentStatus,
      metadata: { webhookEventId: input.eventId },
    })
    .eq('order_id', input.orderId)
    .eq('provider', 'coinbase');
  if (paymentError) throw new Error(paymentError.message);

  const { error: orderError } = await admin
    .from('orders')
    .update({ status: input.orderStatus })
    .eq('id', input.orderId);
  if (orderError) throw new Error(orderError.message);

  const { error: eventError } = await admin.from('order_status_events').insert({
    order_id: input.orderId,
    status: input.orderStatus,
    actor_profile_id: null,
    note: `coinbase_webhook:${input.eventId}`,
  });
  if (eventError) throw new Error(eventError.message);
}

export async function POST(request: Request) {
  const secret = process.env.COINBASE_WEBHOOK_SHARED_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'COINBASE_WEBHOOK_SHARED_SECRET missing' }, { status: 500 });
  }
  const signature = request.headers.get('x-cc-webhook-signature')?.trim() || '';
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const raw = await request.text();
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let payload: CoinbaseWebhook;
  try {
    payload = JSON.parse(raw) as CoinbaseWebhook;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventType = payload.event?.type || '';
  const eventId = payload.event?.id || 'unknown';
  const orderId = payload.event?.data?.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ ok: true, skipped: 'no_order_id' });
  }

  try {
    if (eventType === 'charge:confirmed' || eventType === 'charge:resolved') {
      await syncCoinbaseOrder({
        orderId,
        paymentStatus: 'completed',
        orderStatus: 'paid',
        eventId,
      });
    } else if (eventType === 'charge:failed') {
      await syncCoinbaseOrder({
        orderId,
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        eventId,
      });
    } else if (eventType === 'charge:created' || eventType === 'charge:pending') {
      await syncCoinbaseOrder({
        orderId,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        eventId,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
