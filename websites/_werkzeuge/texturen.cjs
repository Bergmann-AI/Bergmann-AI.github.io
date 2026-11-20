/* Erzeugt die Bildschirm-Bilder des 3D-Handys aus der Beispiel-Website der Seite.
   Aufruf im Repo-Ordner:  node websites/_werkzeuge/texturen.cjs
   Braucht Playwright (Chromium) und Python mit Pillow für WebP.
   Ergebnis in websites/assets/3d/: screen-<zustand>-<d|m>.png -> .webp (d = Desktop, doppelte Schärfe;
   m = Handy), dock-*.webp und chat-*.webp (schwebende Ebenen mit Transparenz) und screen.json
   (Lage der schwebenden Ebenen auf dem Bildschirm, in Anteilen). Nach Änderungen an der
   Beispiel-Website in index.html (template#site) oder an ihrem CSS einfach neu ausführen. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'assets', '3d');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const MARGIN = 14;   // Rand um schwebende Ebenen in CSS-Pixeln, damit ihr Schatten mitkommt

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const layout = {};
  const pngs = [];
  for (const [tag, dpr] of [['d', 2], ['m', 1]]) {
    const page = await browser.newPage({ viewport: { width: 520, height: 960 }, deviceScaleFactor: dpr });
    for (const what of ['old', 'load', 'ready', 'night', 'dock', 'chat']) {
      await page.goto(`http://127.0.0.1:${port}/websites/_werkzeuge/textur.html?cap=${what}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__cap);
      const c = await page.evaluate(() => window.__cap);
      const box = await page.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { x: r.left, y: r.top }; });
      const floating = what === 'dock' || what === 'chat';
      const clip = floating
        ? { x: box.x + c.x - MARGIN, y: box.y + c.y - MARGIN, width: c.rw + 2 * MARGIN, height: c.rh + 2 * MARGIN }
        : { x: box.x, y: box.y, width: c.w, height: c.h };
      const name = (floating ? what : `screen-${what}`) + `-${tag}`;
      const file = path.join(OUT, name + '.png');
      await page.screenshot({ path: file, clip, omitBackground: floating });
      pngs.push(file);
      if (tag === 'd') {
        layout.aspect = c.w / c.h;
        if (floating) layout[what] = { x: (c.x - MARGIN) / c.w, y: (c.y - MARGIN) / c.h, w: (c.rw + 2 * MARGIN) / c.w, h: (c.rh + 2 * MARGIN) / c.h };
      }
    }
    await page.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(OUT, 'screen.json'), JSON.stringify(layout, null, 2) + '\n');
  // PNG -> WebP (Grundbilder ohne, schwebende Ebenen mit Transparenz), danach PNG löschen
  execFileSync('python3', ['-I', '-c', [
    'import sys', 'from PIL import Image',
    'for f in sys.argv[1:]:',
    '    im = Image.open(f)',
    '    keep_alpha = ("dock" in f) or ("chat" in f)',
    '    im = im.convert("RGBA" if keep_alpha else "RGB")',
    '    im.save(f[:-4] + ".webp", "WEBP", quality=90, method=6)',
  ].join('\n'), ...pngs]);
  for (const f of pngs) fs.unlinkSync(f);
  console.log('fertig:', JSON.stringify(layout));
})().catch(e => { console.error(e); server.close(); process.exit(1); });
