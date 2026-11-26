/* Der Flakon in der Szene: ein mit Blender (Cycles) gerendertes Bild, freigestellt (_werkzeuge/blender).
   Es steht auf einer Fläche, die sich nur um die Hochachse zur Kamera dreht; geneigt wird um die
   Blickachse. Unter der Beckenoberfläche wird abgeschnitten, in der Spiegelung ist er zu sehen.
   Die Farben werden so zurückgerechnet, dass das Bild nach der Filmkurve der Szene (bloom.js)
   wieder so aussieht wie gerendert; helle Lichtkanten bekommen dadurch Leuchten. */
import * as THREE from './three.module.min.js';

// Maße aus flakon.py (Form "hero"): ganze Höhe, Höhe des Glaskörpers, Bildrand (vis), Seitenverhältnis
export const HERO = { total: 1.5, h: 1.12, vis: 1.1, aspect: 0.66 };

// Kehrwerte der Matrizen der Filmkurve in bloom.js
const I = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const O = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);

export async function createBildFlakon(url, { clipY = -1e9, exposure = 1.35 } = {}) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const visH = HERO.total * HERO.vis;
  const geo = new THREE.PlaneGeometry(visH * HERO.aspect, visH);
  geo.translate(0, HERO.total / 2 - HERO.h / 2, 0);      // Bildmitte = Mitte der ganzen Höhe
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -clipY);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.DoubleSide, clipping: true,
    clippingPlanes: [clip],
    uniforms: {
      map: { value: tex },
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
      uniform sampler2D map;
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
        vec4 t = texture2D(map, vUv);
        if (t.a < 0.004) discard;
        vec3 u = clamp(uInvO * t.rgb, 0.0, 0.955);
        vec3 lin = max(uInvI * invFit(u), 0.0) / uExp;
        gl_FragColor = vec4(lin * uGain, t.a);
      }`
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return { mesh, material: mat, texture: tex, clip };
}
