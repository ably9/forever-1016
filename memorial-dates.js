(function () {
  'use strict';
  const dayMs = 86400000;
  const koreanDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric'
  });

  function memorialDates(now) {
    const parts = Object.fromEntries(koreanDate.formatToParts(now)
      .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const { year, month, day } = parts;
    const today = Date.UTC(year, month - 1, day);
    const passed = Date.UTC(2026, 9, 16);
    let months = Math.max(0, (year - 2026) * 12 + month - 10 - (day < 16 ? 1 : 0));
    const anchor = Date.UTC(2026, 9 + months, 16);
    const anniversaryYear = today > Date.UTC(year, 9, 16) ? year + 1 : year;
    const nextYear = Math.max(2027, anniversaryYear);
    return {
      key: `${year}-${month}-${day}`,
      years: Math.floor(months / 12), months: months % 12,
      days: Math.max(0, Math.round((today - anchor) / dayMs)),
      beforePassing: today < passed,
      remaining: Math.round((Date.UTC(nextYear, 9, 16) - today) / dayMs),
      anniversaryYear: nextYear, anniversaryNumber: nextYear - 2026
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = memorialDates;
  if (typeof document === 'undefined') return;
  let previousKey;
  function update() {
    const dates = memorialDates(new Date());
    if (previousKey === dates.key) return;
    previousKey = dates.key;
    document.getElementById('memorial-elapsed').textContent = dates.beforePassing
      ? '아직 떠나보내기 전입니다' : `${dates.years}년 ${dates.months}개월 ${dates.days}일`;
    document.getElementById('memorial-countdown').textContent = dates.remaining === 0
      ? `오늘은 ${dates.anniversaryNumber}주기입니다` : `D-${dates.remaining.toLocaleString('ko-KR')}`;
    document.getElementById('memorial-next-date').textContent = `${dates.anniversaryYear}. 10. 16 · ${dates.anniversaryNumber}주기`;
  }
  update();
  setInterval(update, 30000);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
})();
