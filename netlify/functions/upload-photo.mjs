import { PHOTO_LIMITS } from '../../config.js';
import { dbGet, dbPut } from '../lib/firebase-admin.mjs';
import { ID_RE, json, randomId, safeEqual } from '../lib/http.mjs';
import { photoStore } from '../lib/photos.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405);
  const orderId = req.headers.get('x-order-id') || '';
  const token = req.headers.get('x-order-token') || '';
  if (!ID_RE.test(orderId)) return json({ error: 'Некорректный заказ' }, 400);

  let caption = '';
  try { caption = decodeURIComponent(req.headers.get('x-caption') || '').trim().slice(0, PHOTO_LIMITS.maxCaption); }
  catch { return json({ error: 'Некорректная подпись' }, 400); }

  try {
    const order = await dbGet(`orders/${orderId}`);
    if (!order || !safeEqual(order.accessToken, token)) return json({ error: 'Заказ не найден' }, 404);
    if (order.tier !== 'photo') return json({ error: 'Фото доступны в тарифе с фото' }, 400);
    if (order.status !== 'new') return json({ error: 'Заказ уже оформлен' }, 409);
    if (Object.keys(order.photos || {}).length >= PHOTO_LIMITS.maxCount) {
      return json({ error: `Не больше ${PHOTO_LIMITS.maxCount} фото` }, 400);
    }

    const data = await req.arrayBuffer();
    if (data.byteLength === 0 || data.byteLength > PHOTO_LIMITS.maxBytes) return json({ error: 'Файл слишком большой' }, 413);
    const head = new Uint8Array(data, 0, 3);
    if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return json({ error: 'Нужен файл JPEG' }, 415);

    const photoId = randomId(24);
    const key = `${orderId}/${photoId}`;
    const uploadedAt = Date.now();
    await photoStore().set(key, data, { metadata: { uploadedAt } });
    await dbPut(`orders/${orderId}/photos/${photoId}`, { key, caption, uploadedAt });
    return json({ photoId });
  } catch (e) {
    console.error('upload-photo', e.message);
    return json({ error: 'Не удалось сохранить фото. Попробуйте позже.' }, 503);
  }
};
