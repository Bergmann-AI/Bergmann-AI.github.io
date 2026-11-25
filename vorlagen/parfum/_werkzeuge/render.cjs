/* Rendert die Bilder der Vorlage neu (braucht Playwright mit Chromium):
     node vorlagen/parfum/_werkzeuge/render.cjs            alle Produktbilder und das Standbild
     node vorlagen/parfum/_werkzeuge/render.cjs or noir    nur diese Flakons
   Produktbilder: assets/img/flakon-<name>-1200/800/480.webp (aus studio.html).
   Standbild (Ersatz ohne WebGL): assets/img/standbild-1920.webp und standbild-hoch-900.webp (aus der Szene). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const IMG = path.join(ROOT, 'assets/img');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ALL = ['or', 'noir', 'ambre', 'rose', 'fumee', 'lumiere'];

function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

(async () => {
  const want = process.argv.slice(2);
  const list = want.length ? want.filter(v => ALL.includes(v)) : ALL;
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  fs.mkdirSync(IMG, { recursive: true });
  for (const v of list) {
    const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
    await page.goto(`${base}/_werkzeuge/studio.html?v=${v}&size=2400`);
    await page.waitForFunction(() => window.__done, null, { timeout: 300000 });
    const r = await page.evaluate(() => window.__done);
    if (r.error) throw new Error(r.error);
    for (const w of [1200, 800, 480]) save(path.join(IMG, `flakon-${v}-${w}.webp`), r[w]);
    if (process.env.PREVIEW) save(path.join(process.env.PREVIEW, `flakon-${v}.png`), r.preview);
    console.log('Flakon', v, 'fertig');
    await page.close();
  }
  if (!want.length || want.includes('standbild')) {
    for (const [name, w, h] of [['standbild-1920', 1920, 1080], ['standbild-hoch-900', 900, 1600]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await page.goto(`${base}/index.html?gov=0`);
      await page.addStyleTag({ content: 'main, .head, .foot, .skip { visibility: hidden !important; }' });
      await page.waitForFunction(() => window.__szene, null, { timeout: 300000 });
      await page.waitForTimeout(4500);
      const png = await page.screenshot({ type: 'png' });
      const url = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', 0.84);
      }, png.toString('base64'));
      save(path.join(IMG, `${name}.webp`), url);
      console.log('Standbild', name, 'fertig');
      await page.close();
    }
  }
  await browser.close();
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
