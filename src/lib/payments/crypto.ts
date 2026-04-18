import 'server-only';

export async function createCoinbaseCharge(input: {
  orderId: string;
  amountThb: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('COINBASE_COMMERCE_API_KEY missing');
  }

  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: `ThaiJaWorld Order ${input.orderId}`,
      description: 'ThaiJaWorld checkout',
      pricing_type: 'fixed_price',
      local_price: {
        amount: input.amountThb.toFixed(2),
        currency: 'THB',
      },
      metadata: { orderId: input.orderId },
      redirect_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: { id?: string; hosted_url?: string; timeline?: Array<{ status?: string }> };
    error?: { type?: string; message?: string };
  };

  if (!response.ok || !payload.data?.id || !payload.data.hosted_url) {
    throw new Error(payload.error?.message || 'coinbase_charge_create_failed');
  }

  return {
    id: payload.data.id,
    hostedUrl: payload.data.hosted_url,
    status: payload.data.timeline?.[0]?.status ?? 'new',
  };
}
