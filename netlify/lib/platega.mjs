// Клиент Platega. Ключи только в PLATEGA_MERCHANT_ID и PLATEGA_SECRET.
const BASE = 'https://app.platega.io';

function headers() {
  const merchant = process.env.PLATEGA_MERCHANT_ID;
  const secret = process.env.PLATEGA_SECRET;
  if (!merchant || !secret) throw new Error('Не заданы PLATEGA_MERCHANT_ID и PLATEGA_SECRET');
  return { 'X-MerchantId': merchant, 'X-Secret': secret, 'content-type': 'application/json' };
}

export async function createPayment({ orderId, amount, description, email, returnUrl, failedUrl }) {
  const res = await fetch(`${BASE}/v2/transaction/process`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      paymentDetails: { amount, currency: 'RUB' },
      description,
      return: returnUrl,
      failedUrl,
      payload: orderId,
      orderId,
      metadata: { user_email: email, userId: orderId }
    })
  });
  if (!res.ok) throw new Error(`Platega: HTTP ${res.status}`);
  return res.json();
}

export async function getTransaction(id) {
  const res = await fetch(`${BASE}/transaction/${encodeURIComponent(id)}`, { headers: headers() });
  if (!res.ok) throw new Error(`Platega: HTTP ${res.status}`);
  return res.json();
}
