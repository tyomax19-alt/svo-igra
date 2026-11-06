// Доступ к Realtime Database с сервера через REST и сервисный аккаунт.
// Ключи только в переменных окружения: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
const DB_URL = 'https://svoua-igra-default-rtdb.europe-west1.firebasedatabase.app';
const SCOPE = 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cached = null;

const b64url = (data) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function importKey(pem) {
  const body = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function accessToken() {
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const pem = process.env.FIREBASE_PRIVATE_KEY;
  if (!email || !pem) throw new Error('Не заданы FIREBASE_CLIENT_EMAIL и FIREBASE_PRIVATE_KEY');
  const iat = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }));
  const key = await importKey(pem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${b64url(sig)}`
    })
  });
  if (!res.ok) throw new Error(`Google OAuth: HTTP ${res.status}`);
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function call(path, init = {}) {
  const token = await accessToken();
  const res = await fetch(`${DB_URL}/${path}.json`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
  return res;
}

async function checked(path, init) {
  const res = await call(path, init);
  if (!res.ok) throw new Error(`База: HTTP ${res.status} на ${init?.method || 'GET'} ${path}`);
  return res.json();
}

export const dbGet = (path) => checked(path);
export const dbPut = (path, value) => checked(path, { method: 'PUT', body: JSON.stringify(value) });
export const dbPatch = (path, value) => checked(path, { method: 'PATCH', body: JSON.stringify(value) });
export const dbDelete = (path) => checked(path, { method: 'DELETE' });

// Условная запись: fn получает текущее значение и возвращает новое либо undefined, если менять нельзя.
// При параллельной записи вернёт ok: false. Защищает от двойной обработки вебхука и генерации.
export async function dbUpdateIf(path, fn) {
  const read = await call(path, { headers: { 'X-Firebase-ETag': 'true' } });
  if (!read.ok) throw new Error(`База: HTTP ${read.status} на GET ${path}`);
  const etag = read.headers.get('etag');
  const current = await read.json();
  const next = fn(current);
  if (next === undefined) return { ok: false, value: current };
  const write = await call(path, { method: 'PUT', headers: { 'if-match': etag }, body: JSON.stringify(next) });
  if (write.status === 412) return { ok: false, value: current };
  if (!write.ok) throw new Error(`База: HTTP ${write.status} на PUT ${path}`);
  return { ok: true, value: next };
}
