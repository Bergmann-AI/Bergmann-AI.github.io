/* Der Flakon in der Szene: mit Blender (Cycles) gerenderte Bilder, freigestellt (_werkzeuge/blender).
   Es gibt ein Bild je 5° Drehung (Drehfolge). Beim Scrollen wird zwischen zwei Nachbarbildern
   übergeblendet: so dreht sich der Flakon wirklich im Raum, Lichtkanten und Spiegelungen wandern mit.
   Die Bilder stehen auf einer Fläche, die sich nur um die Hochachse zur Kamera dreht; geneigt wird um
   die Blickachse. Unter der Beckenoberfläche wird abgeschnitten, in der Spiegelung ist er zu sehen.
   Die Farben werden so zurückgerechnet, dass das Bild nach der Filmkurve der Szene (bloom.js)
   wieder so aussieht wie gerendert; helle Lichtkanten bekommen dadurch Leuchten. */
import * as THREE from './three.module.min.js';

// Maße aus flakon.py (Form "hero"): ganze Höhe (Szene), Höhe des Glaskörpers, Bildhöhe (VIS), Seitenverhältnis
// (ASPECT) und wie weit die Bildmitte unter der Flakonmitte liegt (DROP, hier in Szenen-Einheiten)
export const HERO = { total: 1.5, h: 1.122, vis: 1.18, aspect: 0.64, drop: 0.021, front: 0.215 / 1.564 };
// Drehfolge aus render.py: Bild 0 = -30°, dann alle 5° bis +30° (Bild 12)
export const DREH = { von: -30, schritt: 5, anzahl: 13 };
// Halbe Tiefe des Glaskörpers (HERO.front: d/2 geteilt durch die ganze Höhe in flakon.py) im Verhältnis zur Bildbreite.
// Beim Überblenden wird jedes Bild so verschoben, dass die Vorderseite (Etikett) in beiden Bildern an derselben
// Stelle steht: keine doppelte Schrift.
const FRONT = HERO.front / (HERO.vis * HERO.aspect);

// Kehrwerte der Matrizen der Filmkurve in bloom.js
const I = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const O = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);

// Bild laden; wo möglich abseits des Hauptfadens entpackt (ImageBitmap), damit Scrollen nicht stockt
async function loadTexture(url) {
  let tex = null;
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await new THREE.ImageBitmapLoader()
        .setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
        .loadAsync(url);
      tex = new THREE.Texture(bmp);
      tex.flipY = false;
      tex.needsUpdate = true;
    } catch (e) { tex = null; }      // ältere Browser ohne diese Optionen: normal laden
  }
  if (!tex) tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export const frameIndex = (deg) => Math.min(DREH.anzahl - 1, Math.max(0, (deg - DREH.von) / DREH.schritt));

export async function createBildFlakon(urlOf, { start = 0, clipY = -1e9, exposure = 1.35 } = {}) {
  const tex = new Array(DREH.anzahl).fill(null);
  tex[start] = await loadTexture(urlOf(start));
  const visH = HERO.total * HERO.vis;
  const geo = new THREE.PlaneGeometry(visH * HERO.aspect, visH);
  geo.translate(0, HERO.total / 2 - HERO.h / 2 - HERO.drop, 0);      // Bildmitte knapp unter der Mitte der ganzen Höhe
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -clipY);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.DoubleSide, clipping: true,
    clippingPlanes: [clip],
    uniforms: {
      mapA: { value: tex[start] },
      mapB: { value: tex[start] },
      uMix: { value: 0 },
      uShift: { value: new THREE.Vector2() },
      uInvI: { value: I.clone().invert() },
      uInvO: { value: O.clone().invert() },
      uExp: { value: exposure },
      uGain: { value: 1 }
    },
    vertexShader: /* glsl */`
      #include <common>
      #include <clipping_planes_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <clipping_planes_pars_fragment>
      uniform sampler2D mapA, mapB;
      uniform float uMix;
      uniform vec2 uShift;
      uniform mat3 uInvI, uInvO;
      uniform float uExp, uGain;
      varying vec2 vUv;
      vec3 invFit(vec3 y) {
        const float a = 0.0245786, b = 0.000090537, c = 0.983729, d = 0.4329510, e = 0.238081;
        vec3 A = 1.0 - y * c, B = a - y * d, C = -(b + y * e);
        return (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A);
      }
      void main() {
        #include <clipping_planes_fragment>
        vec4 ta = texture2D(mapA, vUv - vec2(uShift.x, 0.0)), tb = texture2D(mapB, vUv - vec2(uShift.y, 0.0));
        float al = mix(ta.a, tb.a, uMix);
        if (al < 0.004) discard;
        vec3 c = mix(ta.rgb * ta.a, tb.rgb * tb.a, uMix) / al;      // Überblenden mit Deckkraft gewichtet
        vec3 u = clamp(uInvO * c, 0.0, 0.955);
        vec3 lin = max(uInvI * invFit(u), 0.0) / uExp;
        gl_FragColor = vec4(lin * uGain, al);
      }`
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;

  // nächstes geladenes Bild zu einem Index (solange die Drehfolge noch lädt)
  const nearest = (i) => {
    for (let d = 0; d < DREH.anzahl; d++) {
      if (tex[i - d]) return i - d;
      if (tex[i + d]) return i + d;
    }
    return start;
  };
  // Drehung in Grad (0 = Vorderseite zur Kamera, positiv = Vorderseite nach rechts)
  const angle = (i) => THREE.MathUtils.degToRad(DREH.von + i * DREH.schritt);
  function setYaw(deg) {
    const f = frameIndex(deg);
    const i0 = Math.floor(f), i1 = Math.min(DREH.anzahl - 1, i0 + 1);
    const a = nearest(i0), b = nearest(i1);
    const u = mat.uniforms;
    u.mapA.value = tex[a];
    u.mapB.value = tex[b];
    u.uMix.value = a === b ? 0 : (a === i0 && b === i1 ? f - i0 : 0);
    // Vorderseite beider Bilder auf den Zwischenwinkel schieben (innerhalb der Drehfolge)
    const th = angle(f);
    u.uShift.value.set(FRONT * (Math.sin(th) - Math.sin(angle(a))), FRONT * (Math.sin(th) - Math.sin(angle(b))));
  }
  // übrige Bilder nach und nach laden, die nahen zuerst; jedes gleich auf die Grafikkarte (kein Ruckler beim ersten Zeigen)
  async function loadRest(renderer, onFrame) {
    const order = [...Array(DREH.anzahl).keys()].filter(i => i !== start).sort((x, y) => Math.abs(x - start) - Math.abs(y - start));
    for (const i of order) {
      try {
        const t = await loadTexture(urlOf(i));
        renderer.initTexture(t);
        tex[i] = t;
        if (onFrame) onFrame(i);
      } catch (e) { /* fehlendes Bild: Nachbarbild bleibt stehen */ }
      await new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 300 }) : setTimeout(r, 60)));
    }
  }
  return { mesh, material: mat, clip, setYaw, loadRest };
}
