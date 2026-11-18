// Rendert eine SVG-Datei mit Transparenz in ein PNG. Aufruf: node svg_zu_png.cjs <in.svg> <out.png> <breite> <höhe>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [inp, out, w, h] = process.argv.slice(2);
  const svg = fs.readFileSync(inp, 'utf8').replace(/width="[^"]*" height="[^"]*"/, `width="${w}" height="${h}"`);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`); await p.waitForTimeout(200);
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: +w, height: +h } }); await b.close();
  console.log('geschrieben', out);
})();
