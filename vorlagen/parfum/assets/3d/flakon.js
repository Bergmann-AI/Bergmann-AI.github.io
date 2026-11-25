/* Der Flakon: dickes, facettiertes Kristallglas (Lichtbrechung über transmission), darin die Füllung
   (eigener Shader: dunkel in der Tiefe, glühend an den Kanten und zum Licht hin), das goldene
   Monogramm innen auf der Vorderseite, ein goldener Hals und ein facettierter Kristallverschluss.
   Zwei Formen: "hero" (hoch, Verschluss in Bernstein) und "karte" (fast quadratisch, klarer Verschluss
   mit Goldkern) für die Produktbilder. */
import * as THREE from './three.module.min.js';

// Monogramm "M" aus Cormorant Garamond 600 (_werkzeuge/monogramm.py), viewBox 0 0 1000 1000
export const MONO = 'M166.8 705.9 177.5 188.8 206.5 190.9 194.7 705.9Q193.6 762.8 216.7 792.9Q239.8 823 286.1 823Q289.3 823 289.3 829.5Q289.3 835.9 286.1 835.9Q262.4 835.9 237.7 834.9Q213 833.8 181.8 833.8Q149.6 833.8 123.2 834.9Q96.9 835.9 73.2 835.9Q70 835.9 70 829.5Q70 823 73.2 823Q117.3 823 141.5 792.9Q165.7 762.8 166.8 705.9ZM927.8 823Q930 823 930 829.5Q930 835.9 927.8 835.9Q899.9 835.9 865.5 834.9Q831.1 833.8 793.5 833.8Q755.8 833.8 723.1 834.9Q690.3 835.9 663.4 835.9Q661.2 835.9 661.2 829.5Q661.2 823 663.4 823Q715 823 730 809.1Q745.1 795.1 741.9 748.9L719.3 257.6L766.6 183.4L491.4 828.4Q490.3 832.7 482.8 832.7Q475.3 832.7 473.1 828.4L181.8 253.3Q143.1 177 80.8 177Q77.5 177 77.5 170.5Q77.5 164.1 80.8 164.1Q101.2 164.1 124.3 165.1Q147.4 166.2 163.5 166.2Q187.2 166.2 206 165.1Q224.8 164.1 235.6 164.1Q250.6 164.1 258.7 174.3Q266.7 184.5 285 220L526.9 694L480.6 775.7L735.4 190.9Q741.9 177 749.4 170.5Q756.9 164.1 767.7 164.1Q777.3 164.1 788.6 165.1Q799.9 166.2 816 166.2Q848.3 166.2 870.9 165.1Q893.4 164.1 914.9 164.1Q918.2 164.1 918.2 170.5Q918.2 177 914.9 177Q865.5 177 841.8 195.2Q818.2 213.5 820.3 257.6L844 748.9Q846.1 780 852.1 796.2Q858 812.3 875.7 817.7Q893.4 823 927.8 823Z';
export const BRAND = 'MARKE';

/* Quader mit abgeschrägten senkrechten Kanten (c) und abgeschrägten Ober- und Unterkanten (b), mittig.
   Flache Normalen: jede Facette fängt das Licht für sich. */
export function chamferBox(w, h, d, c, b) {
  const x = w / 2 - b, z = d / 2 - b;
  const cc = Math.min(c, x * 0.9, z * 0.9);
  const s = new THREE.Shape();
  s.moveTo(-x + cc, -z); s.lineTo(x - cc, -z); s.lineTo(x, -z + cc); s.lineTo(x, z - cc);
  s.lineTo(x - cc, z); s.lineTo(-x + cc, z); s.lineTo(-x, z - cc); s.lineTo(-x, -z + cc); s.closePath();
  const depth = Math.max(0.001, h - 2 * b);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  g.deleteAttribute('uv');
  return g;
}

/* Etikett: Monogramm und Markenname als Maske, dazu eine Normalenkarte (geprägte Kante, fängt Licht). */
export async function labelTextures(size = 1024) {
  try { await document.fonts.load(`500 ${Math.round(size * 0.085)}px Jost`); } catch (e) { /* Ersatzschrift */ }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.save();
  const ms = size * 0.62 / 1000;
  x.translate(size / 2 - 500 * ms, size * 0.06);
  x.scale(ms, ms);
  x.fill(new Path2D(MONO));
  x.restore();
  x.font = `500 ${Math.round(size * 0.085)}px Jost, Futura, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  if ('letterSpacing' in x) x.letterSpacing = `${Math.round(size * 0.04)}px`;
  x.fillText(BRAND, size / 2 + size * 0.02, size * 0.86);
  x.fillRect(size * 0.36, size * 0.72, size * 0.28, Math.max(2, size * 0.004));

  // Normalenkarte aus der weichgezeichneten Maske
  const n = Math.round(size / 2);
  const b = document.createElement('canvas'); b.width = b.height = n;
  const bx = b.getContext('2d');
  bx.filter = `blur(${Math.max(1, n / 180)}px)`;
  bx.drawImage(c, 0, 0, n, n);
  const src = bx.getImageData(0, 0, n, n).data;
  const out = bx.createImageData(n, n);
  const k = 3.2;
  const A = (i, j) => src[(Math.min(n - 1, Math.max(0, j)) * n + Math.min(n - 1, Math.max(0, i))) * 4 + 3] / 255;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = (A(i + 1, j) - A(i - 1, j)) * k, dy = (A(i, j + 1) - A(i, j - 1)) * k;
    const l = Math.hypot(dx, dy, 1);
    const o = (j * n + i) * 4;
    out.data[o] = (-dx / l * 0.5 + 0.5) * 255; out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[o + 3] = 255;
  }
  const nc = document.createElement('canvas'); nc.width = nc.height = n;
  nc.getContext('2d').putImageData(out, 0, 0);
  const map = new THREE.CanvasTexture(c); map.anisotropy = 4;
  const normal = new THREE.CanvasTexture(nc); normal.colorSpace = THREE.NoColorSpace;
  return { map, normal };
}

/* Füllung: eigener Shader, unterstützt die Schnittebene (Spiegelung im Becken). */
export function liquidMaterial({ deep, mid, hot, w = 0.7, h = 0.7, back = 0.15, edge = 0, rim = 1.1, side = 0.45 }) {
  return new THREE.ShaderMaterial({
    clipping: true,
    uniforms: {
      uDeep: { value: new THREE.Color(...deep) },
      uMid: { value: new THREE.Color(...mid) },
      uHot: { value: new THREE.Color(...hot) },
      uSize: { value: new THREE.Vector2(w, h) },
      uLight: { value: new THREE.Vector3(0.55, 0.7, 0.45).normalize() },
      uGain: { value: 1 },
      uBack: { value: back },
      uEdge: { value: edge },
      uRimK: { value: rim },
      uSideK: { value: side }
    },
    vertexShader: /* glsl */`
      #include <common>
      #include <clipping_planes_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mvPosition.xyz;
        vL = position;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <clipping_planes_pars_fragment>
      uniform vec3 uDeep, uMid, uHot, uLight;
      uniform vec2 uSize;
      uniform float uGain, uBack, uEdge, uRimK, uSideK;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main() {
        #include <clipping_planes_fragment>
        vec3 n = normalize(vN), v = normalize(vV);
        float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
        float y = clamp(vL.y / uSize.y + 0.5, 0.0, 1.0);
        float xr = clamp(vL.x / uSize.x + 0.5, 0.0, 1.0);
        float diag = y * 0.75 + xr * 0.45;
        vec3 c = mix(uDeep, uMid, smoothstep(-0.15, 0.85, diag));
        c += uHot * pow(1.0 - ndv, 2.0) * uRimK;
        float side = smoothstep(0.78, 1.0, abs(xr * 2.0 - 1.0));
        c += uHot * side * uSideK * (0.4 + 0.6 * y);
        c += uHot * pow(max(dot(n, uLight), 0.0), 3.0) * 0.32;
        c *= 0.7 + 0.3 * smoothstep(0.0, 0.4, y);
        c += uHot * 0.5 * smoothstep(0.93, 1.0, y) * step(0.5, n.y);
        vec2 cq = vec2(xr - 0.5, (y - 0.56) * 0.9);
        c += uHot * exp(-dot(cq, cq) * 6.5) * uBack;
        c *= 1.0 - uEdge * smoothstep(0.26, 0.5, max(abs(xr - 0.5), abs(y - 0.5)));
        gl_FragColor = vec4(c * uGain, 1.0);
      }`
  });
}

export const LIQUIDS = {
  hero:    { deep: [0.04, 0.003, 0.001], mid: [0.32, 0.035, 0.005], hot: [1.0, 0.3, 0.05] },
  or:      { deep: [0.09, 0.025, 0.003], mid: [0.5, 0.17, 0.025], hot: [1.0, 0.55, 0.14] },
  noir:    { deep: [0.008, 0.004, 0.002], mid: [0.06, 0.025, 0.008], hot: [0.45, 0.22, 0.06] },
  ambre:   { deep: [0.06, 0.012, 0.002], mid: [0.36, 0.09, 0.012], hot: [0.95, 0.4, 0.09] },
  rose:    { deep: [0.12, 0.02, 0.012], mid: [0.55, 0.16, 0.08], hot: [1.0, 0.5, 0.32] },
  fumee:   { deep: [0.03, 0.022, 0.014], mid: [0.16, 0.115, 0.07], hot: [0.7, 0.55, 0.36] },
  lumiere: { deep: [0.2, 0.14, 0.06], mid: [0.62, 0.48, 0.24], hot: [1.0, 0.88, 0.62] }
};

let shared = null;
function sharedMaterials(label) {
  if (shared) return shared;
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.035,
    transmission: 1, thickness: 0.34, ior: 1.52,
    attenuationColor: new THREE.Color(1.0, 0.93, 0.84), attenuationDistance: 1.8,
    specularIntensity: 1, envMapIntensity: 1.35, dispersion: 0.12
  });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.98, 0.66, 0.28), metalness: 1, roughness: 0.2, envMapIntensity: 1.7 });
  const labelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1.0, 0.72, 0.32), metalness: 1, roughness: 0.26, envMapIntensity: 2.1,
    map: label.map, normalMap: label.normal, normalScale: new THREE.Vector2(1.2, 1.2), alphaTest: 0.45
  });
  const capHero = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1.0, 0.9, 0.84), metalness: 0, roughness: 0.04,
    transmission: 1, thickness: 0.4, ior: 1.56,
    attenuationColor: new THREE.Color(0.95, 0.38, 0.12), attenuationDistance: 0.42,
    envMapIntensity: 1.4, specularIntensity: 1
  });
  const capCard = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03,
    transmission: 1, thickness: 0.4, ior: 1.54,
    attenuationColor: new THREE.Color(1.0, 0.9, 0.74), attenuationDistance: 1.2,
    envMapIntensity: 1.4, specularIntensity: 1
  });
  shared = { glass, gold, labelMat, capHero, capCard };
  return shared;
}

export function createFlakon(label, { form = 'hero', liquid = LIQUIDS.hero, back = 0.15, edge = 0, rim = 1.1, side = 0.45 } = {}) {
  const m = sharedMaterials(label);
  const F = form === 'karte'
    ? { w: 0.96, h: 0.9, d: 0.42, wall: 0.08, base: 0.19, top: 0.1, fill: 0.94, cap: [0.5, 0.3, 0.32], capC: 0.07, capB: 0.06 }
    : { w: 0.78, h: 1.12, d: 0.38, wall: 0.075, base: 0.2, top: 0.1, fill: 0.92, cap: [0.42, 0.28, 0.27], capC: 0.065, capB: 0.06 };
  const group = new THREE.Group();

  const body = new THREE.Mesh(chamferBox(F.w, F.h, F.d, 0.085, 0.06), m.glass);
  const lw = F.w - 2 * F.wall, ld = F.d - 2 * F.wall;
  const lh = (F.h - F.base - F.top) * F.fill;
  const liqMat = liquidMaterial({ ...liquid, w: lw, h: lh, back, edge, rim, side });
  const liq = new THREE.Mesh(chamferBox(lw, lh, ld, 0.045, 0.018), liqMat);
  liq.position.y = -F.h / 2 + F.base + lh / 2;

  const lb = Math.min(lw, lh) * 0.82;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(lb, lb), m.labelMat);
  lab.position.set(0, liq.position.y + lh * 0.03, ld / 2 + 0.003);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.094, 0.1, 48), m.gold);
  neck.position.y = F.h / 2 + 0.05;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 48), m.gold);
  ring.position.y = F.h / 2 + 0.011;

  const capMat = form === 'karte' ? m.capCard : m.capHero;
  const cap = new THREE.Mesh(chamferBox(F.cap[0], F.cap[1], F.cap[2], F.capC, F.capB), capMat);
  cap.position.y = F.h / 2 + 0.1 + F.cap[1] / 2;
  group.add(body, liq, lab, neck, ring, cap);
  if (form === 'karte') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, F.cap[1] * 0.7, 32), m.gold);
    core.position.copy(cap.position);
    group.add(core);
  }
  const height = F.h + 0.1 + F.cap[1];
  return { group, body, liquid: liq, liquidMaterial: liqMat, label: lab, cap, neck, ring, height, form: F, materials: m };
}
