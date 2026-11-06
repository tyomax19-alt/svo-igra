// Колбэк Platega. Подписи тела у Platega нет: она присылает наши X-MerchantId и X-Secret.
// Поэтому после проверки заголовков статус и сумма дополнительно сверяются запросом к API.
import { dbPatch, dbUpdateIf } from '../lib/firebase-admin.mjs';
import { ID_RE, safeEqual } from '../lib/http.mjs';
import { getTransaction } from '../lib/platega.mjs';

const ok = () => new Response('OK', { status: 200 });

async function startGeneration(orderId) {
  await fetch(`${process.env.URL}/.netlify/functions/generate-pack-background`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET || '' },
    body: JSON.stringify({ orderId })
  });
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const merchant = process.env.PLATEGA_MERCHANT_ID;
  const secret = process.env.PLATEGA_SECRET;
  if (!merchant || !secret
    || !safeEqual(req.headers.get('x-merchantid') || '', merchant)
    || !safeEqual(req.headers.get('x-secret') || '', secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let event;
  try { event = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const orderId = event?.payload;
  if (!ID_RE.test(orderId || '') || !event.id) return ok();   // чужое событие: повторы не нужны

  try {
    if (event.status === 'CONFIRMED') {
      const tx = await getTransaction(event.id);
      if (tx.status !== 'CONFIRMED') return ok();
      const claim = await dbUpdateIf(`orders/${orderId}`, (order) => {
        if (!order || order.transactionId !== event.id) return undefined;
        if (order.status !== 'awaiting_payment' && order.status !== 'payment_failed') return undefined;   // повторная доставка
        if (Number(tx.paymentDetails?.amount) !== Number(order.priceRub) || tx.paymentDetails?.currency !== 'RUB') return undefined;
        return { ...order, status: 'paid', paidAt: Date.now() };
      });
      if (claim.ok) await startGeneration(orderId);
    } else if (event.status === 'CANCELED') {
      await dbUpdateIf(`orders/${orderId}`, (order) => (
        order && order.transactionId === event.id && order.status === 'awaiting_payment'
          ? { ...order, status: 'payment_failed' } : undefined
      ));
    } else if (['CHARGEBACKED', 'PARTIALLY_REFUNDED', 'DISPUTED'].includes(event.status)) {
      await dbPatch(`orders/${orderId}`, { paymentAlert: event.status, paymentAlertAt: Date.now() });
    }
    return ok();
  } catch (e) {
    console.error('platega-webhook', e.message);
    return new Response('Retry', { status: 500 });   // Platega повторит доставку
  }
};
