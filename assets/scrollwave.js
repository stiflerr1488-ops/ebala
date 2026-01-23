/* Волны на FAB при прокрутке (без рывков). */
(function initFabScrollWave() {
  const fab = document.querySelector('#floatingCta .fab');
  if (!fab) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  let last = 0;
  const COOLDOWN = 140; // мс, чтобы не спамить анимацией на каждом тикe колеса

  function pulse() {
    // Пульс только когда кнопка видима
    const wrap = document.getElementById('floatingCta');
    if (wrap && wrap.dataset.visible !== 'true') return;

    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - last < COOLDOWN) return;
    last = now;

    // перезапуск CSS-анимации
    fab.classList.remove('fab--wave');
    // eslint-disable-next-line no-unused-expressions
    fab.offsetWidth;
    fab.classList.add('fab--wave');
  }

  window.addEventListener('wheel', pulse, { passive: true });
  window.addEventListener('scroll', pulse, { passive: true });
})();
