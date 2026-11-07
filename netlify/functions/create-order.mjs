import { SITE, PRICES } from '../../config.js';
import { validateOrder } from '../../order-schema.js';
import { dbPut } from '../lib/firebase-admin.mjs';
import { json, randomId } from '../lib/http.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405);
  if (!SITE.ordersOpen) return json({ error: 'Приём заказов ещё не открыт' }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Некорректный запрос' }, 400); }
  if (body && body.website) return json({ error: 'Некорректный запрос' }, 400);   // ловушка для ботов

  const { errors, order } = validateOrder(body);
  if (errors.length) return json({ error: errors.join(' '), errors }, 400);

  const orderId = randomId(12);
  const token = randomId(32);
  const now = Date.now();
  try {
    await dbPut(`orders/${orderId}`, {
      ...order,
      priceRub: PRICES[order.tier].rub,
      status: 'new',
      createdAt: now,
      consentAt: now,
      accessToken: token
    });
  } catch (e) {
    console.error('create-order', e.message);
    return json({ error: 'Не удалось сохранить заказ. Попробуйте позже.' }, 503);
  }
  return json({ orderId, token });
};
