/* Werkzeug: rendert einen Flakon der Kollektion freigestellt, mit warmem Schein dahinter, für die
   Kollektionskarten. Zwei Durchgänge: Farbe (mit leuchtender Rückwand, damit das Glas Licht bricht) und
   Maske (Umriss). Daraus wird ein Bild mit Transparenz; außerhalb des Flakons bleibt nur ein schwacher
   warmer Schein. Ergebnis: WebP in 1200, 800 und 480 Pixeln als Daten-URLs (render.cjs speichert sie). */
import * as THREE from '../assets/3d/three.module.min.js';
import { createFlakon, labelTextures, LIQUIDS } from '../assets/3d/flakon.js';
import { buildEnv, addLights } from '../assets/3d/umgebung.js';

export async function renderStudio(v, size) {
  const liquid = LIQUIDS[v];
  if (!liquid) throw new Error('unbekannte Variante ' + v);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.environment = buildEnv(renderer);
  addLights(scene);
  const label = await labelTextures(1024);
  const f = createFlakon(label, { form: 'karte', liquid, back: 0.3, edge: 0.3, rim: 0.4, side: 0.12 });
  f.cap.material = f.cap.material.clone();
  f.cap.material.envMapIntensity = 2.4;
  f.group.rotation.set(0.06, -0.26, 0);
  f.group.position.y = -0.04;
  scene.add(f.group);

  // leuchtende Rückwand: nur im Farbdurchgang, damit das Glas warmes Licht bricht
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vU; void main(){
      vec2 q = (vU - vec2(0.5, 0.53)) * vec2(1.0, 0.9);
      float g = exp(-dot(q, q) * 26.0);
      vec3 c = vec3(0.004, 0.0022, 0.0015) + vec3(0.32, 0.12, 0.028) * exp(-dot(q, q) * 700.0) + vec3(0.05, 0.018, 0.005) * exp(-dot(q, q) * 90.0);
      gl_FragColor = vec4(c, 1.0); }`
  }));
  wall.position.z = -1.6;
  scene.add(wall);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
  camera.position.set(0, 0.34, 5.3);
  camera.lookAt(0, 0.16, 0);

  const read = () => {
    const gl = renderer.getContext();
    const px = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  // Farbe
  renderer.setClearColor(0x000000, 1);
  renderer.render(scene, camera);
  const col = read();
  // Maske
  wall.visible = false;
  scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  const mask = read();
  scene.overrideMaterial = null;

  // zusammensetzen (Zeilen von unten nach oben gelesen)
  const out = new ImageData(size, size);
  const cx = 0.5 * size, cy = 0.47 * size;
  for (let y = 0; y < size; y++) {
    const sy = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const i = (sy * size + x) * 4, o = (y * size + x) * 4;
      const m = mask[i + 3] / 255;
      const dx = (x - cx) / size, dy = (y - cy) / size;
      const halo = 0.42 * Math.exp(-(dx * dx * 1.0 + dy * dy * 0.75) / 0.05);
      const a = m + (1 - m) * halo;
      out.data[o] = col[i]; out.data[o + 1] = col[i + 1]; out.data[o + 2] = col[i + 2];
      out.data[o + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  const full = document.createElement('canvas'); full.width = full.height = size;
  full.getContext('2d').putImageData(out, 0, 0);
  const result = {};
  for (const w of [1200, 800, 480]) {
    const c = document.createElement('canvas'); c.width = c.height = w;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    // in Stufen verkleinern, damit Kanten weich bleiben
    let src = full, s = size;
    while (s / 2 >= w * 1.0001) {
      const h = document.createElement('canvas'); h.width = h.height = Math.round(s / 2);
      const hx = h.getContext('2d'); hx.imageSmoothingQuality = 'high'; hx.drawImage(src, 0, 0, h.width, h.height);
      src = h; s = h.width;
    }
    x.drawImage(src, 0, 0, w, w);
    result[w] = c.toDataURL('image/webp', 0.9);
  }
  result.preview = full.toDataURL('image/png');
  return result;
}
