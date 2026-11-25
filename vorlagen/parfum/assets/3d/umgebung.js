/* Umgebung für Spiegelungen auf Glas und Gold: warmes Dunkel mit Lichtflächen (Studio-Softboxen),
   einmal als vorgefilterte Umgebungskarte (PMREM) berechnet. Szene und Produktbilder nutzen dieselbe. */
import * as THREE from './three.module.min.js';

export function buildEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; void main(){
      vec3 c = mix(vec3(0.01, 0.005, 0.003), vec3(0.06, 0.026, 0.012), smoothstep(-0.4, 0.9, vD.y));
      c += vec3(0.3, 0.1, 0.03) * pow(max(dot(vD, normalize(vec3(0.7, 0.5, 0.4))), 0.0), 5.0);
      gl_FragColor = vec4(c, 1.0); }`
  })));
  const box = (w, h, p, col, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
  };
  box(9, 5, [7, 8, 6], [1, 0.84, 0.66], 6);
  box(1.4, 12, [-9, 1, 1.5], [1, 0.58, 0.28], 3.2);
  box(2, 9, [8, -1, -4], [1, 0.68, 0.42], 2.2);
  box(14, 3, [0, 4, -11], [1, 0.48, 0.18], 1.1);
  box(10, 10, [0, -9, 3], [0.6, 0.24, 0.07], 0.45);
  box(0.8, 0.8, [3, 2.5, 7], [1, 0.95, 0.85], 26);
  box(0.6, 0.6, [-4, 5, 6], [1, 0.9, 0.8], 18);
  box(0.45, 11, [-3.6, 0.5, 9], [1, 0.9, 0.78], 5.5);   // Lichtstreifen vorn: Reflexe auf Glas
  box(0.28, 11, [4.2, 0.8, 9], [1, 0.86, 0.7], 4);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0, 0.1, 100);
  pm.dispose();
  env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return rt.texture;
}

/* Licht von oben rechts (wie die Lichtkegel im Grund) und ein warmes Gegenlicht von links. */
export function addLights(scene) {
  const key = new THREE.DirectionalLight(new THREE.Color(1, 0.8, 0.58), 2.4);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight(new THREE.Color(1, 0.45, 0.14), 1.1);
  rim.position.set(-6, -1, 1);
  key.layers.enableAll(); rim.layers.enableAll();
  scene.add(key, rim, new THREE.HemisphereLight(new THREE.Color(0.5, 0.25, 0.1), new THREE.Color(0.05, 0.02, 0.01), 0.35));
  return { key, rim };
}
