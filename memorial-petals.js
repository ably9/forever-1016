(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.querySelector('.fx');
  const tabs = document.querySelector('.fx-main-tabs');
  const layer = document.createElement('div');
  layer.className = 'fx-petals';
  layer.setAttribute('aria-hidden', 'true');
  root.prepend(layer);
  let ready = false;
  let started = false;
  function resize() {
    const height = Math.max(0, tabs.getBoundingClientRect().bottom - root.getBoundingClientRect().top);
    layer.style.height = height + 'px';
    layer.style.setProperty('--fall', height + 'px');
  }
  function update() {
    const visible = ready && !document.hidden && (document.body.dataset.view || 'memories') === 'memories';
    if (visible && !started) {
      started = true;
      // Three quiet petals, staggered across roughly thirty seconds.
      for (const [left, duration, delay, drift] of [[7,16,0,12],[91,17,7,-14],[15,17,13,-10]]) {
        const petal = document.createElement('span');
        petal.className = 'fx-petal';
        petal.style.cssText = `--left:${left}%;--duration:${duration}s;--delay:${delay}s;--drift:${drift}px`;
        petal.addEventListener('animationend', () => petal.remove(), {once:true});
        layer.appendChild(petal);
      }
    }
    layer.classList.toggle('is-visible', visible);
  }
  resize();
  new ResizeObserver(resize).observe(tabs);
  window.addEventListener('resize', resize);
  window.addEventListener('fx:memorial-ready', () => { ready = true; update(); }, {once:true});
  new MutationObserver(update).observe(document.body, {attributes:true,attributeFilter:['data-view']});
  document.addEventListener('visibilitychange', update);
})();
