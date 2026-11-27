/* Leuchten (Bloom) und Bildabschluss. Nach assets/3d/bloom.js der Bergmann-AI-Seite (3d-website-Skill),
   angepasst: Die Szene wird linear in ein Float-Ziel gezeichnet; der Abschluss addiert das Leuchten,
   setzt Belichtung, ACES-Filmkurve, sRGB-Umrechnung, eine leichte Vignette und feines Rauschen gegen
   Farbstufen. "fade" blendet beim Start aus warmem Schwarz auf. */
import * as THREE from './three.module.min.js';
import { compileAhead } from './gpu-upload.js';

export function createBloom(renderer, { levels = 4, scale = 0.5, msaa = 0, strength = 0.9, threshold = 0.62, sceneScale = 1, exposure = 1 } = {}) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(tri); quad.frustumCulled = false;
  const pass = new THREE.Scene(); pass.add(quad);
  const cam = new THREE.Camera();
  const type = THREE.HalfFloatType;
  const opt = { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { type, samples: msaa, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const A = [], B = [];
  for (let i = 0; i < levels; i++) { A.push(new THREE.WebGLRenderTarget(1, 1, opt)); B.push(new THREE.WebGLRenderTarget(1, 1, opt)); }
  const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
  const base = { vertexShader: VS, depthTest: false, depthWrite: false };
  const bright = new THREE.ShaderMaterial({
    ...base, uniforms: { t: { value: null }, th: { value: threshold } },
    fragmentShader: `uniform sampler2D t; uniform float th; varying vec2 vUv;
      void main(){ vec4 s=texture2D(t,vUv); vec3 c=s.rgb; float l=max(c.r,max(c.g,c.b));
        float k=mix(.35,1.,clamp(s.a,0.,1.));      // Alpha < 1: dort weniger Leuchten (gerenderter Flakon)
        gl_FragColor=vec4(min(c,vec3(24.))*smoothstep(th,th+.5,l)*k,1.); }`
  });
  const blur = new THREE.ShaderMaterial({
    ...base, uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } },
    fragmentShader: `uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 c=texture2D(t,vUv).rgb*.2270270270;
        c+=(texture2D(t,vUv+dir*1.3846153846).rgb+texture2D(t,vUv-dir*1.3846153846).rgb)*.3162162162;
        c+=(texture2D(t,vUv+dir*3.2307692308).rgb+texture2D(t,vUv-dir*3.2307692308).rgb)*.0702702703;
        gl_FragColor=vec4(c,1.); }`
  });
  const W = levels > 3 ? [0.26, 0.28, 0.26, 0.2] : [0.3, 0.32, 0.38];
  const up = new THREE.ShaderMaterial({
    ...base, uniforms: { tA: { value: null }, tC: { value: null }, w: { value: 1 }, wc: { value: 1 } },
    fragmentShader: `uniform sampler2D tA, tC; uniform float w, wc; varying vec2 vUv;
      void main(){ gl_FragColor=vec4(texture2D(tA,vUv).rgb*w+texture2D(tC,vUv).rgb*wc,1.); }`
  });
  const comp = new THREE.ShaderMaterial({
    ...base, uniforms: {
      tScene: { value: rtScene.texture }, tGlow: { value: null },
      strength: { value: strength }, fade: { value: 1 }, exposure: { value: exposure }, time: { value: 0 }
    },
    fragmentShader: `uniform sampler2D tScene, tGlow; uniform float strength, fade, exposure, time; varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a=v*(v+.0245786)-.000090537; vec3 b=v*(.983729*v+.4329510)+.238081; return a/b; }
      vec3 aces(vec3 c){
        const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));
        const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
        c=I*c; c=RRTAndODTFit(c); c=O*c; return clamp(c,0.,1.);
      }
      vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-.055, step(.0031308,c)); }
      float h(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      void main(){
        vec3 c=texture2D(tScene,vUv).rgb;
        c+=texture2D(tGlow,vUv).rgb*strength;
        c=aces(c*exposure*1.35);
        vec2 q=vUv-.5; c*=1.-.32*dot(q,q);
        c=toSRGB(c);
        c=mix(vec3(.027,.019,.015),c,fade);
        float n=h(gl_FragCoord.xy+fract(time)*61.)+h(gl_FragCoord.yx*1.7+fract(time*1.3)*37.)-1.;
        c+=n*(1.6/255.);
        gl_FragColor=vec4(c,1.);
      }`
  });

  const size = new THREE.Vector2();
  let quality = 1, sw = 1, sh = 1;
  function setSize() {
    renderer.getDrawingBufferSize(size);
    const k = sceneScale * quality;
    sw = Math.max(1, Math.round(size.x * k)); sh = Math.max(1, Math.round(size.y * k));
    rtScene.setSize(sw, sh);
    let w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    for (let i = 0; i < levels; i++) { A[i].setSize(w, h); B[i].setSize(w, h); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
  }
  function alloc() { [rtScene, ...A, ...B].forEach(r => renderer.initRenderTarget(r)); }
  function draw(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(pass, cam); }

  return {
    setSize,
    u: comp.uniforms,
    get width() { return sw; }, get height() { return sh; },
    get pixelRatio() { return renderer.getPixelRatio() * sceneScale * quality; },
    get quality() { return quality; },
    get target() { return rtScene; },
    setQuality(q) { if (q === quality) return; quality = q; setSize(); alloc(); },
    warm() {
      alloc();
      const s = new THREE.Scene();
      [bright, blur, up, comp].forEach(m => { const o = new THREE.Mesh(tri, m); o.frustumCulled = false; s.add(o); });
      return compileAhead(renderer, s, cam);
    },
    render(scene, camera, target = null) {
      renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, camera);
      bright.uniforms.t.value = rtScene.texture; draw(bright, A[0]);
      for (let i = 0; i < levels; i++) {
        const src = i === 0 ? A[0] : A[i - 1];
        blur.uniforms.t.value = src.texture; blur.uniforms.dir.value.set(1 / B[i].width, 0); draw(blur, B[i]);
        blur.uniforms.t.value = B[i].texture; blur.uniforms.dir.value.set(0, 1 / A[i].height); draw(blur, A[i]);
      }
      let c = A[levels - 1];
      for (let i = levels - 2; i >= 0; i--) {
        up.uniforms.tA.value = A[i].texture; up.uniforms.tC.value = c.texture;
        up.uniforms.w.value = W[i]; up.uniforms.wc.value = i === levels - 2 ? W[levels - 1] : 1;
        draw(up, B[i]); c = B[i];
      }
      comp.uniforms.tGlow.value = c.texture;
      draw(comp, target);
    },
    dispose() { rtScene.dispose(); A.concat(B).forEach(r => r.dispose()); [bright, blur, up, comp].forEach(m => m.dispose()); tri.dispose(); }
  };
}
