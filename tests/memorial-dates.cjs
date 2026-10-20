const assert = require('node:assert/strict');
const dates = require('../memorial-dates.js');
function check(iso, expected) {
  const result = dates(new Date(iso));
  for (const [key, value] of Object.entries(expected)) assert.equal(result[key], value, `${iso}: ${key}`);
}
check('2026-10-15T15:00:00Z', {years:0, months:0, days:0, remaining:365});
check('2026-10-20T08:12:00Z', {years:0, months:0, days:4, remaining:361, anniversaryYear:2027});
check('2026-11-15T03:00:00Z', {years:0, months:0, days:30});
check('2026-11-16T03:00:00Z', {years:0, months:1, days:0});
check('2027-10-15T14:59:59Z', {years:0, months:11, days:29, remaining:1});
check('2027-10-15T15:00:00Z', {years:1, months:0, days:0, remaining:0, anniversaryNumber:1});
check('2027-10-16T15:00:00Z', {years:1, months:0, days:1, remaining:365, anniversaryYear:2028});
check('2028-02-29T03:00:00Z', {years:1, months:4, days:13});
check('2027-01-01T03:00:00Z', {years:0, months:2, days:16});
check('2026-10-15T14:59:59Z', {years:0, months:0, days:0, beforePassing:true});
console.log('Memorial calendar and KST boundary checks passed (10 cases).');
