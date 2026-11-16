// usage: node render.cjs shader.frag out.png W H '{"uniform":value}' [tile]
const { chromium } = require('playwright');
const fs = require('fs'); const http = require('http'); const path = require('path');
(async () => {
  const [frag, out, W, H, uni, tile, sky] = process.argv.slice(2);
  const root = __dirname;
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream'}); r.end(d); }); }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); p.setDefaultTimeout(0);
  p.on('console', m => console.log('[page]', m.text()));
  await p.goto(`http://127.0.0.1:${port}/harness.html`);
  const t0 = Date.now();
  const src = fs.readFileSync(frag, 'utf8');
  const url = await p.evaluate(([s, w, h, u, t, k]) => window.renderImage(s, w, h, u, t, k), [src, +W, +H, JSON.parse(uni || '{}'), +(tile || 256), sky || null]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('rendered', out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
