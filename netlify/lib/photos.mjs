// Хранилище фото покупателей. Регион задаётся явно при каждом обращении.
import { getStore } from '@netlify/blobs';

export const photoStore = () => getStore({ name: 'order-photos', region: 'eu-central-1' });
