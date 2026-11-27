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
    uDim: { value: 1 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uAspect, uGlow, uBeam, uSmoke, uSmokeY, uSmokeW, uSmokeSide, uDim;
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

        // Rauchschleier: feine Fäden und ein weicher Körper
        vec2 sp = uv * asp;
        float t = uTime;
        vec2 w = vec2(fbm3(sp * 1.5 + vec2(t * 0.022, 0.0)), fbm3(sp * 1.5 + vec2(3.1, -t * 0.017)));
        float f = fbm5(sp * vec2(1.05, 2.3) + w * 2.0 + vec2(-t * 0.03, t * 0.006));
        float fil = pow(1.0 - min(abs(f - 0.53) * 2.2, 1.0), 10.0);
        float body = smoothstep(0.5, 0.9, f) * 0.28;
        float band = exp(-pow((uv.y - uSmokeY) / uSmokeW, 2.0));
        float side = mix(1.0, smoothstep(1.05, 0.05, uv.x), uSmokeSide);
        col += uSmokeCol * (fil * 1.25 + body) * band * side * uSmoke;

        // Vignette
        vec2 q = (uv - 0.5) * vec2(1.0, 1.1);
        col *= 1.0 - 0.6 * dot(q, q);
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
