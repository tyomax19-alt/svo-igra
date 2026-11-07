// Общий конфиг сайта и серверных функций. Секретов здесь быть не должно: файл публичный.

// Пока ordersOpen = false, сайт не принимает заказы и не собирает персональные данные.
// Включать только после заполнения реквизитов оператора и проверки текста политики.
export const SITE = {
  ordersOpen: false,
  avitoUrl: 'https://www.avito.ru/moskva/sport_i_otdyh/svoya_igra_pro_vashu_kompaniyu_na_prazdnik_8379413152',
  notifyUrl: '',  // адрес скрипта, который присылает в Telegram сообщение о новой анкете (токен бота хранится в самом скрипте, не здесь)
  operator: {
    name: '',      // ИП Фамилия Имя Отчество
    inn: '',
    ogrnip: '',
    email: ''      // адрес для обращений по персональным данным
  }
};

// Цены: стартовая гипотеза, менять только здесь.
export const PRICES = {
  base:  { id: 'base',  name: 'Базовый пак', rub: 1490, desc: '90 вопросов по вашей теме, без фото' },
  photo: { id: 'photo', name: 'Пак с фото',  rub: 2690, desc: '90 вопросов по вашей теме и ваши фото в игре' }
};
export const PRICE_NOTES = [
  'Демо-раунд бесплатно',
  'Одна правка раунда бесплатно'
];

export const PHOTO_LIMITS = {
  maxCount: 30,
  maxBytes: 3 * 1024 * 1024,
  maxCaption: 120,
  retentionDays: 30
};
