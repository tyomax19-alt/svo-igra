// Проверка, что запрос сделал владелец: токен Firebase Auth проверяет сервер Google.
import { safeEqual } from './http.mjs';

// публичный ключ веб-приложения, он же стоит в index.html
const WEB_API_KEY = 'AIzaSyD2BJ0Stblry4i3wD_ml0d7WqVsPDwW8RM';

export async function isOwner(req) {
  const owner = process.env.OWNER_UID;
  const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!owner || !idToken) return false;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return safeEqual(data.users?.[0]?.localId || '', owner);
}

export function isInternal(req) {
  const secret = process.env.INTERNAL_SECRET;
  return !!secret && safeEqual(req.headers.get('x-internal-secret') || '', secret);
}
