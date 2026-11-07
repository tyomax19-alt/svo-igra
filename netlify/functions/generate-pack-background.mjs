// Фоновая функция: генерация идёт минуты, клиент сразу получает 202, результат пишется в заказ.
import { dbPatch, dbUpdateIf } from '../lib/firebase-admin.mjs';
import { isInternal, isOwner } from '../lib/auth.mjs';
import { generatePack } from '../lib/generate.mjs';
import { ID_RE } from '../lib/http.mjs';

const STALE_MS = 20 * 60 * 1000;   // зависшая генерация: функция живёт не больше 15 минут

export default async (req) => {
  if (req.method !== 'POST') return;
  if (!isInternal(req) && !(await isOwner(req))) return;

  let orderId;
  try { ({ orderId } = await req.json()); } catch { return; }
  if (!ID_RE.test(orderId || '')) return;

  try {
    const claim = await dbUpdateIf(`orders/${orderId}`, (order) => {
      if (!order) return undefined;
      const paid = ['paid', 'draft_ready', 'generation_failed'].includes(order.status);
      const stale = order.status === 'generating' && Date.now() - (order.generationStartedAt || 0) > STALE_MS;
      if (!paid && !stale) return undefined;
      return { ...order, status: 'generating', generationStartedAt: Date.now(), generationErrors: null };
    });
    if (!claim.ok) return;

    const result = await generatePack(claim.value);
    if (result.board) {
      await dbPatch(`orders/${orderId}`, { status: 'draft_ready', draft: result.board, generationErrors: null });
    } else {
      await dbPatch(`orders/${orderId}`, { status: 'generation_failed', generationErrors: result.errors.slice(0, 50) });
    }
  } catch (e) {
    console.error('generate-pack', e.message);
    // исключение наружу не выпускаем: Netlify повторил бы вызов и потратил бы ещё токены
    await dbPatch(`orders/${orderId}`, { status: 'generation_failed', generationErrors: [e.message] }).catch(() => {});
  }
};
