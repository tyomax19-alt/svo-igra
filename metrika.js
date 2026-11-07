// Яндекс.Метрика для публичных страниц (лендинг, демо, статьи). Анкету и панель не подключать.
// COUNTER: номер счётчика из Метрики. Пока 0, счётчик не загружается, а цели молча пропускаются.
(function(){
  var COUNTER = 0;

  // цель по имени: window.goal('demo_start')
  window.goal = function(name){
    try{ if(COUNTER && window.ym) window.ym(COUNTER, 'reachGoal', name); }catch(e){}
  };
  // ссылки и кнопки с data-goal="..." отправляют цель при нажатии
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-goal]');
    if(el) window.goal(el.getAttribute('data-goal'));
  }, true);

  if(!COUNTER) return;
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  window.ym(COUNTER, 'init', { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
})();
