/* Erzeugt die zwei Standbilder der Vorlage für das Handy der Seite /websites/:
     assets/handy/vorlage-zu.webp      die Vorlage Luxus-Scroll im ersten Moment (Rollo unten); steht im Handy,
                                       bis die echte Vorlage geladen ist, damit der Wechsel nicht springt
     assets/handy/vorlage-start.webp   die Vorlage nach dem Hochfahren des Rollos, für die Handys ohne JavaScript
   Aufruf im Repo-Ordner:  node websites/_werkzeuge/vorlage-bilder.cjs
   Braucht Playwright (Chromium) und Python mit Pillow. Nach Änderungen an der Vorlage (vorlagen/luxus-scroll)
   die beiden Vorlagen-Bilder neu erzeugen, damit sie zum ersten Bild der echten Vorlage passen. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'assets', 'handy');
const TMP = path.join(OUT, '_tmp');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const VW = 390, VH = 869;   // Bildschirm der Vorlage im Handy in CSS-Pixeln (Seitenverhältnis des Handy-Bildschirms)

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  // Vorlage: erstes Bild (Rollo unten, ohne Skript) und Bild nach dem Hochfahren
  const shots = [];
  {
    const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
    await page.route('**/vorlagen/luxus-scroll/assets/js/main.js', r => r.abort());
    await page.goto(`${base}/vorlagen/luxus-scroll/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const file = path.join(TMP, 'vorlage-zu.png');
    await page.screenshot({ path: file });
    shots.push(file);
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
    await page.goto(`${base}/vorlagen/luxus-scroll/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 15000 });
    await page.waitForTimeout(900);
    const file = path.join(TMP, 'vorlage-start.png');
    await page.screenshot({ path: file });
    shots.push(file);
    await page.close();
  }
  await browser.close();
  server.close();

  // als WebP speichern
  execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
out, shots = sys.argv[1], json.loads(sys.argv[2])
for s in shots:
    name = s.rsplit('/', 1)[1].replace('.png', '.webp')
    Image.open(s).convert('RGB').save(f'{out}/{name}', 'WEBP', quality=82, method=6)
    print(name)
`, OUT, JSON.stringify(shots)], { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
})();
