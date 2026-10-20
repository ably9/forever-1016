(() => {
  'use strict';
  const root = document.querySelector('.fx');
  const tabs = document.querySelector('.fx-main-tabs');
  const layer = document.createElement('div');
  layer.className = 'fx-petals';
  layer.setAttribute('aria-hidden', 'true');
  root.prepend(layer);
  let ready = !document.getElementById('intro');
  let enabled = true;
  const toggle = document.getElementById('effect-toggle');
  let rendered = '';
  const koreanDate = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric'});
  function season() {
    const parts = Object.fromEntries(koreanDate.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    const {month, day} = parts;
    if (month === 10 && day === 16) return 'light';
    return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'leaf' : 'snow';
  }
  const random = (min, max) => min + Math.random() * (max - min);
  function release(petal, current, initial) {
    const duration = random(current === 'snow' || current === 'light' ? 13 : 10, current === 'snow' || current === 'light' ? 23 : 20);
    const angle = random(-180, 180);
    petal.style.animation = 'none';
    // New position, timing and wind for every descent, including the centre.
    petal.style.cssText = `animation:none;--left:${random(2,98)}%;--duration:${duration}s;--delay:${initial ? -random(.08,.88)*duration : random(0,2.8)}s;--size:${random(.65,1.35)};--alpha:${random(.3,.55)};--drift:${random(-45,45)}px;--drift2:${random(-55,55)}px;--end-x:${random(-35,35)}px;--angle:${angle}deg;--turn:${angle+random(-160,160)}deg;--end-turn:${angle+random(-300,300)}deg;`;
    void petal.offsetWidth;
    petal.style.animation = '';
  }
  function resize() {
    const height = Math.max(0, tabs.getBoundingClientRect().bottom - root.getBoundingClientRect().top);
    layer.style.height = height + 'px';
    layer.style.setProperty('--fall', height + 'px');
    update();
  }
  function update() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? '효과 끄기' : '효과 켜기');
    toggle.title = enabled ? '효과 끄기' : '효과 켜기';
    const current = enabled ? season() : 'off';
    const count = current === 'snow' ? (innerWidth < 700 ? 26 : 40) : (innerWidth < 700 ? 12 : 18);
    const key = current + ':' + count;
    layer.classList.toggle('is-visible', ready && !document.hidden && current !== 'off');
    // Fixed particle count; each completed descent gets fresh random values.
    if (!ready || rendered === key) return;
    rendered = key;
    layer.dataset.season = current;
    layer.replaceChildren();
    if (current === 'off') return;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      petal.className = 'fx-petal';
      layer.appendChild(petal);
      release(petal, current, true);
      petal.addEventListener('animationend', () => release(petal, current, false));
    }
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    update();
  });
  resize();
  new ResizeObserver(resize).observe(tabs);
  window.addEventListener('resize', resize);
  window.addEventListener('fx:memorial-entered', () => { ready = true; update(); }, {once:true});
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  setInterval(update, 60000);
})();
