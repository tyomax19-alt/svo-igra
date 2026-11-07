// Проверка заказа. Один код на клиенте и на сервере.
import { PRICES } from './config.js';

export const AGE_GROUPS = { kids: 'Дети 6-12', teens: 'Подростки 13-17', adults: 'Взрослые', mixed: 'Смешанная компания' };
export const DIFFICULTIES = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' };
export const LANGUAGES = { ru: 'Русский', en: 'Английский' };

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validateOrder(input, today = new Date().toISOString().slice(0, 10)) {
  const src = input && typeof input === 'object' ? input : {};
  const errors = [];
  const order = {
    contact: text(src.contact, 80),
    email: text(src.email, 120),
    theme: text(src.theme, 500),
    players: Number(src.players),
    ageGroup: text(src.ageGroup, 20),
    difficulty: text(src.difficulty, 20),
    language: text(src.language, 10),
    partyDate: text(src.partyDate, 10),
    tier: text(src.tier, 20),
    adult18: src.adult18 === true,
    consent: src.consent === true
  };

  if (order.contact.length < 2) errors.push('Укажите ник на Авито.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) errors.push('Укажите корректный email: он нужен для чека.');
  if (order.theme.length < 3) errors.push('Опишите тему вечеринки.');
  if (!Number.isInteger(order.players) || order.players < 2 || order.players > 10) errors.push('Число игроков: от 2 до 10.');
  if (!AGE_GROUPS[order.ageGroup]) errors.push('Выберите возрастную группу.');
  if (!DIFFICULTIES[order.difficulty]) errors.push('Выберите сложность.');
  if (!LANGUAGES[order.language]) errors.push('Выберите язык.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.partyDate)) errors.push('Укажите дату вечеринки.');
  else if (order.partyDate < today) errors.push('Дата вечеринки уже прошла.');
  if (!PRICES[order.tier]) errors.push('Выберите тариф.');
  if (order.adult18 && (order.ageGroup === 'kids' || order.ageGroup === 'teens' || order.ageGroup === 'mixed')) {
    errors.push('Режим 18+ доступен только для компании взрослых.');
  }
  if (!order.consent) errors.push('Нужно согласие на обработку персональных данных.');

  return { errors, order };
}
