// Генерация черновика пака. Модель задаётся переменной окружения ANTHROPIC_MODEL.
import Anthropic from '@anthropic-ai/sdk';
import { VALID_MODIFIERS, normalizeBoard, validateBoard } from '../../pack-validator.js';
import { SYSTEM_PROMPT } from '../../pack-prompt.js';
import { AGE_GROUPS, DIFFICULTIES, LANGUAGES } from '../../order-schema.js';

const question = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'question', 'answer', 'modifier'],
  properties: {
    value: { type: 'integer' },
    question: { type: 'string' },
    answer: { type: 'string' },
    modifier: { anyOf: [{ type: 'string', enum: VALID_MODIFIERS }, { type: 'null' }] }
  }
};
const category = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'questions'],
  properties: { name: { type: 'string' }, questions: { type: 'array', items: question } }
};
const round = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'categories'],
  properties: { name: { type: 'string' }, categories: { type: 'array', items: category } }
};
export const PACK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'rounds'],
  properties: { title: { type: 'string' }, rounds: { type: 'array', items: round } }
};

export function briefFor(order) {
  return {
    theme: order.theme,
    players: order.players,
    ageGroup: AGE_GROUPS[order.ageGroup],
    difficulty: DIFFICULTIES[order.difficulty],
    language: LANGUAGES[order.language],
    adult18: order.adult18 === true
  };
}

// один запрос к модели, возвращает текст ответа
async function requestPack(client, userText) {
  const stream = client.beta.messages.stream({
    model: process.env.ANTHROPIC_MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: { type: 'json_schema', schema: PACK_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }]
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('Модель отказалась выполнять заказ. Проверьте бриф.');
  if (message.stop_reason === 'max_tokens') throw new Error('Ответ модели обрезан по лимиту длины.');
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function check(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { errors: ['Ответ модели не является корректным JSON.'] }; }
  return { data, errors: validateBoard(data, { exactRounds: 3 }) };
}

// Возвращает { board } либо { errors }: при невалидном ответе один повтор с перечнем ошибок.
export async function generatePack(order) {
  if (!process.env.ANTHROPIC_MODEL) throw new Error('Не задана переменная ANTHROPIC_MODEL');
  const client = new Anthropic();
  const brief = `<brief>${JSON.stringify(briefFor(order))}</brief>`;

  const firstText = await requestPack(client, brief);
  const first = check(firstText);
  if (!first.errors.length) return { board: normalizeBoard(first.data) };

  const retryText = await requestPack(client, `${brief}

Предыдущий вариант не прошёл проверку. Исправь ошибки и верни пак целиком.
Ошибки:
${first.errors.slice(0, 40).join('\n')}

Предыдущий вариант:
${firstText}`);
  const second = check(retryText);
  if (!second.errors.length) return { board: normalizeBoard(second.data) };
  return { errors: second.errors };
}
