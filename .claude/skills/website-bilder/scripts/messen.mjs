#!/usr/bin/env node
// Bilder einer Seite im echten Browser messen (Skill website-bilder).
//
//   node messen.mjs <index.html> [--root <ordner>] [--breiten 1440x900@2,390x844@3] [--json bericht.json]
//
// Je Bildschirm: welche Datei der Browser wirklich lädt (currentSrc), wie viele Bildpixel auf einen CSS-Pixel kommen
// (unter 2x bei scharfen Bildschirmen = weich, über 2x = Daten verschenkt), ob das größte Element (LCP) ein Bild ist
// und wie es geladen wird, und wie schwer die Bilder zusammen sind. Auch CSS-Hintergrundbilder.
// Braucht Playwright mit Chromium (in Claude-Cloud-Sitzungen vorinstalliert). Ein Browser, danach geschlossen.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  try { ({ chromium } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'playwright'))); } catch {
    console.error('Playwright fehlt: npm i -g playwright (oder NODE_PATH=$(npm root -g) setzen)'); process.exit(2);
  }
}

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const file = args.find(a => !a.startsWith('--') && (a.endsWith('.html') || fs.existsSync(a)));
if (!file) { console.error('Aufruf: node messen.mjs <index.html> [--root ordner] [--breiten 1440x900@2,390x844@3]'); process.exit(2); }
const root = path.resolve(opt('--root', path.dirname(file)));
const pagePath = '/' + path.relative(root, path.resolve(file)).split(path.sep).join('/');
const views = opt('--breiten', '1440x900@2,1920x1080@1,390x844@3').split(',').map(s => {
  const m = s.match(/(\d+)x(\d+)@([\d.]+)/); return { w: +m[1], h: +m[2], dpr: +m[3] };
});
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2' };

const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Timing-Allow-Origin': '*' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const report = [];
let fails = 0, warns = 0;
const out = (lvl, text) => { if (lvl === 'FAIL') fails++; if (lvl === 'WARN') warns++; console.log(`${lvl.padEnd(4)}  ${text}`); };

try {
  for (const v of views) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__lcp = null;
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(base + pagePath, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const lcp = await page.evaluate(() => {
      const e = window.__lcp; if (!e) return null;
      const el = e.element;
      return { time: Math.round(e.startTime), tag: el ? el.tagName.toLowerCase() : null, url: e.url || null,
        loading: el && el.getAttribute ? el.getAttribute('loading') : null, prio: el && el.getAttribute ? el.getAttribute('fetchpriority') : null };
    });
    // durchscrollen, damit lazy Bilder laden
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += Math.round(v.h * 0.8)) { await page.evaluate(yy => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0));
    const data = await page.evaluate(async (dpr) => {
      const res = performance.getEntriesByType('resource');
      const bytes = u => { const r = res.find(x => x.name === u); return r ? (r.encodedBodySize || r.transferSize || 0) : 0; };
      // naturalWidth ist bei srcset mit w-Angaben schon durch die Dichte geteilt: echte Pixel über ein eigenes Image lesen.
      // Größe ohne CSS-Transform (offsetWidth), sonst verfälschen gedrehte oder gezoomte Bilder die Messung.
      const imgs = [];
      for (const img of document.images) {
        const r = img.getBoundingClientRect(); const cs = getComputedStyle(img);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        const src = img.currentSrc || img.src;
        if (!img.naturalWidth) { imgs.push({ src, broken: true }); continue; }
        let nw = img.naturalWidth, nh = img.naturalHeight, soft = false;
        try {
          const t = new Image(); t.src = src; await t.decode(); nw = t.naturalWidth; nh = t.naturalHeight;
          // Weiches Motiv (Schatten, Verlauf, Unschärfe)? Dann sieht man Hochziehen nicht.
          const k = Math.min(1, 256 / Math.max(nw, nh)); const cw = Math.max(8, Math.round(nw * k)), ch = Math.max(8, Math.round(nh * k));
          const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(t, 0, 0, cw, ch); const d = g.getImageData(0, 0, cw, ch).data;
          const v = (x, y) => { const i = (y * cw + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * d[i + 3] / 255; };
          let sum = 0, sum2 = 0, n = 0;
          for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
            const l = 4 * v(x, y) - v(x - 1, y) - v(x + 1, y) - v(x, y - 1) - v(x, y + 1); sum += l; sum2 += l * l; n++;
          }
          soft = n > 0 && (sum2 / n - (sum / n) ** 2) < 12;
        } catch {}
        const bw = img.offsetWidth || r.width, bh = img.offsetHeight || r.height;
        const fit = cs.objectFit; const sx = bw / nw, sy = bh / nh;
        const scale = fit === 'cover' ? Math.max(sx, sy) : fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : sx;
        imgs.push({ src, nw, nh, cw: Math.round(bw), ch: Math.round(bh), density: 1 / scale, transformed: cs.transform !== 'none', soft,
          bytes: bytes(src), svg: /\.svg(\?|$)/i.test(src), lazy: img.loading === 'lazy' });
      }
      // CSS-Hintergrundbilder auf großen Flächen
      const bgs = [];
      for (const el of document.querySelectorAll('body *')) {
        const b = getComputedStyle(el).backgroundImage; if (!b || !b.includes('url(')) continue;
        const rr = el.getBoundingClientRect(); const r = { width: el.offsetWidth || rr.width, height: el.offsetHeight || rr.height };
        if (r.width < 200 || r.height < 120) continue;
        const u = b.match(/url\(["']?([^"')]+)["']?\)/)[1]; if (/\.svg|data:/.test(u)) continue;
        const im = new Image(); im.src = u; try { await im.decode(); } catch { continue; }
        const scale = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
        bgs.push({ src: u, nw: im.naturalWidth, cw: Math.round(r.width), ch: Math.round(r.height), density: 1 / scale, bytes: bytes(new URL(u, location.href).href) });
        if (bgs.length > 20) break;
      }
      const imgBytes = res.filter(x => x.initiatorType === 'img' || /\.(avif|webp|jpe?g|png|gif)(\?|$)/i.test(x.name))
        .reduce((s, x) => s + (x.encodedBodySize || x.transferSize || 0), 0);
      return { imgs, bgs, imgBytes };
    }, v.dpr);
    console.log(`\n=== ${v.w}x${v.h} bei ${v.dpr}x ===`);
    const target = Math.min(v.dpr, 2);
    for (const im of [...data.imgs, ...data.bgs]) {
      const name = decodeURIComponent(im.src.replace(base, '')).slice(0, 70);
      if (im.broken) { out('FAIL', `${name}: lädt nicht`); continue; }
      if (im.svg) continue;
      const d = im.density;
      const line = `${name}: ${im.nw} px Bild auf ${im.cw} CSS-px = ${d.toFixed(2)}x` + (im.bytes ? `, ${Math.round(im.bytes / 1024)} KB` : '');
      if (d < target * 0.8 && im.soft) out('INFO', line + ' – weiches Motiv (Schatten, Verlauf): hochgezogen fällt nicht auf');
      else if (d < 1 && im.cw >= 200) out('FAIL', line + ' – hochgezogen, sichtbar unscharf: größere Datei oder kleinerer Platz');
      else if (d < target * 0.8 && im.cw >= 200) out('WARN', line + ` – unter ${target}x: auf diesem Bildschirm weich`);
      else if (d > v.dpr * 1.7 && im.bytes > 60 * 1024) out('WARN', line + ' – deutlich größer als nötig: sizes prüfen oder kleinere Stufe anbieten');
      else out('OK', line);
    }
    if (lcp) {
      const isImg = lcp.tag === 'img' || !!lcp.url;
      out(isImg && lcp.loading === 'lazy' ? 'FAIL' : 'INFO',
        `LCP: <${lcp.tag}> nach ${lcp.time} ms (lokal, nicht repräsentativ)` + (lcp.url ? ` ${decodeURIComponent(lcp.url.replace(base, '')).slice(0, 60)}` : '') +
        (isImg && lcp.loading === 'lazy' ? ' – das größte Bild ist lazy: Attribut entfernen, fetchpriority="high"' : '') +
        (isImg && lcp.prio !== 'high' && lcp.tag === 'img' ? ' – fetchpriority="high" fehlt' : ''));
    }
    const kb = Math.round(data.imgBytes / 1024);
    out(kb > (v.w < 600 ? 1500 : 2500) ? 'WARN' : 'INFO', `Bilder gesamt nach vollem Durchscrollen: ${kb} KB`);
    report.push({ view: v, lcp, ...data });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(report, null, 1));
console.log(`\nErgebnis: ${fails} FAIL, ${warns} WARN`);
process.exit(fails ? 1 : 0);
