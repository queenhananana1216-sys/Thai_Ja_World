import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  spotId?: string;
  customerName?: string | null;
  phone?: string;
  addressText?: string;
  requestedTime?: string | null;
  notes?: string | null;
  items?: Array<{ name?: string; quantity?: number; unitPriceThb?: number }>;
};

function txt(v: unknown, max = 200): string {
  return (typeof v === 'string' ? v : '').trim().slice(0, max);
}

function num(v: unknown, fallback = 0): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return v;
}

export async function POST(req: Request) {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const spotId = txt(body.spotId, 80);
  const phone = txt(body.phone, 40);
  const addressText = txt(body.addressText, 500);
  const requestedTime = txt(body.requestedTime, 80) || null;
  const notes = txt(body.notes, 700) || null;
  const customerName = txt(body.customerName, 120) || null;
  const rows = Array.isArray(body.items) ? body.items : [];
  if (!spotId || phone.length < 6 || addressText.length < 4 || rows.length === 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const items = rows
    .map((item) => ({
      name: txt(item.name, 120),
      quantity: Math.max(1, Math.min(20, Math.floor(num(item.quantity, 1)))),
      unitPriceThb: Number(Math.max(0, num(item.unitPriceThb, 0)).toFixed(2)),
    }))
    .filter((item) => item.name.length > 0 && item.unitPriceThb > 0);
  if (items.length === 0) {
    return NextResponse.json({ error: 'valid_items_required' }, { status: 400 });
  }
  const totalThb = Number(items.reduce((sum, item) => sum + item.quantity * item.unitPriceThb, 0).toFixed(2));
  const totalMinor = Math.round(totalThb * 100);

  const admin = createServiceRoleClient();
  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('id,name,owner_profile_id,line_url,minihome_extra,is_published')
    .eq('id', spotId)
    .maybeSingle();
  if (spotErr || !spot || !spot.is_published) {
    return NextResponse.json({ error: 'spot_not_found' }, { status: 404 });
  }
  const extra =
    spot.minihome_extra && typeof spot.minihome_extra === 'object' && !Array.isArray(spot.minihome_extra)
      ? (spot.minihome_extra as Record<string, unknown>)
      : {};

  const bridgeOptionRaw = txt(extra.checkout_bridge, 30).toLowerCase();
  const bridgeOption = bridgeOptionRaw || 'promptpay';

  const menuSnapshot = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit_price_thb: item.unitPriceThb,
    line_total_thb: Number((item.quantity * item.unitPriceThb).toFixed(2)),
  }));

  const { data: lead, error: leadErr } = await admin
    .from('shop_order_leads')
    .insert({
      spot_id: spot.id,
      customer_name: customerName,
      phone,
      address_text: addressText,
      requested_time: requestedTime,
      notes,
      menu_snapshot: menuSnapshot,
      status: 'pending',
    })
    .select('id')
    .single();
  if (leadErr || !lead) {
    return NextResponse.json({ error: leadErr?.message ?? 'lead_insert_failed' }, { status: 500 });
  }

  const orderNo = `TJ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${lead.id.slice(0, 8).toUpperCase()}`;
  const { data: payOrder, error: payOrderErr } = await admin
    .from('payment_orders')
    .insert({
      profile_id: user.id,
      order_no: orderNo,
      idempotency_key: `shop_lead:${lead.id}`,
      provider: bridgeOption,
      amount_minor: totalMinor,
      currency: 'THB',
      metadata: {
        spot_id: spot.id,
        spot_name: spot.name,
        order_lead_id: lead.id,
      },
      status: bridgeOption === 'internal_point' ? 'paid' : 'pending',
    })
    .select('id')
    .single();
  if (payOrderErr || !payOrder) {
    return NextResponse.json({ error: payOrderErr?.message ?? 'payment_order_failed' }, { status: 500 });
  }

  if (bridgeOption === 'internal_point') {
    const { data: wallet, error: walletErr } = await admin
      .from('wallet_accounts')
      .select('id,balance_minor')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (walletErr || !wallet || wallet.balance_minor < totalMinor) {
      return NextResponse.json({ error: 'dotori_balance_insufficient' }, { status: 400 });
    }
    const nextBalance = wallet.balance_minor - totalMinor;
    const { error: walletUpdateErr } = await admin
      .from('wallet_accounts')
      .update({ balance_minor: nextBalance })
      .eq('id', wallet.id)
      .eq('balance_minor', wallet.balance_minor);
    if (walletUpdateErr) {
      return NextResponse.json({ error: walletUpdateErr.message }, { status: 500 });
    }
    const { error: ledgerErr } = await admin.from('wallet_ledger_entries').insert({
      wallet_account_id: wallet.id,
      direction: 'debit',
      amount_minor: totalMinor,
      reason: 'shop_order_lead_payment',
      reference_key: `shop_lead_payment:${lead.id}`,
      order_id: payOrder.id,
      metadata: { lead_id: lead.id, spot_id: spot.id },
    });
    if (ledgerErr) {
      return NextResponse.json({ error: ledgerErr.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      paymentOrderId: payOrder.id,
      bridge: { kind: 'internal_point', walletBalanceAfterMinor: nextBalance },
    });
  }

  if (bridgeOption === 'line_direct') {
    const lineUrl = txt(extra.line_direct_url, 500) || spot.line_url || 'https://line.me/R/ti/p/@';
    const copyText = [
      `[태자월드 주문서] ${spot.name}`,
      `주문번호: ${orderNo}`,
      ...items.map((item) => `- ${item.name} x${item.quantity} (${item.unitPriceThb} THB)`),
      `합계: ${totalThb.toFixed(2)} THB`,
      requestedTime ? `요청시간: ${requestedTime}` : null,
      notes ? `요청사항: ${notes}` : null,
      `연락처: ${phone}`,
    ]
      .filter(Boolean)
      .join('\n');
    await admin.from('payment_attempts').insert({
      order_id: payOrder.id,
      provider: 'line_direct',
      amount_minor: totalMinor,
      currency: 'THB',
      external_checkout_url: lineUrl,
      status: 'pending',
    });
    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      paymentOrderId: payOrder.id,
      bridge: { kind: 'line_direct', lineUrl, autoCopyText: copyText },
    });
  }

  const promptPayId = txt(extra.promptpay_target, 60) || process.env.NEXT_PUBLIC_PROMPTPAY_DEFAULT_TARGET || '';
  const promptPayload = `${promptPayId}|${totalThb.toFixed(2)}|${orderNo}`;
  const promptQr = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(promptPayload)}`;
  await admin.from('payment_attempts').insert({
    order_id: payOrder.id,
    provider: 'promptpay',
    amount_minor: totalMinor,
    currency: 'THB',
    external_checkout_url: promptQr,
    status: 'pending',
  });
  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    paymentOrderId: payOrder.id,
    bridge: { kind: 'promptpay', qrImageUrl: promptQr, reference: orderNo },
  });
}
