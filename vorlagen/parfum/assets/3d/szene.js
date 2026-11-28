/* Die Szene hinter der Seite: ein Flakon, ein Goldband, Goldstaub, Lichtkegel und Rauch, später das
   Goldbecken. Ein einziger Wert S (aus der Scrollposition, siehe main.js) steuert alles:
     0 Einstieg · 1 Akkord · 2 Noten · 3 Kollektion oben · 4 Kollektion Mitte · 5 Maison · 6 Bestellen
     7 Fußzeile · 8 Seitenende
   Zwischen den Stellen wird weich übergeblendet. Der Flakon schwebt rechts im Licht, steigt bei der
   Kollektion auf, fällt hinter den Karten nach unten und taucht bei der Maison ins Becken (Krone,
   Ringwellen, Spiegelung). Beim Bestellen versinkt er bis zum Verschluss. Prüfen: window.__szene.set(S). */
import * as THREE from './three.module.min.js';
import { createBloom } from './bloom.js';
import { createGround } from './grund.js';
import { createBildFlakon, HERO, frameIndex } from './bildflakon.js';
import { createRibbon, createDrops, createDust, createCrown, crownTip } from './gold.js';
import { createPool } from './becken.js';
import { compileAhead } from './gpu-upload.js';
import { buildEnv, addLights } from './umgebung.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const clamp01 = x => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lin = (a, b, x) => clamp01((x - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
/* Weiche Kurve durch Stützstellen [[S, Wert, Wert, …], …] (monoton kubisch, wie PCHIP): Die Bewegung läuft
   durch die Stützstellen hindurch, ohne dort anzuhalten und ohne Überschwingen. Am Anfang und Ende in Ruhe;
   wo sich ein Wert umkehrt oder gleich bleibt, steht er dort kurz. */
function spline(keys) {
  const n = keys.length, m = keys[0].length - 1, xs = keys.map(k => k[0]);
  const T = [];
  for (let c = 1; c <= m; c++) {
    const ys = keys.map(k => k[c]), d = [], t = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      t[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    T.push(t);
  }
  const out = new Array(m);
  return (s) => {
    if (s <= xs[0]) { for (let c = 0; c < m; c++) out[c] = keys[0][c + 1]; return out; }
    if (s >= xs[n - 1]) { for (let c = 0; c < m; c++) out[c] = keys[n - 1][c + 1]; return out; }
    let i = 0;
    while (s > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (s - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    const a0 = 2 * u3 - 3 * u2 + 1, a1 = u3 - 2 * u2 + u, b0 = -2 * u3 + 3 * u2, b1 = u3 - u2;
    for (let c = 0; c < m; c++) out[c] = a0 * keys[i][c + 1] + a1 * h * T[c][i] + b0 * keys[i + 1][c + 1] + b1 * h * T[c][i + 1];
    return out;
  };
}
const rand = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

const POOL_Y = -9;          // Höhe der Beckenoberfläche
const AIR_CAM = 9.5;        // Abstand der Kamera im Einstieg
const START_YAW = -11;      // Drehung des Flakons im Einstieg (Grad), wie im Video: Vorderseite leicht zum Text

/* Bahn des Goldbands um den Flakon (Flakon-Mitte = 0, Höhe des Flakons etwa 1,45). */
const BAND_A = [
  [-3.3, -1.95, 0.4], [-2.55, -1.6, 0.65], [-1.75, -1.15, 0.85], [-0.95, -0.72, 0.9],
  [-0.2, -0.45, 0.78], [0.55, -0.22, 0.5], [0.86, 0.06, -0.1], [0.5, 0.3, -0.62],
  [-0.25, 0.48, -0.7], [-0.8, 0.68, -0.12], [-0.58, 0.95, 0.5], [0.15, 1.1, 0.62],
  [0.85, 1.35, 0.2], [1.3, 1.78, -0.22], [1.6, 2.3, -0.45], [1.8, 2.85, -0.55]
];
/* Spritzer über dem Becken (rechts oben) und in der Fußzeile, im Raum des Beckens. */
const BAND_B = [
  [0.55, 1.35, -0.4], [1.05, 1.62, -0.35], [1.55, 1.78, -0.55], [2.05, 1.7, -0.8],
  [2.45, 1.95, -1.0], [2.85, 2.45, -1.15], [3.3, 2.9, -1.3], [3.9, 3.15, -1.5]
];

export async function start({ canvas, stage, reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.debug.checkShaderErrors = DEBUG;
  renderer.setClearColor(0x000000, 1);
  let phone = matchMedia('(max-width: 760px)').matches;
  // Volle Auflösung des Bildschirms: Handy bis 3-fach, Computer bis 2-fach (4K-Bildschirm = 4K).
  // Kantenglättung (4-fach) dort, wo die Pixel groß sind und der Speicher reicht.
  const dpr = Math.min(window.devicePixelRatio || 1, phone ? 3 : 2);
  renderer.setPixelRatio(dpr);
  const msaa = dpr < 1.5 && innerWidth * innerHeight * dpr * dpr <= 4.2e6 && renderer.extensions.has('EXT_color_buffer_float') ? 4 : 0;
  const bloom = createBloom(renderer, { levels: phone ? 3 : 4, scale: 0.5, msaa, strength: 0.75, threshold: 0.7 });
  // Rauch und Lichtkegel: etwa 1,25 Pixel je Bildschirmpunkt (normaler Bildschirm 90 %, Retina 62 %, Handy 50 %;
  // vorher überall 50 %). Beide sind weich, feiner sieht man nicht, es kostet nur Rechenzeit.
  const ground = createGround(renderer, { scale: Math.min(0.9, Math.max(0.5, 1.25 / dpr)) });

  const scene = new THREE.Scene();
  scene.environment = buildEnv(renderer);
  scene.add(ground.mesh);
  addLights(scene);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  // Flakon: gerenderte Drehfolge (Blender), 25 Winkel. Jedes Gerät lädt die kleinste Bildgröße, die für die
  // größte Darstellung des Flakons reicht: 700, 1400 (Handys mit hoher Pixeldichte, Retina, 4K) oder
  // 2100 Pixel hoch (5K, große 4K-Bildschirme). Am Handy jedes zweite Bild (5°), wegen des Grafikspeichers.
  const needPx = dpr * innerHeight * (innerWidth < innerHeight * 0.9 ? 0.3 : 0.43) * 1.3;
  const tier = needPx > 1400 ? 2100 : needPx > 700 ? 1400 : 700;
  const frameUrl = (i) => `assets/img/flakon-dreh-${String(i).padStart(2, '0')}-${tier}.webp`;
  const hero = await createBildFlakon(frameUrl, { start: Math.round(frameIndex(START_YAW)), clipY: POOL_Y, stride: phone ? 2 : 1 });
  const bottle = new THREE.Group();
  bottle.rotation.order = 'YXZ';
  bottle.add(hero.mesh);
  scene.add(bottle);
  const H = HERO.total;                        // ganze Höhe mit Verschluss
  const baseY = -HERO.h / 2;                   // Unterkante des Glases im Flakon-Raum
  const MIRROR = 1;
  hero.mesh.layers.enable(MIRROR);
  renderer.localClippingEnabled = true;

  /* Goldband, Tropfen und Staub um den schwebenden Flakon */
  const air = new THREE.Group();
  scene.add(air);
  const profA = t => sm(0, 0.05, t) * (1 - 0.92 * sm(0.86, 1, t)) * (0.9 + 0.24 * Math.sin(t * 19 + 0.5) * Math.sin(t * 6.1)) * (1 + 0.55 * (1 - sm(0, 0.22, t)));
  const bandA = createRibbon(BAND_A, { segs: phone ? 420 : 720, radial: phone ? 18 : 28, width: 0.125, thick: 0.08, twist: 2.4, prof: profA });
  air.add(bandA.mesh);

  const dropsA = [];
  for (let i = 0; i < 46; i++) {           // Spritzer am Anfang des Bands
    const t = rand() * 0.22;
    const c = bandA.curve.getPointAt(t);
    const r = 0.12 + rand() * 0.55 * (1 - t * 2);
    const a = rand() * Math.PI * 2;
    dropsA.push({ p: [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.8 + 0.05, c.z + (rand() - 0.5) * 0.5], s: 0.006 + rand() * rand() * 0.032, ph: rand() * 6.28, sp: 0.5 + rand() });
  }
  for (let i = 0; i < 12; i++) {           // feine Tropfen am oberen Ende
    const t = 0.8 + rand() * 0.2;
    const c = bandA.curve.getPointAt(t);
    dropsA.push({ p: [c.x + (rand() - 0.5) * 0.5, c.y + (rand() - 0.5) * 0.4, c.z + (rand() - 0.5) * 0.4], s: 0.006 + rand() * 0.016, ph: rand() * 6.28, sp: 0.5 + rand() });
  }
  for (let i = 0; i < 10; i++) {           // größere schwebende Tropfen um den Flakon
    const a = rand() * Math.PI * 2, r = 1.0 + rand() * 1.2;
    dropsA.push({ p: [Math.cos(a) * r * 1.2, -0.8 + rand() * 2.6, Math.sin(a) * r * 0.6], s: 0.022 + rand() * 0.03, ph: rand() * 6.28, sp: 0.3 + rand() * 0.5 });
  }
  const dropA = createDrops(dropsA);
  air.add(dropA.mesh);

  const dust = [];
  const nSpray = phone ? 800 : 1600, nAir = phone ? 380 : 700, nBeam = phone ? 160 : 320;
  for (let i = 0; i < nSpray; i++) {
    const t = rand() * 0.3;
    const c = bandA.curve.getPointAt(t);
    const r = Math.pow(rand(), 1.6) * (0.9 + (0.3 - t) * 3.0);
    const a = rand() * Math.PI * 2, b = (rand() - 0.5) * Math.PI;
    dust.push({ p: [c.x + Math.cos(a) * Math.cos(b) * r * 1.3, c.y + Math.sin(b) * r * 0.75 + 0.1, c.z + Math.sin(a) * Math.cos(b) * r * 0.7], ph: rand(), sp: rand(), sz: 0.06 + rand() * rand() * 0.4 });
  }
  for (let i = 0; i < nAir; i++) dust.push({ p: [(rand() - 0.62) * 8, (rand() - 0.5) * 6, -3.5 + rand() * 5], ph: rand(), sp: rand(), sz: 0.06 + rand() * rand() * 0.3 });
  for (let i = 0; i < nBeam; i++) {
    const k = rand();
    dust.push({ p: [mix(1.7, 0.3, k) + (rand() - 0.5) * 0.9 * (1.2 - k), mix(2.3, 0.4, k) + (rand() - 0.5) * 0.7 * (1.2 - k), -0.8 + rand() * 1.4], ph: rand(), sp: rand(), sz: 0.08 + rand() * 0.2 });
  }
  const dustA = createDust(dust);
  dustA.u.uBright.value = 1.9;
  air.add(dustA.points);

  /* Becken mit Krone, Spritzer und Staub */
  const pool = createPool({ R: 4.2 });
  const poolG = new THREE.Group();
  poolG.position.y = POOL_Y;
  poolG.add(pool.group);
  scene.add(poolG);
  const crown = createCrown({ spikes: 15 });
  poolG.add(crown.mesh);
  crown.mesh.layers.enable(MIRROR);
  const tipList = Array.from({ length: 15 }, (_, i) => ({ i, s: 0.035 }));
  const tips = createDrops(tipList);
  tips.mesh.layers.enable(MIRROR);
  poolG.add(tips.mesh);
  const profB = t => sm(0, 0.12, t) * (1 - 0.9 * sm(0.75, 1, t)) * (0.85 + 0.3 * Math.sin(t * 13 + 1.0));
  const bandB = createRibbon(BAND_B, { segs: phone ? 200 : 320, radial: phone ? 14 : 22, width: 0.1, thick: 0.05, twist: 1.6, prof: profB });
  bandB.mesh.layers.enable(MIRROR);
  poolG.add(bandB.mesh);
  const fly = [];
  for (let i = 0; i < 26; i++) fly.push({ a: rand() * Math.PI * 2, r: 0.5 + rand() * 0.6, h: 0.4 + rand() * 1.4, s: 0.012 + rand() * 0.028, ph: rand(), sp: 0.6 + rand() * 0.8 });
  const flyDrops = createDrops(fly);
  flyDrops.mesh.layers.enable(MIRROR);
  poolG.add(flyDrops.mesh);
  const pdust = [];
  for (let i = 0; i < (phone ? 380 : 700); i++) pdust.push({ p: [(rand() - 0.5) * 12, 0.15 + Math.pow(rand(), 1.5) * 5.5, -5 + rand() * 6.5], ph: rand(), sp: rand(), sz: 0.05 + rand() * rand() * 0.26 });
  const dustP = createDust(pdust);
  poolG.add(dustP.points);

  /* Spiegelung im Becken: eigene Kamera, gespiegelt an der Oberfläche, nur Ebene MIRROR. */
  const reflRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const mirrorCam = new THREE.PerspectiveCamera();
  mirrorCam.layers.set(MIRROR);
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -POOL_Y);
  const vN = new THREE.Vector3(0, 1, 0), vP = new THREE.Vector3(), vC = new THREE.Vector3(), vL = new THREE.Vector3(), vT = new THREE.Vector3(), mR = new THREE.Matrix4(), vV = new THREE.Vector3();
  pool.u.uRefl.value = reflRT.texture;
  function renderMirror() {
    vP.set(0, POOL_Y, 0);
    vC.setFromMatrixPosition(camera.matrixWorld);
    vV.subVectors(vP, vC);
    if (vV.dot(vN) > 0) { pool.u.uReflOn.value = 0; return; }
    vV.reflect(vN).negate().add(vP);
    mR.extractRotation(camera.matrixWorld);
    vL.set(0, 0, -1).applyMatrix4(mR).add(vC);
    vT.subVectors(vP, vL).reflect(vN).negate().add(vP);
    mirrorCam.position.copy(vV);
    mirrorCam.up.set(0, 1, 0).applyMatrix4(mR).reflect(vN);
    mirrorCam.lookAt(vT);
    mirrorCam.near = camera.near; mirrorCam.far = camera.far;
    mirrorCam.updateMatrixWorld();
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    pool.u.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
    renderer.setRenderTarget(reflRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.clippingPlanes = [clip];
    renderer.render(scene, mirrorCam);
    renderer.clippingPlanes = [];
    renderer.setClearColor(0x000000, 1);
    pool.u.uReflOn.value = 1;
  }

  /* ---------- Größe und Anordnung ---------- */
  let W = 1, Hh = 1, aspect = 1;
  const tanH = Math.tan(THREE.MathUtils.degToRad(15));
  const L = {};
  function layout() {
    W = canvas.clientWidth || innerWidth; Hh = canvas.clientHeight || innerHeight;
    aspect = W / Hh;
    phone = W <= 760;
    renderer.setSize(W, Hh, false);
    bloom.setSize();
    fitTargets();
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const portrait = aspect < 0.9;
    const hh = tanH * AIR_CAM;                                   // halbe Bildhöhe in der Flakon-Ebene
    const frac = portrait ? 0.3 : aspect < 1.25 ? 0.34 : 0.43;    // Anteil der Bildhöhe
    L.rib = portrait ? 0.8 : 1;
    L.sAir = frac * 2 * hh / H;
    // Bildschirmweg des Flakons je Abschnitt: [S, x, y (NDC), Abstand zur Kamera, Größe, Neigung]
    // Drehung des Flakons je Abschnitt: [S, Grad]; positiv = Vorderseite nach rechts. Wie im Video: in der Luft
    // dreht er sich langsam weiter zum Text, beim Fallen hinter den Karten zurück, im Becken zeigt er nach rechts.
    L.yaw = [[0, START_YAW], [1, -18], [2, -24], [2.8, -28], [3.1, -24], [3.8, 0], [4.25, 18], [4.55, 26], [5.0, 28]];
    L.path = portrait ? [
      [0, 0.02, 0.26, AIR_CAM, 1, -0.06], [1, 0.1, -0.5, AIR_CAM, 0.92, -0.06], [2, 0.14, -0.53, AIR_CAM, 0.92, -0.06],
      [2.5, 0.14, -0.53, AIR_CAM, 0.92, -0.06], [3.1, 0.34, 0.5, AIR_CAM, 1, -0.82],
      [3.8, -0.12, 0.14, 8.6, 1.15, -0.35], [4.25, 0.08, -0.2, 8.2, 1, 0.22]
    ] : [
      [0, 0.5, -0.07, AIR_CAM, 1, -0.06], [1, 0.5, -0.05, AIR_CAM, 1, -0.06], [2, 0.52, -0.03, AIR_CAM, 1, -0.06],
      [2.5, 0.52, -0.03, AIR_CAM, 1, -0.06], [3.1, 0.62, 0.46, AIR_CAM, 1, -0.82],
      [3.8, 0.05, 0.1, 8.6, 1.15, -0.35], [4.25, 0.24, -0.16, 8.2, 1, 0.22]
    ];
    L.pathAt = spline(L.path);
    L.yawAt = spline(L.yaw);
    // Becken: Kamera näher, Flakon rechts der Mitte (am Handy mittig)
    const pd = 7.2;
    const phw = tanH * pd * aspect;
    L.poolX = portrait ? 0 : 0.34 * phw;
    L.sPool = portrait ? 0.62 : aspect < 1.25 ? 0.7 : 0.82;
    L.poolCam = portrait ? [0, POOL_Y + 2.4, 8.6] : [0, POOL_Y + 1.65, pd];
    L.poolLook = portrait ? [0, POOL_Y + 1.5, 0] : [0, POOL_Y + 0.95, 0];
    pool.group.position.x = L.poolX;
    bandB.mesh.position.x = L.poolX - 0.4;
  }
  // Grund, Spiegelung und Punktgrößen folgen der Auflösung der Szene (auch wenn der Regler sie senkt)
  function fitTargets() {
    ground.setSize(bloom.width, bloom.height);
    reflRT.setSize(Math.max(2, Math.round(bloom.width * 0.75)), Math.max(2, Math.round(bloom.height * 0.75)));
    dustA.u.uPx.value = bloom.pixelRatio * (phone ? 0.85 : 1);
    dustP.u.uPx.value = bloom.pixelRatio * (phone ? 0.85 : 1);
  }

  /* ---------- Choreografie ---------- */
  const tmp = new THREE.Vector3(), look = new THREE.Vector3(), camPos = new THREE.Vector3();
  const glowNdc = new THREE.Vector3(), airV = new THREE.Vector3(), tipV = new THREE.Vector3();   // je Bild wiederverwendet (kein Aufräumen nötig)
  let S = 0, intro = 0;
  const v3 = (a) => tmp.set(a[0], a[1], a[2]);

  function pose(s, t) {
    // Kamera: Einstieg → Becken (3,3 bis 4,6) → nach oben in die Fußzeile (6,5 bis 7,6)
    const kc = sm(3.3, 4.6, s);
    const up = sm(6.5, 7.7, s);
    camPos.set(0, 0, AIR_CAM).lerp(v3(L.poolCam), kc);
    look.set(0, 0, 0).lerp(v3(L.poolLook), kc);
    camPos.y += up * 2.3; look.y += up * 3.3; camPos.z += up * 0.6;
    camera.position.copy(camPos);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    // Bildschirmweg des Flakons bis kurz vor dem Eintauchen (siehe L.path): schwebt rechts im Licht,
    // steigt bei der Kollektion auf, fällt groß und gedimmt hinter den Karten herunter
    const [nx, ny, dd, sf, rz0] = L.pathAt(s);
    let rz = rz0;
    const float = Math.sin(t * 0.7) * 0.05 * (1 - sm(3.3, 3.8, s));
    const airPt = airV.set(nx * tanH * aspect * dd, ny * tanH * dd, -dd).applyMatrix4(camera.matrixWorld);
    const sx = airPt.x, sy = airPt.y + float + (1 - intro) * -0.18, sz = airPt.z;
    // leichtes Schaukeln in der Luft, im Becken fast still
    rz += Math.sin(t * 0.45) * 0.025 * (1 - sm(4.3, 4.6, s));
    let sc = L.sAir * sf;

    // Eintauchen (4,55), Aufrichten, Versinken
    const IMP = 4.55;
    const surf = POOL_Y;
    let base;                 // Höhe der Unterkante über der Oberfläche
    if (s < IMP) base = mix(0.9, 0.05, sm(4.25, IMP, s));
    else if (s < 5.0) base = mix(0.05, -0.22, easeOut(lin(IMP, 5.0, s)));
    else if (s < 6.0) base = mix(-0.22, -0.48, sm(5.0, 6.0, s));
    else base = mix(-0.48, -0.95, sm(6.0, 6.6, s)) - sm(6.8, 7.8, s) * 0.4;
    const sP = L.sPool;
    const inPool = [L.poolX, surf + base - baseY * sP, 0];
    const kp = sm(4.25, IMP, s);
    const pos = [mix(sx, inPool[0], kp), mix(sy, inPool[1], kp), mix(sz, inPool[2], kp)];
    if (s > 4.25) {
      sc = mix(sc, sP, kp);
      rz = s < IMP ? mix(rz, 0.42, kp) : mix(0.42, 0.05, easeOut(lin(IMP, 5.05, s)));
    }
    bottle.position.set(pos[0], pos[1], pos[2]);
    // Drehung aus der Bildfolge (beim Scrollen, dazu ein langsames Pendeln); die Fläche selbst
    // dreht sich nur um die Hochachse zur Kamera, geneigt wird um die Blickachse
    hero.setYaw(L.yawAt(s)[0] + Math.sin(t * 0.33) * mix(3.5, 1.2, sm(4.25, 4.6, s)));
    bottle.rotation.set(0, Math.atan2(camera.position.x - pos[0], camera.position.z - pos[2]), rz);
    bottle.scale.setScalar(sc);

    // Band, Tropfen und Staub folgen dem Flakon, bis das Band beim Aufsteigen abfließt
    air.position.copy(airPt);
    air.scale.setScalar(L.sAir * L.rib);
    air.rotation.y = -0.15 + 0.08 * Math.min(s, 3);
    bandA.u.uReveal.value = 1.05 * easeOut(intro * 1.15);
    bandA.u.uStart.value = sm(2.35, 3.05, s) * 1.06;
    air.visible = s < 3.4;

    // Becken
    const pv = s > 3.55;
    poolG.visible = pv;
    const cx = bottle.position.x - L.poolX;
    pool.u.uCenter.value.set(cx, bottle.position.z);
    const ch = s < IMP ? 0 : s < 4.78 ? easeOut(lin(IMP, 4.78, s)) * 0.62 : mix(0.62, 0.46, lin(4.78, 5.7, s)) * (1 - sm(5.75, 6.15, s));
    crown.u.uH.value = ch * sP;
    crown.u.uR0.value = 0.52 * sP;
    crown.u.uFlare.value = 0.75;
    crown.mesh.position.set(bottle.position.x, 0.0, bottle.position.z);
    crown.mesh.visible = ch > 0.01;
    tips.mesh.visible = crown.mesh.visible;
    pool.u.uRipple.value = s < IMP ? 0 : 0.5 * sm(IMP, 4.9, s) + 0.6 * sm(5.4, 6.1, s) - 0.3 * sm(6.6, 7.4, s);
    pool.u.uGlow.value = 0.6 + 0.6 * sm(IMP, 4.8, s);
    bandB.u.uReveal.value = 1.05 * sm(4.45, 5.25, s);
    bandB.mesh.visible = s > 4.4;
    flyDrops.mesh.visible = s > IMP && s < 6.4;

    // Grund und Belichtung
    const coll = sm(2.65, 3.0, s) * (1 - sm(4.3, 4.6, s));
    const foot = sm(6.9, 7.8, s);
    bloom.u.exposure.value = (1 - coll * 0.6) * (1 - foot * 0.42) * (0.25 + 0.75 * easeOut(intro * 1.4));
    glowNdc.copy(bottle.position); glowNdc.y += (H * 0.15) * sc; glowNdc.project(camera);
    const gu = ground.u;
    gu.uGlowPos.value.set(glowNdc.x * 0.5 + 0.5, glowNdc.y * 0.5 + 0.5);
    gu.uGlow.value = 1 - 0.35 * kc;
    gu.uBeam.value = mix(1, 0.45, sm(2.5, 3.1, s)) * (1 - foot * 0.8);
    gu.uSmoke.value = mix(1, 0.72, kc);
    gu.uSmokeY.value = mix(phone ? 0.5 : 0.36, 0.86, kc);
    gu.uSmokeW.value = mix(0.2, 0.17, kc);
    gu.uSmokeSide.value = mix(0.7, 0.0, kc);
    gu.uPar.value = -kc * 0.35 + up * 0.55;          // Rauch zieht mit der Kamera mit (Tiefe)
    gu.uSmokeCol.value.setRGB(mix(0.34, 0.4, kc), mix(0.065, 0.05, kc), mix(0.012, 0.012, kc));
  }

  function animate(t) {
    const tt = reduced ? 8.0 : t;
    bandA.u.uTime.value = tt; bandB.u.uTime.value = tt + 3.0; crown.u.uTime.value = tt;
    dropA.u.uTime.value = tt; tips.u.uTime.value = tt; flyDrops.u.uTime.value = tt;
    dustA.u.uTime.value = tt; dustP.u.uTime.value = tt;
    ground.u.uTime.value = tt; pool.u.uTime.value = tt;
    bloom.u.time.value = t;
    if (air.visible) dropA.update(tt, (d, i, p) => {
      p.set(d.p[0] + Math.sin(tt * 0.5 * d.sp + d.ph) * 0.05, d.p[1] + Math.cos(tt * 0.42 * d.sp + d.ph) * 0.06, d.p[2]);
      return d.s;
    });
    if (tips.mesh.visible) {
      const tv = tipV;
      tips.update(tt, (d, i, p) => {
        const th = i / 15 * Math.PI * 2;
        crownTip(th, crown.u, tv);
        p.set(tv.x + crown.mesh.position.x, tv.y + 0.045 * (1 + Math.sin(tt * 2 + i)), tv.z + crown.mesh.position.z);
        return 0.028 * Math.min(1, crown.u.uH.value * 3);
      });
    }
    if (flyDrops.mesh.visible) {
      const ph = lin(4.55, 6.3, S);
      flyDrops.update(tt, (d, i, p) => {
        const k = (ph * 1.6 + d.ph) % 1;
        const r = d.r * (0.6 + k * 0.9) * L.sPool;
        const y = (d.h * Math.sin(k * Math.PI)) * L.sPool * 0.9;
        p.set(bottle.position.x + Math.cos(d.a) * r, y + 0.02, bottle.position.z + Math.sin(d.a) * r * 0.7);
        return d.s * Math.sin(k * Math.PI) * L.sPool;
      });
    }
  }

  /* ---------- Laden ohne Ruckler ---------- */
  layout();
  bloom.warm();
  ground.alloc();
  renderer.initRenderTarget(reflRT);
  pose(0, 0); animate(0);
  poolG.visible = true; air.visible = true;
  await compileAhead(renderer, scene, camera).catch(() => {});
  // Lehnt die Grafikkarte ein Programm ab, gilt die Seite als ohne 3D (Standbild statt schwarzer Fläche).
  // Geprüft nach dem Vorab-Kompilieren und noch einmal nach dem ersten Bild (dann sind alle Programme gebaut).
  const gl = renderer.getContext();
  const broken = () => gl.isContextLost() || renderer.info.programs.some(p => p.program && !gl.getProgramParameter(p.program, gl.LINK_STATUS));
  ground.render();
  renderer.setRenderTarget(null);
  if (broken()) throw new Error('WebGL-Programm abgelehnt');
  const probe = new THREE.WebGLRenderTarget(4, 4);
  renderer.setRenderTarget(probe); renderer.render(scene, camera); renderer.setRenderTarget(null);
  probe.dispose();

  /* ---------- Bildtakt, Regler für die Auflösung ---------- */
  const fpsBox = Q.has('fps') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px monospace;color:#fff;background:#000a;padding:4px 6px' }) : null;
  const gov = Q.get('gov') !== '0';
  // Stufen der Szenen-Auflösung in feinen Schritten (kein sichtbarer Sprung). Auf Bildschirmen mit hoher
  // Pixeldichte darf sie bis 62 % sinken (dann immer noch schärfer als ein normaler Bildschirm), sonst bis 72 %.
  const levels = [1, 0.88, 0.78, 0.7, 0.62].filter(q => q >= (dpr >= 1.5 ? 0.62 : 0.72) - 1e-6);
  let lvl = 0, acc = 0, cnt = 0, good = 0, need = 4, last = performance.now(), running = true, needs = true, paused = false, clock = 0, frames = 0;
  let lastS = -1, Sv = 0, firstS = true;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) clock += dt;
    const t = clock;
    intro = reduced ? 1 : Math.min(1, t / 2.4);
    // S folgt der Scrollposition weich (zwei gedämpfte Stufen, unabhängig von der Bildrate): Mausrad-Rasten
    // und Sprünge werden zu einer ruhigen Fahrt. Ein Sprung (Anker-Link) spielt höchstens 1,6 Szenen ab.
    const target = override ?? stage();
    if (reduced || firstS) { S = Sv = target; firstS = false; }
    else {
      if (target - S > 1.6) { S = target - 1.6; Sv = Math.max(Sv, S); }
      else if (S - target > 1.6) { S = target + 1.6; Sv = Math.min(Sv, S); }
      const k = 1 - Math.exp(-dt * 16);
      Sv += (target - Sv) * k;
      S += (Sv - S) * k;
      if (Math.abs(target - S) < 2e-4 && Math.abs(target - Sv) < 2e-4) S = Sv = target;
    }
    hero.step();                 // nächster Streifen der nachladenden Flakon-Bilder
    if ((reduced || paused) && Math.abs(S - lastS) < 1e-5 && !needs) return;
    lastS = S; needs = false;
    pose(S, reduced ? 8 : t);
    animate(t);
    ground.render();
    if (poolG.visible) renderMirror();
    renderer.setRenderTarget(null);
    bloom.render(scene, camera);
    if (++frames === 2 && broken()) { running = false; document.documentElement.classList.add('no-3d'); return; }
    // Regler: kommen Bilder zu spät, sinkt die Auflösung der Szene stufenweise
    if (gov && !reduced) {
      acc += dt; cnt++;
      if (cnt >= 40) {
        const avg = acc / cnt;
        // unter 50 Bildern pro Sekunde eine Stufe herunter; zurück erst nach mehreren ruhigen Abschnitten,
        // und nach jedem Rückfall länger warten (kein Hin und Her)
        if (avg > 1 / 50 && lvl < levels.length - 1) { lvl++; bloom.setQuality(levels[lvl]); fitTargets(); if (good < 0) need = Math.min(need * 2, 64); good = 0; }
        else if (avg < 1 / 57) { if (++good >= need && lvl > 0) { lvl--; bloom.setQuality(levels[lvl]); fitTargets(); good = -1; } }
        else if (good > 0) good = 0;
        if (fpsBox) fpsBox.textContent = `${(1 / avg).toFixed(0)} fps · Stufe ${levels[lvl]} · S ${S.toFixed(2)}`;
        acc = 0; cnt = 0;
      }
    }
  }
  let override = null;
  requestAnimationFrame(frame);
  // übrige Bilder der Drehfolge erst nach dem Laden der Seite holen
  const rest = () => setTimeout(() => hero.loadRest(renderer, () => { needs = true; }), 300);
  if (document.readyState === 'complete') rest(); else addEventListener('load', rest, { once: true });

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; document.documentElement.classList.add('no-3d'); });
  let rz = 0;
  // Die Leinwand ist so hoch wie der Bildschirm bei eingeklappter Adressleiste: deren Ein- und Ausfahren ändert nichts
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (canvas.clientWidth !== W || canvas.clientHeight !== Hh) layout(); needs = true; }, 120); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });
  addEventListener('scroll', () => { needs = true; }, { passive: true });

  window.__szene = {
    set(s) { override = s; firstS = true; needs = true; },      // springt sofort (zum Prüfen)
    pause(on) { paused = !!on; needs = true; },
    free() { override = null; needs = true; },
    get S() { return S; },
    renderer
  };
  return window.__szene;
}
