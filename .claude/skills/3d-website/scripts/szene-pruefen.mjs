#!/usr/bin/env node
// 3D-Seite im echten Browser prüfen (Skill 3d-website).
//
//   node szene-pruefen.mjs <index.html> [--root <ordner>] [--out shots/3d] [--punkte 0,0.15,0.35,0.55,0.8,1]
//        [--breiten 1440x900@1,390x844@2] [--gpu] [--warten 1200]
//
// Je Breite: Screenshots an den Scroll-Punkten, ob die Leinwand dort etwas zeigt (nicht leer, nicht nur Schwarz),
// Größe des Zeichenpuffers gegen Bildschirm-DPR, Zahl der WebGL-Kontexte, Fehler in der Konsole, Bildzeiten beim
// Durchscrollen (Median, p95, Ausreißer über 50 ms), Layouts pro Bild. Danach zwei Gegenproben: reduzierte Bewegung
// und ein Browser ohne WebGL (no-3d muss vor dem ersten Zeichnen stehen, Layout-Shift unter 0,1).
// Ohne --gpu rendert Chromium auf der CPU (SwiftShader): Bildzeiten sind dann nur relativ zu lesen, je Abschnitt
// im Vergleich. Echte Werte am Gerät mit ?fps.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  try { ({ chromium } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'playwright'))); } catch {
    console.error('Playwright fehlt: NODE_PATH=$(npm root -g) setzen oder npm i -g playwright'); process.exit(2);
  }
}

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const file = args.find(a => !a.startsWith('--') && a.endsWith('.html'));
if (!file) { console.error('Aufruf: node szene-pruefen.mjs <index.html> [--root ordner] [--out shots/3d]'); process.exit(2); }
const root = path.resolve(opt('--root', path.dirname(file)));
const pagePath = '/' + path.relative(root, path.resolve(file)).split(path.sep).join('/');
const outDir = path.resolve(opt('--out', 'shots/3d'));
fs.mkdirSync(outDir, { recursive: true });
const points = opt('--punkte', '0,0.15,0.35,0.55,0.8,1').split(',').map(Number);
const views = opt('--breiten', '1440x900@1,390x844@2').split(',').map(s => {
  const m = s.match(/(\d+)x(\d+)@([\d.]+)/); return { w: +m[1], h: +m[2], dpr: +m[3] };
});
const settle = +opt('--warten', 1200);
const gpu = args.includes('--gpu');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.hdr': 'image/vnd.radiance',
  '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.webm': 'video/webm', '.spz': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const launchArgs = ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
if (!gpu) launchArgs.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await chromium.launch({ args: launchArgs });

let fails = 0, warns = 0;
const out = (lvl, text) => { if (lvl === 'FAIL') fails++; if (lvl === 'WARN') warns++; console.log(`${lvl.padEnd(4)}  ${text}`); };

// Zählt WebGL-Kontexte und merkt sich die Leinwände
const COUNT_GL = () => {
  window.__gl = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const ctx = orig.call(this, type, opts);
    if (ctx && /webgl|webgpu/.test(type) && !window.__gl.includes(this) && this.isConnected !== false) window.__gl.push(this);
    return ctx;
  };
  window.__cls = 0;
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
};
const NO_GL = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) { return /webgl|webgpu/.test(type) ? null : orig.call(this, type, opts); };
  try { Object.defineProperty(navigator, 'gpu', { get: () => undefined }); } catch {}
  window.__cls = 0;
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
};

async function canvasStats(page) {
  // Liest die sichtbare 3D-Leinwand im selben Bild nach dem Zeichnen (der Puffer ist danach leer)
  return page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => setTimeout(() => requestAnimationFrame(() => {
      const list = (window.__gl || []).filter(c => c.isConnected && c.clientWidth > 50);
      const c = list.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      if (!c) return resolve(null);
      const t = document.createElement('canvas'); t.width = 96; t.height = 64;
      const g = t.getContext('2d', { willReadFrequently: true });
      try { g.drawImage(c, 0, 0, 96, 64); } catch { return resolve({ unreadable: true }); }
      const d = g.getImageData(0, 0, 96, 64).data; let s = 0, s2 = 0, n = 0, dark = 0;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; s2 += l * l; n++; if (l < 6) dark++; }
      resolve({ mean: s / n, sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), dark: dark / n,
        bw: c.width, bh: c.height, cw: c.clientWidth, ch: c.clientHeight });
    })));
  }));
}

try {
  for (const v of views) {
    console.log(`\n=== ${v.w}x${v.h} bei ${v.dpr}x${gpu ? '' : ' (CPU-Rendering, Zeiten relativ)'} ===`);
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('requestfailed', r => errors.push('Laden fehlgeschlagen: ' + r.url().replace(base, '')));
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url().replace(base, '')}`); });
    await page.addInitScript(COUNT_GL);
    await page.goto(base + pagePath, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const no3d = await page.evaluate(() => document.documentElement.classList.contains('no-3d'));
    const nGl = await page.evaluate(() => (window.__gl || []).length);
    if (no3d) out('FAIL', 'no-3d ist gesetzt, obwohl WebGL da ist: Prüfung im <head> oder Kontextverlust');
    out(nGl > 4 ? 'FAIL' : nGl === 0 ? 'WARN' : 'OK', `${nGl} WebGL-Kontext(e)` + (nGl > 4 ? ' – höchstens 4 (taste), besser 1' : nGl === 0 ? ' – keine 3D-Leinwand gefunden' : ''));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const scrollMax = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    let blank = 0;
    for (const p of points) {
      await page.evaluate(y => window.scrollTo(0, y), Math.round(p * scrollMax));
      await page.waitForTimeout(settle);
      const shot = path.join(outDir, `${v.w}-${String(Math.round(p * 100)).padStart(3, '0')}.png`);
      await page.screenshot({ path: shot });
      const st = await canvasStats(page);
      if (!st) { out('INFO', `Scroll ${p}: keine sichtbare 3D-Leinwand`); continue; }
      if (st.unreadable) { out('INFO', `Scroll ${p}: Leinwand nicht lesbar, Screenshot ansehen: ${path.relative(process.cwd(), shot)}`); continue; }
      const empty = st.sd < 2 && st.dark > 0.97;
      if (empty) blank++;
      out(empty ? 'WARN' : 'OK', `Scroll ${p}: Leinwand ${empty ? 'leer oder fast schwarz (in Textabschnitten gewollt abgedunkelt? sonst zeigt die Kamera ins Leere)' : `zeigt etwas (Helligkeit ${st.mean.toFixed(0)}, Streuung ${st.sd.toFixed(0)})`} → ${path.relative(process.cwd(), shot)}`);
      if (p === points[0]) {
        const ratio = st.bw / st.cw;
        const cap = Math.min(v.dpr, 2);
        out(ratio > cap + 0.01 ? 'WARN' : 'INFO', `Zeichenpuffer ${st.bw}x${st.bh} für ${st.cw}x${st.ch} CSS-px = ${ratio.toFixed(2)}x` +
          (ratio > cap + 0.01 ? ` – über ${cap}x: kostet GPU ohne sichtbaren Gewinn (setPixelRatio(Math.min(devicePixelRatio, 2)))` : ''));
      }
    }
    if (blank === points.length) out('FAIL', 'Leinwand an allen Punkten leer: Szene zeichnet nicht (Konsole lesen)');
    // Durchscrollen und Bildzeiten messen
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const m0 = await cdp.send('Performance.getMetrics');
    const timing = await page.evaluate(async (max) => {
      const deltas = []; let last = performance.now(); let loaf = 0, loafMax = 0;
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) { loaf++; loafMax = Math.max(loafMax, e.duration); } }).observe({ type: 'long-animation-frame' }); } catch {}
      const dur = 5000; const t0 = performance.now();
      await new Promise(done => {
        const step = now => {
          deltas.push(now - last); last = now;
          const k = Math.min(1, (now - t0) / dur);
          window.scrollTo(0, Math.round((0.5 - 0.5 * Math.cos(Math.PI * k)) * max));
          if (k < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      await new Promise(r => setTimeout(r, 300));
      deltas.shift(); deltas.sort((a, b) => a - b);
      const q = f => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * f))];
      return { n: deltas.length, p50: q(0.5), p95: q(0.95), over50: deltas.filter(d => d > 50).length, loaf, loafMax };
    }, scrollMax);
    const m1 = await cdp.send('Performance.getMetrics');
    const metric = (m, k) => (m.metrics.find(x => x.name === k) || {}).value || 0;
    const layouts = metric(m1, 'LayoutCount') - metric(m0, 'LayoutCount');
    const styles = metric(m1, 'RecalcStyleCount') - metric(m0, 'RecalcStyleCount');
    // Layouts pro Sekunde, nicht pro Bild: Auf der CPU kommen nur wenige, langsame Bilder zustande, dann sähen einmalige
    // Layouts (Klassenwechsel an Abschnittsgrenzen, nachgeladene Bilder) wie ein Layout in jedem Bild aus. Echtes
    // Ruckeln heißt: Layout in fast jedem Bild bei 60 Bildern pro Sekunde, also deutlich über 20 pro Sekunde.
    const perSec = layouts / 5;
    out(gpu && timing.p95 > 25 ? 'WARN' : 'INFO', `Bildzeit beim Durchscrollen: Median ${timing.p50.toFixed(1)} ms, p95 ${timing.p95.toFixed(1)} ms, ` +
      `${timing.over50} Bilder über 50 ms, ${timing.loaf} lange Animationsbilder (max ${Math.round(timing.loafMax)} ms)` + (gpu ? '' : ' – CPU-Rendering, nur relativ'));
    out(perSec > 20 ? 'WARN' : 'OK', `${layouts} Layouts und ${styles} Stil-Neuberechnungen in 5 s Scrollen (${perSec.toFixed(1)} Layouts pro Sekunde)` +
      (perSec > 20 ? ' – Layout in fast jedem Bild: nur transform/opacity animieren, SVG-Animationen in versiegelte Boxen, keine Lesungen von Maßen nach Schreibzugriffen' :
        layouts > 0 ? ' – einzelne Layouts, z. B. Klassenwechsel beim Scrollen; kein Dauerlast' : ''));
    const uniq = [...new Set(errors)];
    if (uniq.length) uniq.slice(0, 8).forEach(e => out('FAIL', 'Konsole: ' + e.slice(0, 200)));
    else out('OK', 'Konsole ohne Fehler');
    await ctx.close();
  }

  // Gegenprobe 1: reduzierte Bewegung
  {
    const v = views[views.length - 1];
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(COUNT_GL);
    await page.goto(base + pagePath, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.35)); await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, `reduziert-${v.w}.png`) });
    out(errors.length ? 'FAIL' : 'OK', 'Reduzierte Bewegung: ' + (errors.length ? errors[0].slice(0, 160) : `ohne Fehler, Bild reduziert-${v.w}.png ansehen (Szene steht, Kamera ohne Nachlauf)`));
    await ctx.close();
  }
  // Gegenprobe 2: ohne WebGL
  {
    const v = views[views.length - 1];
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(NO_GL);
    await page.goto(base + pagePath, { waitUntil: 'load' }); await page.waitForTimeout(2000);
    const r = await page.evaluate(() => ({ no3d: document.documentElement.classList.contains('no-3d'), cls: window.__cls }));
    await page.screenshot({ path: path.join(outDir, `ohne-webgl-${v.w}.png`) });
    out(r.no3d ? 'OK' : 'WARN', 'Ohne WebGL: ' + (r.no3d ? 'no-3d gesetzt' : 'keine Klasse no-3d: steht trotzdem ein Standbild? Bild ohne-webgl ansehen'));
    out(r.cls > 0.1 ? 'FAIL' : 'OK', `Ohne WebGL: Layout-Shift ${r.cls.toFixed(3)}` + (r.cls > 0.1 ? ' – no-3d zu spät: WebGL-Prüfung als Inline-Skript in den <head>' : ''));
    if (errors.length) out('WARN', 'Ohne WebGL: ' + errors[0].slice(0, 160));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\nScreenshots: ${path.relative(process.cwd(), outDir)}  ·  Ergebnis: ${fails} FAIL, ${warns} WARN`);
console.log('Danach jedes Bild ansehen: Text lesbar? Kamera zeigt etwas Sinnvolles? Kanten sauber, keine Treppen, kein Banding?');
process.exit(fails ? 1 : 0);
