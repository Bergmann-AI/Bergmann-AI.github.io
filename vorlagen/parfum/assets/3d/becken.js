/* Das Goldbecken: rundes Becken mit flüssigem Gold. Die Oberfläche ist ein eigener Shader und verhält sich
   wie flüssiges Metall: Sie spiegelt (Fresnel mit den Reflexionswerten von Gold) den warmen Hintergrund,
   das Licht oben rechts und den Flakon (eigene Spiegelkamera, siehe szene.js). Ihre Farbe entsteht fast nur
   aus diesen Spiegelungen, verzerrt von langsamen Wogen, fließenden Schlieren und Ringwellen um den Flakon.
   Dazu ein leichtes Glühen um die Eintauchstelle und feines Glitzern, wo kleine Wellen das Licht treffen. */
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
      // Höhe der Oberfläche: breite, langsame Wogen und darauf fließende Schlieren
      float swell(vec2 p, float t) {
        return fbm3(p * 0.24 + vec2(t * 0.02, -t * 0.015));
      }
      // Schlieren: die Verzerrung (q) ändert sich so langsam, dass sie für die Steigung nur einmal gerechnet wird
      vec2 flowQ(vec2 p, float t) {
        return vec2(fbm3(p * 0.45 + vec2(0.0, t * 0.03)), fbm3(p * 0.45 + vec2(5.2, -t * 0.026)));
      }
      float flowH(vec2 p, vec2 q, float t) {
        return fbm3(p * 0.95 + q * 1.6 + vec2(t * 0.04, 0.0));
      }
      // warme Umgebung, wie sie die Oberfläche spiegelt (passend zu umgebung.js): dunkler Raum, ein warmes
      // Lichtband am Horizont hinter dem Becken, die große Lichtfläche oben rechts
      vec3 sky(vec3 d) {
        float y = d.y;
        float az = atan(d.x, -d.z);
        vec3 c = mix(vec3(0.016, 0.008, 0.005), vec3(0.05, 0.022, 0.01), smoothstep(0.0, 0.7, y));
        float hb = exp(-max(y - 0.015, 0.0) * 7.5) * smoothstep(-0.12, 0.02, y);
        c += vec3(1.0, 0.5, 0.15) * 0.62 * hb * (0.7 + 0.3 * sin(az * 2.3 + 0.6)) * (0.75 + 0.5 * smoothstep(-0.6, 0.9, az));
        float k = max(dot(d, uLight), 0.0);
        c += vec3(1.0, 0.82, 0.6) * (pow(k, 40.0) * 3.0 + pow(k, 6.0) * 0.22);
        return c;
      }
      void main() {
        float t = uTime;
        vec2 p = vP;
        vec2 d = p - uCenter;
        float r = length(d) + 1e-4;
        // Höhe und ihre Steigung (Normale)
        const float e = 0.035;
        vec2 fq = flowQ(p, t);
        float h0 = swell(p, t) * 0.42 + flowH(p, fq, t) * 0.075;
        float hx = swell(p + vec2(e, 0.0), t) * 0.42 + flowH(p + vec2(e, 0.0), fq, t) * 0.075;
        float hz = swell(p + vec2(0.0, e), t) * 0.42 + flowH(p + vec2(0.0, e), fq, t) * 0.075;
        vec2 g = vec2(hx - h0, hz - h0) / e;
        // Ringwellen vom Flakon nach außen: Wellenzug, der mit dem Abstand flacher wird
        float rp = max(r - 0.5, 0.0);
        float env = exp(-rp * 0.55) * smoothstep(0.0, 0.12, rp) * uRipple;
        float ph = rp * 11.0 - t * 2.2;
        g += d / r * (-sin(ph) * 11.0 * 0.03 * env);
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vW);
        float ndv = clamp(dot(n, v), 0.0, 1.0);
        vec3 rv = reflect(-v, n);
        // Fresnel für Gold (Reflexionswerte bei senkrechtem Blick)
        vec3 F0 = vec3(1.0, 0.766, 0.336);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0);
        vec3 c = F * sky(rv);
        // Glanzlicht der Lichtquelle (enge Keule, wie poliertes Metall)
        vec3 hv = normalize(uLight + v);
        float nh = max(dot(n, hv), 0.0);
        float a2 = 0.012;
        float D = a2 / (3.14159 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
        c += F * vec3(1.0, 0.85, 0.65) * D * 0.06 * max(dot(n, uLight), 0.0);
        // Spiegelung des Flakons und der Krone
        if (uReflOn > 0.5) {
          vec4 ru = vRU; ru.xy += n.xz * 0.05 * ru.w;
          vec4 rc = texture2DProj(uRefl, ru);
          c = mix(c, rc.rgb * F, clamp(rc.a, 0.0, 1.0) * 0.95);
        }
        // Glühen um die Eintauchstelle (warm, weich) und ein heller Saum direkt am Glas
        vec3 gold = vec3(1.0, 0.56, 0.14);
        c += gold * 0.2 * exp(-r * 1.3) * uGlow;
        c += vec3(1.0, 0.75, 0.38) * 0.45 * exp(-pow(rp * 9.0, 2.0)) * uGlow * step(0.0, r - 0.5);   // Meniskus am Glas
        // Glitzer: kleine Wellen, die das Licht kurz treffen (nur wo die Spiegelung zum Licht zeigt)
        vec2 gp = p * 34.0;
        vec2 gi = floor(gp), gf = fract(gp);
        vec2 o = hash22(gi);
        float gd = length(gf - (0.2 + 0.6 * o));
        float tw = 0.5 + 0.5 * sin(t * (1.5 + o.x * 3.0) + o.y * 40.0);
        float glit = smoothstep(0.08, 0.0, gd) * step(0.7, hash12(gi + 7.3)) * tw;
        c += vec3(1.0, 0.82, 0.5) * glit * (0.15 + 1.6 * pow(max(dot(rv, uLight), 0.0), 6.0));
        // Rand: heller Saum, wo die Flüssigkeit an die Wand stößt (Meniskus)
        float edge = smoothstep(uR - 0.12, uR - 0.01, length(p));
        c += vec3(1.0, 0.62, 0.22) * edge * 0.35;
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
