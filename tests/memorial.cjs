const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
// Test-only ciphertext exercises the real PBKDF2/AES-GCM unlock flow without
// knowing, changing, or exposing the family's existing password and donations.
function fixtureHtml(html) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync('test-only-password', salt, 600000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = JSON.stringify({
    version:2,
    items:[{id:'TEST01',cat:'테스트',item:'테스트 비용',amount:15500,payer:'테스트 가족',qty:1,unit:15500,method:'테스트',when:'',status:'완료',note:''}],
    donations:[{no:1,name:'테스트 손님',amount:10000,owner:'테스트 가족'}],
    descriptions:{},payerLabels:{},payerShort:{}
  });
  const bytes = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return html.replace(/const SECRET = .*?;/, 'const SECRET = ' + JSON.stringify({s:salt.toString('base64'), i:iv.toString('base64'), n:600000, c:bytes.toString('base64')}) + ';');
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/__testfonts/')) {
    const [, , family, , filename] = url.pathname.split('/');
    const dir = family === 'serif' ? 'noto-serif-kr' : 'noto-sans-kr';
    const font = '/tmp/memorial-fonts/node_modules/@fontsource/' + dir + '/files/' + path.basename(filename || '');
    if (fs.existsSync(font)) {res.setHeader('Content-Type','font/woff2');fs.createReadStream(font).pipe(res);return;}
  }
  const file = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + '/') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(file);
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webmanifest':'application/manifest+json'})[ext] || 'application/octet-stream');
  if (url.searchParams.has('fixture')) res.end(fixtureHtml(fs.readFileSync(file, 'utf8')));
  else fs.createReadStream(file).pipe(res);
});
async function visible(page, id) { return page.locator('#' + id).isVisible(); }
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({viewport:{width,height:900}, hasTouch:true});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://**/*', route => route.abort());
      await page.goto(base, {waitUntil:'domcontentloaded'});
      assert.deepEqual(await page.locator('[aria-label="주 메뉴"] [role="tab"]').allTextContents(), ['고모를 기억하며','함께한 순간들','상주 전용']);
      assert.equal(await page.evaluate(()=>dash.data('items').data.length), 0, 'Expense data must stay encrypted before unlock');
      assert.equal(await page.evaluate(()=>dash.data('donations').data.length), 0, 'Donations must stay encrypted before unlock');
      assert.equal(await page.locator('#home-add').count(), 1, 'Home-screen installation entry');
      await page.locator('#intro-quiet').click();
      await page.locator('#intro').waitFor({state:'detached'});
      assert.equal(await visible(page, 'pg-memories'), true);
      assert.equal(await page.locator('#pg-memories #gallery').count(), 0);
      assert.equal(await page.locator('#top').innerText().then(t => t.includes('장례식장')), false);
      await page.locator('#tab-album').click();
      await page.waitForFunction(() => document.querySelectorAll('#gallery .fx-photo.is-in').length > 0);
      assert.equal(await page.locator('#gallery .fx-photo').count(), 16);
      await page.locator('#gallery .fx-photo').first().click();
      assert.equal(await visible(page, 'lightbox'), true);
      const before = await page.locator('#lb-img').getAttribute('src');
      await page.locator('#lightbox').dispatchEvent('touchstart', {changedTouches:[{identifier:0,clientX:280,clientY:400}]});
      await page.locator('#lightbox').dispatchEvent('touchend', {changedTouches:[{identifier:0,clientX:60,clientY:405}]});
      assert.notEqual(await page.locator('#lb-img').getAttribute('src'), before);
      assert.equal(await page.locator('#lb-download').count(), 0);
      await page.locator('#lb-close').click();
      await page.locator('#ss-open').click();
      await page.locator('#ss-pause').click();
      assert.equal(await page.locator('#ss-pause').getAttribute('aria-pressed'), 'true');
      await page.waitForTimeout(1500);
      assert.equal(await page.locator('#ss-counter').innerText(), '1 / 16');
      await page.locator('#ss-next').click();
      assert.equal(await page.locator('#ss-counter').innerText(), '2 / 16');
      await page.locator('#ss-close').click();
      await page.locator('#tab-family').click();
      assert.equal(await visible(page, 'lock'), true);
      for (const id of ['summary','costs','donations','owners','records']) assert.equal(await visible(page, 'pg-' + id), false);
      await page.locator('#lock-pw').fill('incorrect-password');
      await page.locator('#lock-go').click();
      await page.waitForFunction(() => document.querySelector('#lock-err').textContent.includes('맞지'));
      assert.equal(await visible(page, 'pg-summary'), false);
      for (const name of ['summary','costs','donations','owners','records']) {
        await page.goto(base + '/index.html?direct=' + name + '#' + name, {waitUntil:'domcontentloaded'});
        await page.locator('#intro-quiet').click();
        await page.locator('#intro').waitFor({state:'detached'});
        assert.equal(await visible(page, 'lock'), true, name + ' direct link must be locked');
        assert.equal(await visible(page, 'pg-' + name), false);
      }
      await page.goto(base + '/index.html?fixture', {waitUntil:'domcontentloaded'});
      await page.locator('#intro-quiet').click();
      await page.locator('#intro').waitFor({state:'detached'});
      await page.locator('#tab-family').click();
      await page.locator('#lock-pw').fill('test-only-password');
      await page.locator('#lock-go').click();
      await page.locator('#pg-summary').waitFor({state:'visible'});
      assert.equal(await page.locator('#tile-total .fx-v').innerText(), '15,500');
      assert.equal(await page.locator('#tile-donations .fx-v').first().innerText(), '10,000');
      for (const name of ['costs','donations','owners','records']) {
        await page.locator('#tab-' + name).click();
        assert.equal(await visible(page, 'pg-' + name), true);
        assert.equal(await page.locator('#tab-family').getAttribute('aria-selected'), 'true');
        if(name==='donations'){
          await page.locator('#don-owner').selectOption('테스트 가족');
          assert.equal(await page.locator('#don-sum-name').textContent(),'테스트 가족');
        }
      }
      assert.equal(await page.locator('#pg-records').innerText().then(t => t.includes('고대안암병원')), true);
      await page.locator('#family-lock').click();
      assert.equal(await visible(page, 'lock'), true);
      assert.equal(await visible(page, 'pg-records'), false);
      assert.equal(await page.evaluate(()=>dash.data('items').data.length), 0, 'Relocking clears decrypted expense data');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('fx-pw')), null, 'Family password is not retained in storage');
      assert.equal(await page.locator('#don-sum-name').textContent(), '', 'Relocking clears the previously filtered family name');
      assert.equal(await page.locator('#don-sum-count').getAttribute('data-where'), null);
      await page.locator('#tab-memories').click();
      assert.equal(await page.locator('#home-add').count(), 1, 'Home-screen installation entry');
      await page.locator('#home-add').click();
      assert.equal(await page.locator('#install-help').isVisible(), true);
      await page.locator('#install-close').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      for (const [family, dir] of [['sans','noto-sans-kr'],['serif','noto-serif-kr']]) {
        const css = '/tmp/memorial-fonts/node_modules/@fontsource/' + dir + '/400.css';
        if (fs.existsSync(css)) await page.addStyleTag({content:fs.readFileSync(css,'utf8').replaceAll('./files/', '/__testfonts/' + family + '/files/')});
      }
      await page.waitForFunction(() => document.querySelector('#pg-memories .fx-after').classList.contains('is-in'));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      await page.screenshot({path:path.join(process.env.TMPDIR || require('node:os').tmpdir(), 'memorial-home-' + width + '.png'),fullPage:true});
      await page.reload({waitUntil:'domcontentloaded'});
      assert.equal(await visible(page, 'intro'), true, 'Revisit must preserve the opening');
      await page.goto(base + '/index.html?deepalbum#album', {waitUntil:'domcontentloaded'});
      await page.locator('#intro-quiet').click();
      await page.locator('#intro').waitFor({state:'detached'});
      await page.locator('#tab-memories').click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#pg-memories .fx-after')).opacity === '1', null, {timeout:15000});
      assert.equal(await page.locator('#pg-memories .fx-after').evaluate(el=>getComputedStyle(el).opacity), '1', 'Opening on album must not suppress the home letter');
      assert.deepEqual(errors, [], 'No uncaught JS errors');
      console.log('PASS: navigation, photos, slideshow, encrypted unlock, relock, direct links, revisit, layout at ' + width + 'px');
      await page.close();
    }
    for (const platform of [
      {ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', text:'Safari'},
      {ua:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 KAKAOTALK', text:'Chrome'}
    ]) {
      const page=await browser.newPage({viewport:{width:390,height:844},userAgent:platform.ua});
      await page.route('https://**/*',route=>route.abort());
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.locator('#intro-skip').click();
      await page.locator('#home-add').click();
      assert.equal((await page.locator('#install-help').innerText()).includes(platform.text),true);
      await page.locator('#install-close').click();
      await page.evaluate(()=>{
        const event=new Event('beforeinstallprompt',{cancelable:true});
        event.prompt=async()=>{window.testPromptCalled=true;};
        event.userChoice=Promise.resolve({outcome:'accepted'});
        dispatchEvent(event);
      });
      await page.locator('#home-add').click();
      await page.waitForFunction(()=>document.querySelector('#install-card').hidden);
      assert.equal(await page.evaluate(()=>window.testPromptCalled),true);
      await page.close();
    }
    console.log('PASS: iOS guidance, Android in-app guidance, native installation event integration');
    if (process.env.FAMILY_SITE_PASSWORD) {
      const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
      const secret=JSON.parse(html.match(/const SECRET = (.*?);/)[1]);
      const key=crypto.pbkdf2Sync(process.env.FAMILY_SITE_PASSWORD,Buffer.from(secret.s,'base64'),secret.n,32,'sha256');
      const bytes=Buffer.from(secret.c,'base64');
      const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(secret.i,'base64'));
      decipher.setAuthTag(bytes.subarray(-16));
      const data=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0,-16)),decipher.final()]).toString());
      const page=await browser.newPage({viewport:{width:390,height:844}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://**/*',r=>r.abort());
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.locator('#intro-skip').click();
      await page.locator('#tab-family').click();
      await page.locator('#lock-pw').fill(process.env.FAMILY_SITE_PASSWORD);
      await page.locator('#lock-go').click();
      await page.locator('#pg-summary').waitFor({state:'visible'});
      const total=data.items.reduce((s,r)=>s+Number(r.amount),0);
      const donations=data.donations.reduce((s,r)=>s+Number(r.amount),0);
      assert.equal(await page.locator('#tile-total .fx-v').innerText(),total.toLocaleString('en-US'));
      assert.equal(await page.locator('#tile-donations .fx-v').first().innerText(),donations.toLocaleString('en-US'));
      await page.locator('#tab-costs').click();
      assert.equal(await page.locator('#cat-cards tbody tr').count(),data.items.length);
      await page.locator('#tab-donations').click();
      assert.equal(await page.locator('#don-table tbody tr').count(),data.donations.length);
      await page.locator('#family-lock').click();
      assert.equal(await page.evaluate(()=>dash.data('items').data.length),0);
      assert.equal(await page.evaluate(()=>dash.data('donations').data.length),0);
      assert.deepEqual(errors,[]);
      await page.close();
      console.log('PASS: actual family password, all original expense and donation rows, totals, relocking');
    }
  } finally { await browser.close(); server.close(); }
}
run().catch(e => { console.error(e); server.close(); process.exitCode=1; });
