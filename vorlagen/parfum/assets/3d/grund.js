/* Der Grund hinter dem Flakon: warmes Schwarz, Lichtkegel von oben rechts, Rauchschleier und ein Glimmen
   hinter dem Flakon. Er wird in geringer Auflösung in eine eigene Textur gezeichnet (weich genug dafür)
   und dann als bildschirmfüllende Fläche ganz hinten in die Szene gelegt. So kostet er im Glas-Durchgang
   (Lichtbrechung des Flakons) nur einen Texturzugriff. */
import * as THREE from './three.module.min.js';
import { NOISE } from './rauschen.js';

const TRI = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
})();

export function createGround(renderer, { scale = 0.42 } = {}) {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, depthBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  });
  const u = {
    uTime: { value: 0 },
    uAspect: { value: 1.6 },
    uGlowPos: { value: new THREE.Vector2(0.75, 0.48) },
    uGlow: { value: 1 },
    uBeamSrc: { value: new THREE.Vector2(1.04, 1.1) },
    uBeam: { value: 1 },
    uSmoke: { value: 1 },
    uSmokeY: { value: 0.42 },
    uSmokeW: { value: 0.2 },
    uSmokeSide: { value: 0.7 },
    uSmokeCol: { value: new THREE.Color(0.34, 0.065, 0.012) },
    uDim: { value: 1 },
    uPar: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uAspect, uGlow, uBeam, uSmoke, uSmokeY, uSmokeW, uSmokeSide, uDim, uPar;
      uniform vec2 uGlowPos, uBeamSrc;
      uniform vec3 uSmokeCol;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 uv = vUv;
        vec2 asp = vec2(uAspect, 1.0);
        vec3 col = vec3(0.0052, 0.0031, 0.0021);

        // Glimmen hinter dem Flakon
        float gd = length((uv - uGlowPos) * asp);
        col += vec3(0.085, 0.024, 0.006) * exp(-gd * 2.3) * uGlow;
        col += vec3(0.02, 0.006, 0.0015) * exp(-gd * 0.9) * uGlow;

        // Lichtkegel von oben rechts auf den Flakon
        vec2 dir = normalize((uGlowPos - uBeamSrc) * asp);
        vec2 rel = (uv - uBeamSrc) * asp;
        float along = dot(rel, dir);
        float across = dot(rel, vec2(-dir.y, dir.x));
        float ang = across / max(along, 0.02);
        float cone = smoothstep(0.3, 0.0, abs(ang + 0.03)) * step(0.0, along);
        float streak = 0.18 + 0.82 * smoothstep(0.35, 0.95, vnoise(vec2(ang * 13.0 + 3.0, uTime * 0.05)));
        streak *= 0.55 + 0.45 * vnoise(vec2(ang * 41.0, uTime * 0.08 + 7.0));
        float fall = smoothstep(0.0, 0.2, along) * exp(-along * 1.1);
        col += vec3(1.0, 0.72, 0.45) * 0.62 * cone * streak * fall * uBeam;
        col += vec3(1.0, 0.6, 0.3) * 0.08 * smoothstep(0.6, 0.0, abs(ang)) * step(0.0, along) * exp(-along * 1.6) * uBeam;

        // Rauch: weiche Schwaden mit feinen Fäden an den Rändern, langsam treibend und sich verformend
        // (mehrfach verzerrtes Rauschen). Er wird vom Licht oben rechts beleuchtet: Die dem Licht zugewandte
        // Seite jeder Schwade ist heller (zweite Probe zum Licht hin), wo der Lichtkegel ihn trifft, streut er
        // warmes Licht. Dichte Stellen sind weniger gesättigt als dünne, wie bei echtem Rauch im Gegenlicht.
        // Außerhalb seines Bandes wird nichts gerechnet.
        float t = uTime;
        float yb = uSmokeY + 0.07 * (vnoise(vec2(uv.x * 1.6 + t * 0.012, 3.0)) - 0.5);
        float band = exp(-pow((uv.y - yb) / uSmokeW, 2.0));
        float side = mix(1.0, smoothstep(1.05, 0.05, uv.x), uSmokeSide);
        float hazeB = exp(-pow((uv.y - yb) / (uSmokeW * 2.4), 2.0));
        if (hazeB * side * uSmoke > 0.004) {
          vec2 sp = uv * asp + vec2(0.0, uPar);
          vec2 q = vec2(fbm3(sp * 0.85 + vec2(0.0, t * 0.016)), fbm3(sp * 0.85 + vec2(4.7, 1.3) - vec2(t * 0.013, 0.0)));
          vec2 r = vec2(fbm3(sp * 1.6 + q * 2.3 + vec2(1.7, 9.2) + vec2(t * 0.03, 0.0)),
                        fbm3(sp * 1.6 + q * 2.3 + vec2(8.3, 2.8) - vec2(0.0, t * 0.024)));
          vec2 dp = sp * vec2(0.85, 2.2) + r * 1.55 + vec2(-t * 0.022, t * 0.006);
          // feine Lagen (für die Form) und grobe Lagen (für das Licht) in einem Durchgang
          float f = 0.0, fLo = 0.0, a = 0.5;
          vec2 pp = dp;
          for (int i = 0; i < 5; i++) { float nn = a * vnoise(pp); f += nn; if (i < 3) fLo += nn; pp = ROT * pp; a *= 0.5; }
          f /= 0.96875;
          vec2 toL = normalize((uBeamSrc - uv) * asp + vec2(0.0, 0.001));
          // zum Licht hin: nur die groben Lagen neu (sie bestimmen, wie die Schwade zum Licht steht), feine gleich
          float fL = (fbm3(dp + toL * vec2(0.85, 2.2) * 0.045) * 0.875 + (f * 0.96875 - fLo)) / 0.96875;
          float curl = fbm3(dp * 2.9 + r * 1.2 + vec2(t * 0.05, -t * 0.03));
          float body = smoothstep(0.56, 0.9, f) * smoothstep(0.25, 0.65, curl);
          float edgeW = 0.04 + 0.04 * q.x;
          float wisp = 1.0 - smoothstep(0.0, edgeW, abs(f - 0.54 + (curl - 0.5) * 0.08));
          wisp *= wisp * (0.25 + 0.75 * smoothstep(0.3, 0.75, q.y + 0.1));
          float dens = body * 0.7 + wisp * 0.55;
          float bodyL = smoothstep(0.56, 0.9, fL);
          float lit = clamp(0.55 + (f - fL) * 9.0, 0.0, 1.0);          // zum Licht gewandte Seite heller
          float amt = dens * band * side * uSmoke;
          vec3 thin = uSmokeCol;                                       // dünner Rauch: gesättigt
          vec3 thick = uSmokeCol * 0.55 + vec3(0.07, 0.045, 0.03);       // dichter Rauch: gedeckter, wärmer
          vec3 sc = mix(thin, thick, smoothstep(0.2, 0.7, dens));
          col += sc * mix(0.32, 1.45, lit) * amt;
          // Licht des Kegels streut im Rauch
          col += vec3(1.0, 0.7, 0.42) * cone * fall * uBeam * (dens * band * 1.1 + 0.08 * bodyL) * (0.6 + 0.4 * lit);
          // ferner Dunst: sehr weit und blass, gibt dem Raum Tiefe
          float haze = vnoise(sp * 0.55 + vec2(t * 0.008, -t * 0.004)) * 0.6 + vnoise(sp * 1.1 + 4.0) * 0.4;
          col += uSmokeCol * 0.16 * smoothstep(0.35, 0.8, haze) * hazeB * side * uSmoke;
        }

        // Vignette
        vec2 vq = (uv - 0.5) * vec2(1.0, 1.1);
        col *= 1.0 - 0.6 * dot(vq, vq);
        gl_FragColor = vec4(col * uDim, 1.0);
      }`
  });
  const quad = new THREE.Mesh(TRI, mat); quad.frustumCulled = false;
  const pass = new THREE.Scene(); pass.add(quad);
  const cam = new THREE.Camera();

  const show = new THREE.Mesh(TRI, new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }'
  }));
  show.frustumCulled = false;
  show.renderOrder = -1000;

  return {
    mesh: show,
    u,
    materials: [mat, show.material],
    setSize(w, h) {
      rt.setSize(Math.max(2, Math.round(w * scale)), Math.max(2, Math.round(h * scale)));
      u.uAspect.value = w / Math.max(1, h);
    },
    alloc() { renderer.initRenderTarget(rt); },
    render() { renderer.setRenderTarget(rt); renderer.render(pass, cam); },
    dispose() { rt.dispose(); mat.dispose(); show.material.dispose(); }
  };
}
