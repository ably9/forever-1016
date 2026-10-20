(() => {
  'use strict';
  const root = document.querySelector('.fx');
  const tabs = document.querySelector('.fx-main-tabs');
  const layer = document.createElement('div');
  layer.className = 'fx-petals';
  layer.setAttribute('aria-hidden', 'true');
  root.prepend(layer);
  const buttons = [...document.querySelectorAll('[data-season-choice]')];
  let ready = !document.getElementById('intro');
  let choice = 'auto';
  let rendered = '';
  function season() {
    const month = Number(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',month:'numeric'}).format(new Date()));
    return month >= 3 && month <= 8 ? 'flower' : month >= 9 && month <= 11 ? 'leaf' : 'snow';
  }
  function resize() {
    const height = Math.max(0, tabs.getBoundingClientRect().bottom - root.getBoundingClientRect().top);
    layer.style.height = height + 'px';
    layer.style.setProperty('--fall', height + 'px');
    update();
  }
  function update() {
    const current = choice === 'auto' ? season() : choice;
    const count = innerWidth < 700 ? 12 : 18;
    const key = current + ':' + count;
    layer.classList.toggle('is-visible', ready && !document.hidden && current !== 'off');
    // Fixed looping particles prevent accumulated DOM or spawning timers.
    if (!ready || rendered === key) return;
    rendered = key;
    layer.dataset.season = current;
    layer.replaceChildren();
    if (current === 'off') return;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      petal.className = 'fx-petal';
      const left = i % 2 ? 74 + (i * 7 % 22) : 4 + (i * 7 % 22);
      const duration = (current === 'snow' ? 13 : 11) + i % 6;
      // Negative stagger makes the effect visible immediately after entry.
      const delay = -(i + .5) / count * duration;
      petal.style.cssText = `--left:${left}%;--duration:${duration}s;--delay:${delay}s;--drift:${i % 2 ? -16 : 16}px`;
      layer.appendChild(petal);
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    choice = button.dataset.seasonChoice;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    update();
  }));
  resize();
  new ResizeObserver(resize).observe(tabs);
  window.addEventListener('resize', resize);
  window.addEventListener('fx:memorial-entered', () => { ready = true; update(); }, {once:true});
  document.addEventListener('visibilitychange', update);
  setInterval(update, 60000);
})();
