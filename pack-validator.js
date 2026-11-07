// Валидатор наборов вопросов. Общий для игры, панели оператора и серверной генерации.
export const ROUND_VALUES = [
  [100,200,300,400,500],
  [200,400,600,800,1000],
  [300,600,900,1200,1500]
];
export const VALID_MODIFIERS = ['double','flip_sign','give_points','take_points','all_in'];

// exactRounds: для паков на продажу требуем точное число раундов
export function validateBoard(data, opts = {}){
  const errors=[];
  if(!data || typeof data!=='object' || Array.isArray(data)){ return ['Файл не является корректным JSON-объектом.']; }
  if(!Array.isArray(data.rounds)){ return ['Отсутствует массив "rounds".']; }
  if(!data.rounds.length){ errors.push('Нет ни одного раунда.'); }
  if(opts.exactRounds && data.rounds.length!==opts.exactRounds){
    errors.push(`Должно быть раундов: ${opts.exactRounds}, найдено: ${data.rounds.length}.`);
  }

  for(let ri=0; ri<data.rounds.length; ri++){
    const r = data.rounds[ri];
    const RN = ri+1;
    if(!r || typeof r!=='object'){ errors.push(`Раунд ${RN}: некорректный формат.`); continue; }
    if(!Array.isArray(r.categories)){ errors.push(`Раунд ${RN}: отсутствует массив "categories".`); continue; }
    if(r.categories.length!==6){ errors.push(`Раунд ${RN}: должно быть 6 категорий, найдено: ${r.categories.length}.`); }
    const expectVals = ROUND_VALUES[ri] || null;   // проверка стоимости только для раундов 1–3
    let modCount=0;
    r.categories.forEach((c,ci)=>{
      const cname = (c && c.name) ? `"${c.name}"` : `№${ci+1}`;
      if(!c || typeof c!=='object'){ errors.push(`Раунд ${RN}, категория ${cname}: некорректный формат.`); return; }
      if(!Array.isArray(c.questions)){ errors.push(`Раунд ${RN}, категория ${cname}: отсутствует массив "questions".`); return; }
      if(c.questions.length!==5){ errors.push(`Раунд ${RN}, категория ${cname}: должно быть 5 вопросов, найдено: ${c.questions.length}.`); }
      c.questions.forEach((q,qi)=>{
        const where = `Раунд ${RN}, ${cname}, вопрос ${qi+1}`;
        if(!q || typeof q!=='object'){ errors.push(`${where}: некорректный формат.`); return; }
        const hasQText = typeof q.question==='string' && q.question.trim();
        const imgErr = validImageField(q.image);
        const aimgErr = validImageField(q.answerImage);
        if(imgErr) errors.push(`${where}: поле image — ${imgErr}.`);
        if(aimgErr) errors.push(`${where}: поле answerImage — ${aimgErr}.`);
        // вопрос: нужен текст ИЛИ картинка
        if(!hasQText && !(q.image && !imgErr)){ errors.push(`${where}: нет ни текста вопроса, ни картинки.`); }
        // ответ: нужен текст ИЛИ картинка ответа
        const hasAText = typeof q.answer==='string' && q.answer.trim();
        if(!hasAText && !(q.answerImage && !aimgErr)){ errors.push(`${where}: нет ни текста ответа, ни картинки ответа.`); }
        if(typeof q.value!=='number' || !Number.isFinite(q.value)){
          errors.push(`${where}: стоимость должна быть числом.`);
        } else if(expectVals && q.value!==expectVals[qi]){
          errors.push(`${where}: стоимость должна быть ${expectVals[qi]}, найдено: ${q.value}.`);
        }
        if(q.modifier!==undefined && q.modifier!==null && q.modifier!==''){
          if(typeof q.modifier!=='string' || !VALID_MODIFIERS.includes(q.modifier)){
            errors.push(`${where}: неизвестный модификатор "${q.modifier}". Допустимы: ${VALID_MODIFIERS.join(', ')}.`);
          } else { modCount++; }
        }
      });
    });
    if(modCount>5){ errors.push(`Раунд ${RN}: модификаторов не более 5, найдено: ${modCount}.`); }
  }
  return errors;
}
// поле картинки: строка или массив строк (путь/URL). Возвращает текст ошибки или null.
export function validImageField(v){
  if(v===undefined || v===null) return null;
  const arr = Array.isArray(v) ? v : [v];
  if(arr.length===0) return null;
  for(const x of arr){ if(typeof x!=='string' || !x.trim()) return 'ожидается путь к картинке (строка) или массив строк'; }
  return null;
}
export function normImage(v){
  if(v===undefined || v===null) return null;
  const arr = (Array.isArray(v) ? v : [v]).map(x=>String(x).trim()).filter(Boolean);
  return arr.length ? arr : null;   // всегда массив или null
}
// нормализуем в чистую структуру для хранения
export function normalizeBoard(data){
  return {
    title: typeof data.title==='string' ? data.title : 'Игра про вас',
    rounds: data.rounds.map((r,ri)=>({
      name: (r.name && String(r.name)) || `Раунд ${ri+1}`,
      categories: r.categories.map((c,ci)=>({
        name: (c.name && String(c.name)) || `Категория ${ci+1}`,
        questions: c.questions.map(q=>{
          const o = {
            value: q.value,
            question: typeof q.question==='string' ? q.question : '',
            answer: typeof q.answer==='string' ? q.answer : '',
            modifier: (q.modifier && VALID_MODIFIERS.includes(q.modifier)) ? q.modifier : null
          };
          const img = normImage(q.image); if(img) o.image = img;
          const aimg = normImage(q.answerImage); if(aimg) o.answerImage = aimg;
          return o;
        })
      }))
    }))
  };
}
