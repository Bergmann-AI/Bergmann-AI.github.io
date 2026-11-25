/* Das Goldbecken: rundes Becken mit geschmolzenem Bernstein-Gold. Die Oberfläche ist ein eigener Shader:
   langsam fließende Schlieren, Glitzer, Ringwellen um den Flakon, ein Glühen um die Eintauchstelle und
   die Spiegelung des Flakons (eigene Spiegelkamera, siehe szene.js). */
import * as THREE from './three.module.min.js';
import { NOISE } from './rauschen.js';

export function createPool({ R = 3.4 } = {}) {
  const group = new THREE.Group();
  const u = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(0, 0) },
    uRipple: { value: 0 },
    uGlow: { value: 1 },
    uDim: { value: 1 },
    uR: { value: R },
    uRefl: { value: null },
    uReflOn: { value: 0 },
    uTexMat: { value: new THREE.Matrix4() },
    uLight: { value: new THREE.Vector3(0.45, 0.75, -0.5).normalize() }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      uniform mat4 uTexMat;
      varying vec2 vP; varying vec3 vW; varying vec4 vRU;
      void main() {
        vP = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vRU = uTexMat * w;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uRipple, uGlow, uDim, uR, uReflOn;
      uniform vec2 uCenter;
      uniform vec3 uLight;
      uniform sampler2D uRefl;
      varying vec2 vP; varying vec3 vW; varying vec4 vRU;
      ${NOISE}
      float flowH(vec2 p, float t) {
        vec2 q = vec2(fbm3(p * 0.5 + vec2(0.0, t * 0.035)), fbm3(p * 0.5 + vec2(5.2, -t * 0.03)));
        return fbm3(p * 1.05 + q * 1.7 + vec2(t * 0.045, 0.0));
      }
      void main() {
        float t = uTime;
        vec2 p = vP;
        vec2 d = p - uCenter;
        float r = length(d) + 1e-4;
        // fließende Schlieren
        float f = flowH(p, t);
        float fx = flowH(p + vec2(0.06, 0.0), t) - f;
        float fz = flowH(p + vec2(0.0, 0.06), t) - f;
        // Ringwellen vom Flakon nach außen
        float rp = max(r - 0.55, 0.0);
        float env = exp(-rp * 0.75) * smoothstep(0.0, 0.25, rp) * uRipple;
        float ph = rp * 13.0 - t * 2.4;
        float ringD = cos(ph) * 13.0 * env * 0.035;
        vec3 n = normalize(vec3(-fx * 1.6 - d.x / r * ringD, 1.0, -fz * 1.6 - d.y / r * ringD));
        vec3 v = normalize(cameraPosition - vW);
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        // Grundfarbe: tiefes Rotbraun, Bernstein, goldene Schlieren
        vec3 deep = vec3(0.12, 0.022, 0.005), amber = vec3(0.62, 0.17, 0.026), gold = vec3(1.0, 0.56, 0.14);
        vec3 c = mix(deep, amber, smoothstep(0.28, 0.66, f));
        c = mix(c, gold, smoothstep(0.6, 0.86, f) * 0.85);
        c *= 0.8 + 0.4 * (0.5 + 0.5 * sin(ph)) * env * 2.0;
        // Glühen um die Eintauchstelle
        c += gold * 0.55 * exp(-r * 0.9) * uGlow;
        c += vec3(1.0, 0.75, 0.38) * 0.4 * exp(-pow(rp * 2.2, 2.0)) * uGlow * step(0.0, r - 0.5);

        // Spiegelung: Licht von oben rechts, Umgebung, der gespiegelte Flakon
        vec3 rv = reflect(-v, n);
        float fres = 0.3 + 0.7 * pow(1.0 - ndv, 3.0);
        float spec = pow(max(dot(rv, uLight), 0.0), 90.0) * 3.5 + pow(max(dot(rv, uLight), 0.0), 12.0) * 0.25;
        vec3 sky = mix(vec3(0.02, 0.008, 0.004), vec3(0.24, 0.08, 0.02), smoothstep(0.0, 0.6, rv.y));
        c = mix(c, sky, fres * 0.35);
        c += vec3(1.0, 0.82, 0.55) * spec;
        if (uReflOn > 0.5) {
          vec4 ru = vRU; ru.xy += n.xz * 0.06 * ru.w;
          vec4 rc = texture2DProj(uRefl, ru);
          c = mix(c, rc.rgb * 1.05, clamp(rc.a, 0.0, 1.0) * clamp(fres * 1.45, 0.0, 0.95));
        }
        // Glitzer: kleine Funken, die aufblitzen
        vec2 gp = p * 38.0;
        vec2 gi = floor(gp), gf = fract(gp);
        vec2 o = hash22(gi);
        float gd = length(gf - (0.2 + 0.6 * o));
        float tw = 0.5 + 0.5 * sin(t * (1.5 + o.x * 3.0) + o.y * 40.0);
        float glit = smoothstep(0.09, 0.0, gd) * step(0.62, hash12(gi + 7.3)) * tw;
        c += vec3(1.0, 0.8, 0.45) * glit * (0.6 + 1.4 * smoothstep(0.55, 0.85, f));
        // Rand: heller Saum, wo die Flüssigkeit an die Wand stößt
        float edge = smoothstep(uR - 0.14, uR - 0.01, length(p));
        c += vec3(1.0, 0.62, 0.22) * edge * 0.45;
        gl_FragColor = vec4(c * uDim, 1.0);
      }`
  });
  const surface = new THREE.Mesh(new THREE.CircleGeometry(R, 160).rotateX(-Math.PI / 2), mat);
  surface.position.y = 0;

  const rimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.42, 0.22), metalness: 1, roughness: 0.28, envMapIntensity: 1.4 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.035, 0.04, 14, 220).rotateX(Math.PI / 2), rimMat);
  rim.position.y = 0.06;
  const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.09, 0.05, 0.03), metalness: 0.7, roughness: 0.32, envMapIntensity: 1.1, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.1, 1.6, 200, 1, true), wallMat);
  wall.position.y = -0.74;
  group.add(surface, rim, wall);
  return { group, surface, u, R, materials: [mat, rimMat, wallMat] };
}
