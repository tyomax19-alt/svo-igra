// Отдаёт фото по неугадываемому ключу: его видят только те, у кого есть ссылка на пак.
import { photoStore } from '../lib/photos.mjs';

const KEY_RE = /^[a-z0-9]{8,40}\/[a-z0-9]{8,40}$/;

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key') || '';
  if (!KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const data = await photoStore().get(key, { type: 'arrayBuffer' });
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'private, max-age=3600',
      'x-robots-tag': 'noindex'
    }
  });
};
