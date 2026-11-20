/* Bergmann AI, /websites/: das 3D-Handy, das über die ganze Seite mitläuft.

   Ein Handy (three.js, ohne Zusatzbibliothek) liegt auf einer festen Leinwand zwischen dem Grund der
   Abschnitte und ihrem Text. Jede Stelle, an der es stehen soll, ist im Layout ein Handy aus HTML
   (.phone[data-pose]): Ohne 3D ist das das Bild, mit 3D fliegt das 3D-Handy genau dorthin.
     hero    Einstieg, schräg, die fertige Website am Abend
             beim Weg nach unten dreht es sich einmal um sich selbst und zeigt danach die alte Website
     wandel  Vorher/Nachher: die alte Seite zerfällt in Streifen, die neue setzt sich zusammen,
             dann kommen Kontaktleiste, fertiges Laden und der Chat am Abend (passend zu den Schritten)
     turn    "Im Preis enthalten" (zwei Bildschirme): eine ruhige ganze Drehung
     front   Ablauf, fast frontal
     price   Preise, zwischen den Angeboten; beim Paket öffnet sich der Chat
     away    Fragen: das Handy tritt nach rechts aus dem Bild
     close   Abschluss, rechts neben dem Text
   Am Handy und Tablet gibt es nur Einstieg und Vorher/Nachher; danach scrollt es mit der Szene weg.

   Ein Zustandswert t (0 bis 4) beschreibt den Bildschirm: 0 alt, 1 lesbar (lädt noch), 2 Kontaktleiste,
   3 geladen, 4 abends mit Chat. Lage und Größe folgen der Scrollposition direkt (das Handy bleibt so am
   Layout), Drehung und Bildschirm folgen weich. Leistung: Positionen werden nur bei Größenänderung
   gemessen, Bilder vorab dekodiert und hochgeladen, Programme vorab übersetzt; gezeichnet wird nur,
   solange das Handy im Bild ist und sich etwas bewegt. Ohne WebGL oder bei Fehlern bleiben die
   HTML-Handys stehen (Klasse no-3d). */
import * as THREE from '../../../assets/3d/three.module.min.js';

const root = document.documentElement;
const canvas = document.getElementById('phone3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const TAU = Math.PI * 2;

function fail() {
  root.classList.remove('is-3d');
  root.classList.add('no-3d');
}
if (!canvas || root.classList.contains('no-3d')) {
  fail();
} else {
  start().catch(e => { console.warn('3D-Handy aus:', e); fail(); });
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => 1 - Math.pow(1 - clamp(t), 3);

// Bilder laden und abseits des Hauptfadens dekodieren (img.decode), in allen Browsern gleich
function decode(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; })).then(() => img);
}

async function start() {
  const gl2 = canvas.getContext('webgl2', { alpha: true, antialias: (window.devicePixelRatio || 1) < 2, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl2) throw new Error('kein WebGL2');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl2, alpha: true });
  renderer.debug.checkShaderErrors = /[?&]debug\b/.test(location.search);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const tag = small ? 'm' : 'd';
  const base = new URL('./', import.meta.url).href;
  const [layout, ...bitmaps] = await Promise.all([
    fetch(base + 'screen.json').then(r => r.json()),
    ...['screen-old', 'screen-load', 'screen-ready', 'screen-night', 'dock', 'chat'].map(n => decode(`${base}${n}-${tag}.webp`)),
  ]);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = bitmaps.map(bm => {
    const t = new THREE.Texture(bm);
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = aniso;   // flipY (Standard): die Oberkante des Bildes liegt bei v = 1
    t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  });
  const [tOld, tLoad, tReady, tNight, tDock, tChat] = tex;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  /* ---------- Licht: eine kleine Studio-Umgebung für Spiegelungen, ein Hauptlicht von links oben ---------- */
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x15171c, side: THREE.BackSide })));
    const box = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    box(7, 3, -5, 5, 4, 0xf5efe2);    // weiche Fläche links oben
    box(3, 8, 6, 0, 3, 0x9a958a);     // schmale Fläche rechts
    box(10, 2, 0, -6, 2, 0x45413a);   // warmer Boden
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();
  }
  const key = new THREE.DirectionalLight(0xfff6e8, 1.4);
  key.position.set(-3, 4, 6);
  scene.add(key);

  /* ---------- das Handy: Höhe 1, Breite 9/19,4 wie die HTML-Handys ---------- */
  const W = 9 / 19.4, H = 1, D = 0.058, R = 0.145 * W;
  const SW = W * 0.942, SH = H - 0.058 * W, SR = 0.12 * W;   // Bildschirm wie im HTML (2,9 % Rand)
  const phone = new THREE.Group();
  scene.add(phone);

  function rrect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return s;
  }
  const bevel = 0.011;
  const bodyGeo = new THREE.ExtrudeGeometry(rrect(W - 2 * bevel, H - 2 * bevel, R - bevel), { depth: D - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: small ? 4 : 7, curveSegments: small ? 14 : 28 });
  bodyGeo.translate(0, 0, -(D - 2 * bevel) / 2);
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x23252b, metalness: 0.25, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.35 });
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x4a4c53, metalness: 0.92, roughness: 0.3, envMapIntensity: 1.2 });
  const body = new THREE.Mesh(bodyGeo, [backMat, frameMat]);
  phone.add(body);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x040507, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(rrect(W - 0.006, H - 0.006, R - 0.003), small ? 16 : 32), glassMat);
  glass.position.z = D / 2 + 0.0004;
  phone.add(glass);

  // Tasten an den Seiten und das Kamerafeld auf der Rückseite
  const keyGeo = (h) => new THREE.BoxGeometry(0.008, h, 0.016);
  [[-1, 0.27, 0.035], [-1, 0.17, 0.07], [-1, 0.075, 0.07], [1, 0.16, 0.11]].forEach(([side, y, h]) => {
    const k = new THREE.Mesh(keyGeo(h), frameMat); k.position.set(side * (W / 2 + 0.002), y, 0); phone.add(k);
  });
  {
    const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(rrect(0.2, 0.2, 0.05), { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 12 }), backMat);
    bump.position.set(W / 2 - 0.135, H / 2 - 0.135, -D / 2 - 0.004);   // von hinten gesehen oben links
    bump.rotation.y = Math.PI;
    phone.add(bump);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.1, roughness: 0.05, clearcoat: 1 });
    const ringMat = frameMat;
    [[-0.045, 0.045], [-0.045, -0.045], [0.045, 0]].forEach(([x, y]) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 32), ringMat);
      ring.rotation.x = Math.PI / 2; ring.position.set(bump.position.x - x, bump.position.y + y, -D / 2 - 0.016); phone.add(ring);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 32), lensMat);
      lens.rotation.y = Math.PI; lens.position.set(bump.position.x - x, bump.position.y + y, -D / 2 - 0.0225); phone.add(lens);
    });
  }

  /* ---------- der Bildschirm: Ebenen aus den Bildern, mit runden Ecken wie das Glas ---------- */
  const screen = new THREE.Group();
  screen.position.z = D / 2 + 0.001;
  phone.add(screen);
  const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const frag = `
    uniform sampler2D m0, m1, m2; uniform float w1, w2, opacity; uniform vec4 rect, uvMap; uniform vec3 size;
    varying vec2 vUv;
    float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){
      vec2 tuv = vec2(mix(uvMap.x, uvMap.z, vUv.x), mix(uvMap.y, uvMap.w, vUv.y));   // Ausschnitt des Bildes
      vec4 c = texture2D(m0, tuv);
      c = mix(c, texture2D(m1, tuv), w1);
      c = mix(c, texture2D(m2, tuv), w2);
      // Lage dieses Pixels auf dem ganzen Bildschirm (rect: links, oben, rechts, unten in Anteilen)
      vec2 s = vec2(mix(rect.x, rect.z, vUv.x), mix(rect.w, rect.y, vUv.y));
      vec2 p = (s - 0.5) * size.xy * vec2(1.0, -1.0);
      float d = box(p, size.xy * 0.5, size.z);
      float edge = fwidth(d) + 1e-5;
      float a = c.a * opacity * (1.0 - smoothstep(-edge, edge, d));
      if (a < 0.002) discard;
      gl_FragColor = vec4(c.rgb, a);
    }`;
  const layers = [];
  function layer(maps, r, z, order) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { m0: { value: maps[0] }, m1: { value: maps[1] || maps[0] }, m2: { value: maps[2] || maps[0] }, w1: { value: 0 }, w2: { value: 0 }, opacity: { value: 1 }, rect: { value: new THREE.Vector4(r.x0, r.y0, r.x1, r.y1) }, uvMap: { value: new THREE.Vector4(r.u0, r.v0, r.u1, r.v1) }, size: { value: new THREE.Vector3(SW, SH, SR) } },
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, toneMapped: false,
    });
    // uvMap schneidet das Teilstück eines Bildes aus (v = 1 ist die Oberkante)
    const m = new THREE.Mesh(new THREE.PlaneGeometry((r.x1 - r.x0) * SW, (r.y1 - r.y0) * SH), mat);
    m.userData.home = new THREE.Vector3(((r.x0 + r.x1) / 2 - 0.5) * SW, (0.5 - (r.y0 + r.y1) / 2) * SH, z);
    m.position.copy(m.userData.home);
    m.renderOrder = order;
    screen.add(m);
    layers.push(m);
    return m;
  }
  // Streifen überlappen sich um einen Hauch, damit zwischen ihnen keine Fuge aufblitzt
  const band = (y0, y1) => { y0 = Math.max(0, y0 - 0.0015); y1 = Math.min(1, y1 + 0.0015); return { x0: 0, x1: 1, y0, y1, u0: 0, u1: 1, v0: 1 - y1, v1: 1 - y0 }; };
  const OLD = 6, oldStrips = [];
  for (let i = 0; i < OLD; i++) oldStrips.push(layer([tOld], band(i / OLD, (i + 1) / OLD), 0.0008, 1));
  const NEW_BANDS = [0, 0.135, 0.4, 0.72, 1], newStrips = [];
  for (let i = 0; i < NEW_BANDS.length - 1; i++) newStrips.push(layer([tLoad, tReady, tNight], band(NEW_BANDS[i], NEW_BANDS[i + 1]), 0.0006, 2));
  const fl = (r) => ({ x0: r.x, x1: r.x + r.w, y0: r.y, y1: r.y + r.h, u0: 0, u1: 1, v0: 0, v1: 1 });
  const dock = layer([tDock], fl(layout.dock), 0.002, 3);
  const chat = layer([tChat], fl(layout.chat), 0.003, 4);
  // Kamera-Insel und Leiste unten, immer obenauf
  {
    const pill = (w, h, y, color, op) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(rrect(w, h, h / 2), 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
      m.position.set(0, y, 0.0045); m.renderOrder = 5; screen.add(m);
    };
    pill(0.29 * SW, 0.08 * SW, SH / 2 - 0.024 * SW - 0.04 * SW, 0x050608, 1);
    pill(0.36 * SW, 0.014 * SW, -SH / 2 + 0.022 * SW + 0.007 * SW, 0x16181d, 0.85);
  }

  // weicher Schatten hinter dem Handy, nur auf hellem Grund sichtbar
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);   // Ellipse: doppelt so hoch wie breit
    grd.addColorStop(0, 'rgba(0,0,0,0.5)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.22)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 2, 0, 0); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
  shadow.renderOrder = -1;
  scene.add(shadow);

  /* ---------- Bildschirm-Zustand t (0 bis 4) ---------- */
  function applyScreen(t) {
    const e = clamp(t), dk = ease(t - 1), ld = clamp(t - 2), nt = ease(t - 3);
    // die alte Seite hebt sich in Streifen vor das Glas und öffnet Lücken wie eine Explosionszeichnung;
    // dahinter setzt sich die neue Seite von oben nach unten zusammen, dann verblassen die alten Streifen
    const fade = reduce ? e : ss(0.45, 1, e);
    for (let i = 0; i < OLD; i++) {
      const m = oldStrips[i], k = reduce ? 0 : ease(clamp(e * 1.7 - i * 0.07));
      m.visible = fade < 0.999;
      m.position.set(m.userData.home.x + (i % 2 ? 1 : -1) * 0.012 * k, m.userData.home.y + (i - (OLD - 1) / 2) * 0.05 * k, m.userData.home.z + k * (0.1 + 0.022 * i));
      m.rotation.set(-0.16 * k, (i % 2 ? -1 : 1) * 0.07 * k, 0);
      m.material.uniforms.opacity.value = 1 - fade;
    }
    for (let i = 0; i < newStrips.length; i++) {
      const m = newStrips[i], a = reduce ? e : ease(clamp((e - 0.18 - 0.08 * i) / 0.38));
      m.visible = a > 0.001;
      m.position.set(m.userData.home.x, m.userData.home.y + (1 - a) * 0.03, m.userData.home.z);
      m.rotation.x = 0;
      m.material.uniforms.opacity.value = a;
      m.material.uniforms.w1.value = ld;
      m.material.uniforms.w2.value = nt;
    }
    dock.visible = dk > 0.001;
    dock.position.set(dock.userData.home.x, dock.userData.home.y - (1 - dk) * 0.05, dock.userData.home.z + 0.012 * dk);
    dock.material.uniforms.opacity.value = dk;
    chat.visible = nt > 0.001;
    const sc = 0.9 + 0.1 * nt;
    chat.scale.set(sc, sc, 1);
    chat.position.set(chat.userData.home.x + (1 - sc) * 0.12, chat.userData.home.y - (1 - sc) * 0.04, chat.userData.home.z + 0.03 * nt);
    chat.material.uniforms.opacity.value = nt;
  }

  /* ---------- Messen: Abschnitte, Schritte, Handy-Stellen (nur bei Größenänderung) ---------- */
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const nav = document.querySelector('.nav');
  const pricePhone = document.querySelector('.spot--price .phone');
  let vw = 0, vh = 0, ch = 0, navH = 72, wide = true, sections = [], keys = [], steps = [], lineAt = 0.56;

  const pageTop = el => el.getBoundingClientRect().top + window.scrollY;
  const POSE = {   // Drehung (x, y, z) und Bildschirm je Stelle; die y-Drehung zählt weiter, damit nichts zurückdreht
    hero: { r: [0.06, -0.42, 0.035], t: 4 },
    wandel: { r: [0.02, -0.16 - (reduce ? 0 : TAU), 0], t: null },
    turn: { r: [0.04, -0.35 - (reduce ? 0 : TAU), 0.01], t: 4, spin: reduce ? 0 : TAU },
    front: { r: [0.03, -0.14 - (reduce ? 0 : 2 * TAU), 0.01], t: 3 },
    price: { r: [0.02, 0 - (reduce ? 0 : 2 * TAU), 0], t: 3 },
    away: { r: [0.12, -1.05 - (reduce ? 0 : 2 * TAU), 0.18], t: 3 },
    close: { r: [0.05, -0.3 - (reduce ? 0 : 2 * TAU), 0.02], t: 4 },
  };

  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    vw = document.documentElement.clientWidth;
    ch = canvas.clientHeight || window.innerHeight;
    navH = nav ? nav.offsetHeight : 72;
    wide = matchMedia('(min-width: 900px)').matches;
    sections = [...document.querySelectorAll('main > section, footer.closing')].map(el => {
      const t = pageTop(el); return { el, id: el.id, light: el.getAttribute('data-theme') === 'light' ? 1 : 0, top: t, bottom: t + el.offsetHeight };
    });
    const sec = id => sections.find(s => s.id === id);
    const stage = document.querySelector('.wandel__stage');
    const under = (!wide && stage) ? navH + stage.offsetHeight : 0;
    lineAt = wide ? 0.56 : (under + (vh - under) * 0.5) / vh;
    steps = [...document.querySelectorAll('.step h3')].map(pageTop);

    // jede sichtbare Handy-Stelle: wo das HTML-Handy liegt, ob es angeheftet ist und wie lange
    keys = [];
    document.querySelectorAll('.phone[data-pose]').forEach(ph => {
      if (!ph.offsetParent && getComputedStyle(ph).position !== 'fixed') return;   // ausgeblendet (z. B. am Handy)
      const pose = ph.getAttribute('data-pose');
      const holder = ph.closest('.wandel__stage, .spot--sticky');
      let k;
      if (holder) {
        holder.style.position = 'static';
        const hr = holder.getBoundingClientRect(), pr = ph.getBoundingClientRect();
        holder.style.position = '';
        const cb = holder.parentElement.getBoundingClientRect();
        k = { sticky: true, N: hr.top + scrollY, Hs: hr.height, B: cb.bottom + scrollY, dy: pr.top - hr.top, x: pr.left + pr.width / 2, w: pr.width, h: pr.height };
      } else {
        const pr = ph.getBoundingClientRect();
        k = { sticky: false, N: pr.top + scrollY, Hs: pr.height, B: 0, dy: 0, x: pr.left + pr.width / 2, w: pr.width, h: pr.height };
        if (pose === 'hero' && !wide) {   // am Handy steht im Einstieg nur ein Handy, in der Mitte des Paars
          const st = ph.parentElement.getBoundingClientRect();
          k.x = st.left + st.width / 2;
        }
      }
      k.pose = pose;
      const s = sections.find(q => k.N >= q.top && k.N < q.bottom) || sections[0];
      k.section = s;
      if (pose === 'hero') { k.y0 = 0; k.y1 = 0; }
      else if (k.sticky) { k.y0 = s.top; k.y1 = Math.max(s.top, k.B - k.Hs - navH); }
      else { k.y0 = k.y1 = s.top; }
      keys.push(k);
    });
    // Fragen: das Handy tritt nach rechts aus dem Bild (nur wenn danach noch eine Stelle kommt)
    const fr = sec('fragen'), pr = keys.find(k => k.pose === 'price');
    if (fr && pr) keys.push({ pose: 'away', virtual: true, x: vw + pr.w * 0.9, w: pr.w, h: pr.h, y0: fr.top, y1: fr.top, section: fr });
    keys.sort((a, b) => a.y0 - b.y0);
  }

  // Lage einer Stelle im Bild bei Scrollposition y (angeheftete Stellen wie position: sticky)
  function rectAt(k, y) {
    if (k.virtual) return { x: k.x, y: vh * 0.52, h: k.h };
    let top = k.N;
    if (k.sticky) top = clamp(k.N, y + navH, Math.max(k.N, k.B - k.Hs));
    return { x: k.x, y: top - y + k.dy + k.h / 2, h: k.h };
  }

  // Bildschirm im Vorher/Nachher: jeder Schritt spielt seinen Übergang, während seine Überschrift zur Lese-Linie läuft
  function wandelT(y) {
    if (!steps.length) return 4;
    const line = y + vh * lineAt, run = vh * 0.32;
    let t = 0;
    for (let i = 1; i < steps.length; i++) t += clamp((line - (steps[i] - run)) / run);
    return t;
  }

  /* ---------- Ziel für Scrollposition y ---------- */
  const target = { x: 0, y: 0, h: 0, rx: 0, ry: 0, rz: 0, t: 4 };
  function aim(y) {
    if (!keys.length) return null;
    let i = 0;
    while (i < keys.length - 1 && y >= keys[i + 1].y0) i++;
    const a = keys[i], b = keys[i + 1];
    const poseOf = (k, yy) => {
      const P = POSE[k.pose], r = rectAt(k, yy);
      let ry = P.r[1];
      if (P.spin) ry -= P.spin * clamp((yy - k.y0) / Math.max(1, k.y1 - k.y0));
      let t = P.t === null ? wandelT(yy) : P.t;
      if (k.pose === 'price' && pricePhone && pricePhone.getAttribute('data-step') === '4') t = 4;
      return { x: r.x, y: r.y, h: r.h, rx: P.r[0], ry, rz: P.r[2], t };
    };
    const pa = poseOf(a, y);
    if (!b || y <= a.y1) return pa;
    const pb = poseOf(b, y);
    const w = ss(a.y1, b.y0, y);
    const out = {};
    for (const n of ['x', 'y', 'h', 'rx', 'ry', 'rz']) out[n] = mix(pa[n], pb[n], w);
    // Einstieg -> Vorher/Nachher: der Bildschirm wechselt, während die Rückseite zu sehen ist
    out.t = (a.pose === 'hero' && b.pose === 'wandel' && !reduce) ? (w < 0.5 ? pa.t : pb.t) : mix(pa.t, pb.t, w);
    // auf dem Weg hinaus nach rechts, wo es nichts mehr zu zeigen gibt, wird das Handy kleiner
    if (b.pose === 'away') out.h *= 1 - 0.15 * w;
    return out;
  }

  /* ---------- Größe ---------- */
  let lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (w !== lastW || h !== lastH)) {
      lastW = w; lastH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    measure();
    dirty = true;
  }

  /* ---------- Bild für Bild ---------- */
  const cur = { x: 0, y: 0, h: 0, rx: 0, ry: 0, rz: 0, t: 4, light: 0 };
  let first = true, dirty = true, last = performance.now(), time = 0, onScreen = true, moving = true;
  let lastActive = performance.now();   // das leichte Schweben läuft nur kurz nach dem Scrollen, dann steht das Handy
  const worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000); last = now;
    if (!reduce) time += dt;
    const y = window.scrollY;
    const tg = aim(y);
    if (!tg) return;
    const k = first || reduce ? 1 : 1 - Math.pow(0.0006, dt);
    cur.x = tg.x; cur.y = tg.y; cur.h = tg.h;   // Lage direkt: das Handy bleibt am Layout
    for (const n of ['rx', 'ry', 'rz', 't']) cur[n] += (tg[n] - cur[n]) * k;
    // heller oder dunkler Grund hinter dem Handy
    const page = y + cur.y, s = sections.find(q => page >= q.top && page < q.bottom);
    const light = s ? s.light : 0;
    cur.light += (light - cur.light) * (first ? 1 : 1 - Math.pow(0.02, dt));

    const unit = worldH / (ch || vh);
    const sc = cur.h * unit / H;
    const amp = reduce ? 0 : clamp(1 - (now - lastActive - 2500) / 1500);
    const bob = Math.sin(time * 0.9) * 0.006 * amp;
    phone.scale.setScalar(sc);
    phone.position.set((cur.x - vw / 2) * unit, (ch / 2 - cur.y) * unit + bob * sc, 0);
    phone.rotation.set(cur.rx + Math.sin(time * 0.6) * 0.015 * amp, cur.ry + Math.sin(time * 0.45) * 0.03 * amp, cur.rz);
    moving = amp > 0 || Math.abs(tg.rx - cur.rx) + Math.abs(tg.ry - cur.ry) + Math.abs(tg.rz - cur.rz) + Math.abs(tg.t - cur.t) > 0.0005;
    applyScreen(cur.t);

    const facing = Math.abs(Math.cos(cur.ry));
    shadow.position.set(phone.position.x + 0.05 * sc, phone.position.y - 0.05 * sc, -0.6 * sc);
    shadow.scale.set(sc * (0.25 + 0.55 * facing), sc * 1.12, 1);
    shadow.material.opacity = 0.32 * cur.light;

    // außerhalb des Bildes nichts zeichnen
    const half = cur.h * 0.7;
    onScreen = cur.x + half > -40 && cur.x - half < vw + 40 && cur.y + half > -40 && cur.y - half < (ch || vh) + 40;
    if (onScreen || first) renderer.render(scene, camera);
    else renderer.clear();
    first = false;
  }

  let raf = 0;
  function loop(now) {
    raf = 0;
    frame(now);
    // weiterzeichnen, solange sich etwas bewegt (Zeit läuft, Scrollen, weiches Folgen)
    // gezeichnet wird, solange sich etwas bewegt; steht alles still, ruht die Schleife bis zum nächsten Scrollen
    if (!document.hidden && ((onScreen && moving) || dirty)) { dirty = false; raf = requestAnimationFrame(loop); }
  }
  function kick() { dirty = true; lastActive = performance.now(); if (!raf && !document.hidden) raf = requestAnimationFrame(loop); }
  window.addEventListener('scroll', kick, { passive: true });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); kick(); }, 120); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  if (pricePhone) new MutationObserver(kick).observe(pricePhone, { attributes: true, attributeFilter: ['data-step'] });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); fail(); });

  /* ---------- Start: messen, Bilder hochladen, Programme übersetzen, dann einblenden ---------- */
  resize();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  resize();
  tex.forEach(t => renderer.initTexture(t));
  shadowTex.needsUpdate = true; renderer.initTexture(shadowTex);
  applyScreen(4);
  // einmal mit Fehlerprüfung übersetzen und zeichnen: lehnt die Grafikkarte einen Shader ab, bleiben die HTML-Handys
  let shaderFailed = false;
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = () => { shaderFailed = true; };
  renderer.compile(scene, camera);
  frame(performance.now());
  renderer.debug.checkShaderErrors = /[?&]debug\b/.test(location.search);
  if (shaderFailed) throw new Error('Shader abgelehnt');
  root.classList.add('is-3d');
  document.dispatchEvent(new Event('scene3d:ready'));
  window.addEventListener('load', () => { resize(); kick(); });
  kick();
  window.__phone3d = {
    set: y => { window.scrollTo(0, y); kick(); },
    keys: () => keys.map(k => ({ pose: k.pose, y0: Math.round(k.y0), y1: Math.round(k.y1), N: Math.round(k.N || 0), B: Math.round(k.B || 0), Hs: Math.round(k.Hs || 0), h: Math.round(k.h) })),
    state: () => ({ x: Math.round(cur.x), y: Math.round(cur.y), h: Math.round(cur.h), ry: +cur.ry.toFixed(2), t: +cur.t.toFixed(2), onScreen, vw, vh, ch }),
  };
}
