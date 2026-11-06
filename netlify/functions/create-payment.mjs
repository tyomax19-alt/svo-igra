import { PRICES } from '../../config.js';
import { dbGet, dbPatch } from '../lib/firebase-admin.mjs';
import { ID_RE, json, safeEqual } from '../lib/http.mjs';
import { createPayment } from '../lib/platega.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Некорректный запрос' }, 400); }
  const { orderId, token } = body || {};
  if (!ID_RE.test(orderId || '')) return json({ error: 'Некорректный заказ' }, 400);

  try {
    const order = await dbGet(`orders/${orderId}`);
    if (!order || !safeEqual(order.accessToken, token || '')) return json({ error: 'Заказ не найден' }, 404);
    if (order.status !== 'new' && order.status !== 'payment_failed') return json({ error: 'Заказ уже оплачивается или оплачен' }, 409);
    if (order.tier === 'photo' && !order.photos) return json({ error: 'В заказе нет фото' }, 400);

    const site = process.env.URL;
    const payment = await createPayment({
      orderId,
      amount: PRICES[order.tier].rub,   // сумма только с сервера
      description: `Своя Игра: ${PRICES[order.tier].name}, заказ ${orderId}`,
      email: order.email,
      returnUrl: `${site}/order-result.html?status=ok`,
      failedUrl: `${site}/order-result.html?status=fail`
    });
    await dbPatch(`orders/${orderId}`, { status: 'awaiting_payment', transactionId: payment.transactionId, priceRub: PRICES[order.tier].rub });
    return json({ url: payment.url });
  } catch (e) {
    console.error('create-payment', e.message);
    return json({ error: 'Не удалось создать платёж. Попробуйте позже.' }, 503);
  }
};
