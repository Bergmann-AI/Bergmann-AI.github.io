/* Flüssiges Gold: das gedrehte Band um den Flakon, Tropfen, Goldstaub und die Krone, die beim Eintauchen
   ins Becken aufspritzt. Band und Krone sind PBR-Material (Spiegelungen aus der Umgebung) mit eigenem
   Leuchten an dünnen Stellen; ihre Form bewegt sich im Vertex-Shader (fließende Wellen, sanftes Schwingen). */
import * as THREE from './three.module.min.js';

export function goldMaterial({ glow = [0.62, 0.2, 0.024], flow = [1.0, 0.72, 0.34], kind = 'band' } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1.0, 0.52, 0.1), metalness: 0.62, roughness: 0.11,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.9,
    emissive: new THREE.Color(...glow), emissiveIntensity: 1, side: kind === 'krone' ? THREE.DoubleSide : THREE.FrontSide
  });
  const u = {
    uTime: { value: 0 }, uReveal: { value: 1 }, uStart: { value: 0 }, uAmp: { value: 1 }, uSway: { value: 1 },
    uFlowCol: { value: new THREE.Color(...flow) }, uFlowAmt: { value: kind === 'tropfen' ? 0 : 1 },
    uH: { value: 0 }, uR0: { value: 0.62 }, uFlare: { value: 0.5 }, uSpikes: { value: 14 }
  };
  mat.userData.u = u;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uReveal, uStart, uAmp, uSway, uH, uR0, uFlare, uSpikes;
        varying float vT; varying float vA;
        ${kind === 'band' ? 'attribute vec3 aCtr;' : ''}
        ${kind === 'krone' ? `
        float spike(float th) { return pow(0.5 + 0.5 * cos(th * uSpikes), 5.0); }
        vec3 crownAt(float th, float v) {
          float jit = 0.75 + 0.25 * sin(th * 3.0 + 1.3) * sin(th * 5.0);
          float top = uH * (0.42 + 0.58 * spike(th) * jit) * (1.0 + 0.05 * sin(uTime * 3.1 + th * 4.0));
          float y = v * top;
          float r = uR0 + uFlare * uH * v * v * (0.55 + 0.45 * spike(th));
          return vec3(cos(th) * r, y, sin(th) * r);
        }` : ''}`)
      .replace('#include <beginnormal_vertex>', kind === 'krone' ? `
        float th0 = uv.x * 6.2831853, v0 = 1.0 - uv.y;
        vec3 c0 = crownAt(th0, v0);
        vec3 tA = crownAt(th0 + 0.01, v0) - c0;
        vec3 tB = crownAt(th0, v0 + 0.02) - c0;
        vec3 objectNormal = normalize(cross(tB, tA));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif` : '#include <beginnormal_vertex>')
      .replace('#include <begin_vertex>', kind === 'band' ? `
        vec3 transformed = vec3(position);
        vT = uv.x; vA = uv.y;
        float k = smoothstep(uReveal, uReveal - 0.05, uv.x) * smoothstep(uStart, uStart + 0.05, uv.x);
        vec3 off = transformed - aCtr;
        float wave = sin(uv.x * 74.0 - uTime * 2.3 + uv.y * 6.2831853) * 0.09
                   + sin(uv.x * 23.0 - uTime * 1.25) * 0.11;
        transformed = aCtr + off * k * (1.0 + wave * uAmp);
        transformed += vec3(sin(uTime * 0.55 + uv.x * 7.0), cos(uTime * 0.47 + uv.x * 6.0), sin(uTime * 0.39 + uv.x * 5.0)) * 0.028 * uSway;`
        : kind === 'krone' ? `
        vec3 transformed = c0;
        vT = v0; vA = uv.x;` : `
        vec3 transformed = vec3(position);
        vT = 0.5; vA = 0.0;`)
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uFlowAmt; uniform vec3 uFlowCol; varying float vT; varying float vA;`)
      .replace('#include <emissivemap_fragment>', `
        // feine Wellen auf der Oberfläche (Bump über Bildschirm-Ableitungen)
        float hw = sin(vT * 150.0 - uTime * 3.2 + vA * 12.566) * 0.5 + sin(vT * 63.0 + vA * 6.283 - uTime * 1.7) * 0.5;
        hw *= uFlowAmt;
        vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
        vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dFdx(hw) * r1 + dFdy(hw) * r2);
        normal = normalize(abs(det) * normal - grad * 0.012);
        vec3 vd = normalize(vViewPosition);
        float ndv = abs(dot(normal, vd));
        float rim = pow(1.0 - ndv, 1.6);
        float flow = pow(0.5 + 0.5 * sin(vT * 58.0 - uTime * 2.8), 7.0);
        totalEmissiveRadiance *= 0.2 + 1.25 * rim;
        totalEmissiveRadiance += uFlowCol * flow * (0.12 + 0.5 * rim) * uFlowAmt;`);
  };
  mat.customProgramCacheKey = () => 'gold-' + kind;
  return mat;
}

/* Band entlang einer Kurve: elliptischer Querschnitt, der sich dreht, an den Enden schmal. */
export function ribbonGeometry(points, { segs = 460, radial = 20, width = 0.16, thick = 0.07, twist = 2.4, prof = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = new Float32Array((segs + 1) * (radial + 1) * 3);
  const nor = new Float32Array(pos.length), ctr = new Float32Array(pos.length);
  const uv = new Float32Array((segs + 1) * (radial + 1) * 2);
  const P = new THREE.Vector3(), ax = new THREE.Vector3(), ay = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
  let o = 0, ou = 0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = prof ? prof(t) : 1;
    const tw = twist * t * Math.PI * 2 + Math.sin(t * 9.0) * 0.7;
    const ct = Math.cos(tw), st = Math.sin(tw);
    ax.copy(fr.normals[i]).multiplyScalar(ct).addScaledVector(fr.binormals[i], st);
    ay.copy(fr.normals[i]).multiplyScalar(-st).addScaledVector(fr.binormals[i], ct);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      q.copy(P).addScaledVector(ax, width * r * ca).addScaledVector(ay, thick * r * sa);
      n.copy(ax).multiplyScalar(ca / width).addScaledVector(ay, sa / thick).normalize();
      pos[o] = q.x; pos[o + 1] = q.y; pos[o + 2] = q.z;
      nor[o] = n.x; nor[o + 1] = n.y; nor[o + 2] = n.z;
      ctr[o] = P.x; ctr[o + 1] = P.y; ctr[o + 2] = P.z;
      o += 3;
      uv[ou++] = t; uv[ou++] = j / radial;
    }
  }
  const idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aCtr', new THREE.BufferAttribute(ctr, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.boundingSphere.radius += 0.4;
  return { geometry: g, curve };
}

export function createRibbon(points, opts = {}) {
  const { geometry, curve } = ribbonGeometry(points, opts);
  const mat = goldMaterial({ kind: 'band' });
  const mesh = new THREE.Mesh(geometry, mat);
  return { mesh, curve, u: mat.userData.u, material: mat };
}

/* Tropfen: kleine Goldkugeln, je mit Grundposition, Größe und eigener Bewegung. */
export function createDrops(list) {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const mat = goldMaterial({ kind: 'tropfen' });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), qq = new THREE.Quaternion();
  return {
    mesh, u: mat.userData.u, material: mat,
    update(time, fn) {
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        const r = fn ? fn(d, i, p, time) : (p.set(d.p[0], d.p[1], d.p[2]), d.s);
        s.set(r, r * (d.stretch || 1), r);
        m4.compose(p, qq, s);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}

/* Goldstaub: weiche, flimmernde Punkte (additiv), die langsam steigen. */
export function createDust(points) {
  const n = points.length;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
  points.forEach((d, i) => { pos.set(d.p, i * 3); seed.set([d.ph, d.sp, d.sz], i * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  g.computeBoundingSphere();
  const u = { uTime: { value: 0 }, uPx: { value: 1 }, uBright: { value: 1 }, uColor: { value: new THREE.Color(1.0, 0.68, 0.3) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uPx;
      attribute vec3 aSeed;
      varying float vA;
      void main() {
        vec3 p = position;
        float ph = aSeed.x * 6.2831853;
        p.x += sin(uTime * 0.13 * (0.6 + aSeed.y) + ph) * 0.14;
        p.y += sin(uTime * 0.09 * (0.6 + aSeed.y) + ph * 1.7) * 0.12 + uTime * 0.012 * aSeed.y;
        p.z += cos(uTime * 0.11 + ph) * 0.08;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max(1.0, aSeed.z * uPx * 60.0 / -mv.z);
        vA = 0.45 + 0.55 * sin(uTime * (0.9 + aSeed.y * 2.4) + ph * 7.0);
        vA *= smoothstep(0.6, 2.5, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uBright; uniform vec3 uColor;
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, r);
        a *= a * a;
        gl_FragColor = vec4(uColor * a * vA * uBright * 2.2, 1.0);
      }`
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return { points: pts, u };
}

/* Krone: offene Röhre, deren Form der Vertex-Shader aus Höhe, Spitzen und Aufweitung baut. */
export function createCrown({ spikes = 14 } = {}) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 160, 14, true);
  const mat = goldMaterial({ kind: 'krone' });
  mat.userData.u.uSpikes.value = spikes;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, u: mat.userData.u, material: mat, spikes };
}

/* Spitzen der Krone (gleiche Formel wie im Shader, ohne Zittern) für die Tropfen obenauf. */
export function crownTip(th, u, out) {
  const H = u.uH.value, sp = u.uSpikes.value;
  const spike = Math.pow(0.5 + 0.5 * Math.cos(th * sp), 5);
  const jit = 0.75 + 0.25 * Math.sin(th * 3 + 1.3) * Math.sin(th * 5);
  const top = H * (0.42 + 0.58 * spike * jit);
  const r = u.uR0.value + u.uFlare.value * H * (0.55 + 0.45 * spike);
  return out.set(Math.cos(th) * r, top, Math.sin(th) * r);
}
