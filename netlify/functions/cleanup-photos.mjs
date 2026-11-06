// Раз в сутки удаляет фото старше срока хранения.
import { PHOTO_LIMITS } from '../../config.js';
import { dbDelete } from '../lib/firebase-admin.mjs';
import { photoStore } from '../lib/photos.mjs';

export default async () => {
  const store = photoStore();
  const cutoff = Date.now() - PHOTO_LIMITS.retentionDays * 24 * 60 * 60 * 1000;
  const { blobs } = await store.list();
  let removed = 0;
  for (const { key } of blobs) {
    const meta = await store.getMetadata(key);
    const uploadedAt = Number(meta?.metadata?.uploadedAt) || 0;
    if (uploadedAt >= cutoff) continue;
    await store.delete(key);
    const [orderId, photoId] = key.split('/');
    await dbDelete(`orders/${orderId}/photos/${photoId}`);
    removed++;
  }
  console.log(`cleanup-photos: удалено ${removed}`);
};

export const config = { schedule: '@daily' };
