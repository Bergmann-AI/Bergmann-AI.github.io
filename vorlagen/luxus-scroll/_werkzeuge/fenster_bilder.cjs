// Erzeugt die Bildebenen des Flugzeugfensters (Rahmen und Lichtschein) als PNG mit Transparenz.
// Aufruf: node _werkzeuge/fenster_bilder.cjs <ausgabeordner>
// Danach mit _werkzeuge/png_zu_webp.py in WebP umwandeln.
// Warum Bilder statt Inline-SVG: Der Browser muss die weichgezeichneten Lichter dann nie neu rechnen,
// der Fenster-Zoom ist reines Verschieben/Skalieren auf der Grafikkarte.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

const DEFS = `
  <radialGradient id="pBezel" cx="50%" cy="52%" r="58%"><stop offset="0.62" stop-color="#3a2a1d"/><stop offset="0.8" stop-color="#1d1611"/><stop offset="1" stop-color="#0d0b0a"/></radialGradient>
  <linearGradient id="pBezelTop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>
  <linearGradient id="pFrame" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a2617"/><stop offset="0.16" stop-color="#7d5531"/><stop offset="0.42" stop-color="#cf9d5e"/><stop offset="0.8" stop-color="#f0c888"/><stop offset="1" stop-color="#f7d79e"/></linearGradient>
  <linearGradient id="pFrameShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#120d09" stop-opacity="0.85"/><stop offset="0.22" stop-color="#120d09" stop-opacity="0.25"/><stop offset="0.5" stop-color="#120d09" stop-opacity="0"/></linearGradient>
  <linearGradient id="pSheen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.02"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="pGlassClip"><rect x="72" y="72" width="256" height="336" rx="98"/></clipPath>
  <clipPath id="pFrameClip"><path clip-rule="evenodd" d="M158 46h84a112 112 0 0 1 112 112v164a112 112 0 0 1-112 112h-84A112 112 0 0 1 46 322V158A112 112 0 0 1 158 46Z M170 72h60a98 98 0 0 1 98 98v140a98 98 0 0 1-98 98h-60a98 98 0 0 1-98-98V170a98 98 0 0 1 98-98Z"/></clipPath>
  <filter id="pBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="pBlurWide" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="pGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="pGlowWide" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="70"/></filter>`;

const BEZEL = 'M155 20h90a135 135 0 0 1 135 135v170a135 135 0 0 1-135 135h-90A135 135 0 0 1 20 325V155A135 135 0 0 1 155 20Z M158 46h84a112 112 0 0 1 112 112v164a112 112 0 0 1-112 112h-84A112 112 0 0 1 46 322V158A112 112 0 0 1 158 46Z';
const FRAME = 'M158 46h84a112 112 0 0 1 112 112v164a112 112 0 0 1-112 112h-84A112 112 0 0 1 46 322V158A112 112 0 0 1 158 46Z M170 72h60a98 98 0 0 1 98 98v140a98 98 0 0 1-98 98h-60a98 98 0 0 1-98-98V170a98 98 0 0 1 98-98Z';

// Rahmen: Verkleidung, angestrahlte Laibung, Lichtkante am Glas, leichter Glanz auf der Scheibe (Rollo liegt darunter)
const frameSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 400 480"><defs>${DEFS}</defs>
  <path fill-rule="evenodd" fill="url(#pBezel)" d="${BEZEL}"/>
  <path fill-rule="evenodd" fill="url(#pBezelTop)" d="${BEZEL}"/>
  <path fill="none" stroke="#6b4c31" stroke-opacity="0.55" stroke-width="1.2" d="M155 21h90a134 134 0 0 1 134 134v170a134 134 0 0 1-134 134h-90A134 134 0 0 1 21 325V155A134 134 0 0 1 155 21Z"/>
  <path fill-rule="evenodd" fill="url(#pFrame)" d="${FRAME}"/>
  <path fill-rule="evenodd" fill="url(#pFrameShade)" d="${FRAME}"/>
  <g clip-path="url(#pFrameClip)"><rect x="46" y="46" width="308" height="388" rx="112" fill="none" stroke="#120c08" stroke-width="22" opacity="0.75" filter="url(#pBlur)"/></g>
  <g clip-path="url(#pGlassClip)"><rect x="72" y="72" width="256" height="336" fill="url(#pSheen)"/></g>
  <rect x="72" y="72" width="256" height="336" rx="98" fill="none" stroke="#ffd9a0" stroke-width="5" opacity="0.55" filter="url(#pBlur)"/>
  <rect x="72.5" y="72.5" width="255" height="335" rx="97.5" fill="none" stroke="#fff0cf" stroke-width="1.4" opacity="0.8"/>
  <rect x="46" y="46" width="308" height="388" rx="112" fill="none" stroke="#b58552" stroke-width="2" opacity="0.5" filter="url(#pBlurWide)"/>
</svg>`;

// Lichtschein auf der Kabinenwand (weit weichgezeichnet, daher genügt eine kleine Auflösung)
// Ausschnitt -340..740 x -340..820 in Fenster-Einheiten: im CSS left -85 %, top -70,83 %, Breite 270 %, Höhe 241,67 %
const lightSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-340 -340 1080 1160"><defs>${DEFS}</defs>
  <rect x="-40" y="-40" width="480" height="560" rx="190" fill="none" stroke="#8a5428" stroke-opacity="0.17" stroke-width="150" filter="url(#pGlowWide)"/>
  <rect x="-6" y="-6" width="412" height="492" rx="155" fill="none" stroke="#c98a48" stroke-opacity="0.30" stroke-width="56" filter="url(#pGlow)"/>
</svg>`;

(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const jobs = [
    ['fenster-rahmen-1600.png', frameSvg(1333, 1600), 1333, 1600],
    ['fenster-rahmen-800.png', frameSvg(667, 800), 667, 800],
    ['fenster-licht.png', lightSvg(540, 580), 540, 580],
  ];
  const b = await chromium.launch();
  for (const [name, svg, w, h] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
    console.log('geschrieben', name);
  }
  await b.close();
})();
