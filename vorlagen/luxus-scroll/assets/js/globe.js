/* Punkt-Globus mit Flugrouten. Keine Bibliothek.
   Landpunkte: assets/data/land-dots.json, erzeugt aus Natural-Earth-Daten (world-atlas, gemeinfrei).
   Routen unten anpassen: [Breite, Länge] je Stadt.

   Für eine hohe Bildrate zeichnet die Grafikkarte (WebGL): Kugel, rund 11.000 Landpunkte, Routen und
   Lichtpunkte werden im Shader gedreht und projiziert, pro Bild ändern sich nur ein paar Zahlen.
   Ohne WebGL (oder wenn der Kontext verloren geht) zeichnet derselbe Globus als Canvas 2D.
   Gezeichnet wird nur, solange der Globus sichtbar ist. */
(function () {
  'use strict';

  var CITIES = {
    london: [51.5, -0.13], newyork: [40.71, -74.0], losangeles: [34.05, -118.24], aspen: [39.19, -106.82],
    dubai: [25.2, 55.27], tokio: [35.68, 139.69], singapur: [1.35, 103.82], paris: [48.86, 2.35],
    kapstadt: [-33.92, 18.42], sydney: [-33.87, 151.21], rio: [-22.91, -43.17], reykjavik: [64.15, -21.94],
    malediven: [4.17, 73.51], miami: [25.76, -80.19]
  };
  var ROUTES = [
    ['london', 'newyork'], ['newyork', 'losangeles'], ['paris', 'dubai'], ['dubai', 'singapur'],
    ['singapur', 'tokio'], ['london', 'kapstadt'], ['miami', 'rio'], ['reykjavik', 'aspen'],
    ['dubai', 'malediven'], ['tokio', 'sydney']
  ];

  var D2R = Math.PI / 180;
  var BIG = 1e9;
  var MAX_SIZE = 3200;   // größte Kantenlänge der Zeichenfläche in Gerätepixeln
  var TILT = 0.42;

  function vec(lat, lon) {
    lat *= D2R; lon *= D2R;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  }

  // Flugbögen: Großkreis mit Anhebung, 57 Punkte je Route
  function buildRoutes() {
    return ROUTES.map(function (r, idx) {
      var a = vec.apply(null, CITIES[r[0]]), b = vec.apply(null, CITIES[r[1]]);
      var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      var w = Math.acos(Math.max(-1, Math.min(1, dot)));
      var n = 56, pts = new Float32Array((n + 1) * 3), h = 0.1 + 0.32 * (w / Math.PI);
      for (var i = 0; i <= n; i++) {
        var t = i / n, s = Math.sin(w) || 1;
        var k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s, lift = 1 + h * Math.sin(Math.PI * t);
        pts[i * 3] = (k1 * a[0] + k2 * b[0]) * lift;
        pts[i * 3 + 1] = (k1 * a[1] + k2 * b[1]) * lift;
        pts[i * 3 + 2] = (k1 * a[2] + k2 * b[2]) * lift;
      }
      return { idx: idx, pts: pts, n: n, a: a, b: b, phase: (idx * 0.618034) % 1 };
    });
  }

  function loadDots(url) {
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var xyz = [];
      d.rows.forEach(function (row) {
        var lat = (d.lat0 - row[0] * d.step) * D2R, n = row[1], cl = Math.cos(lat), sl = Math.sin(lat);
        for (var k = 2; k < row.length; k += 2) {
          for (var i = row[k]; i < row[k] + row[k + 1]; i++) {
            var lon = (-180 + (i + 0.5) * 360 / n) * D2R;
            xyz.push(cl * Math.sin(lon), sl, cl * Math.cos(lon));
          }
        }
      });
      return new Float32Array(xyz);
    });
  }

  function growOf(reveal, k) { return Math.max(0, Math.min(1, (reveal - k * 0.35) / 1.6)); }
  function lightIndex(rt, clock) { return Math.floor((((clock / 5.5) + rt.phase) % 1) * rt.n); }

  /* ======================================================================
     Zeichenweg 1: WebGL
     ====================================================================== */
  var V_COMMON = [
    'precision highp float;',
    'uniform vec2 uRot; uniform vec2 uTilt; uniform vec3 uView; uniform float uSize;',
    'vec3 proj(vec3 p) {',
    '  float x1 = p.x * uRot.x + p.z * uRot.y; float z1 = -p.x * uRot.y + p.z * uRot.x;',
    '  return vec3(x1, p.y * uTilt.x - z1 * uTilt.y, p.y * uTilt.y + z1 * uTilt.x);',
    '}',
    'vec2 toScreen(vec3 q) { return uView.xy + vec2(q.x, -q.y) * uView.z; }',
    'vec4 toClip(vec2 s) { return vec4(s.x / uSize * 2.0 - 1.0, 1.0 - s.y / uSize * 2.0, 0.0, 1.0); }',
    'const vec4 HIDE = vec4(2.0, 2.0, 2.0, 1.0);'
  ].join('\n');
  var F_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  var SRC = {
    sphereV: V_COMMON + '\nattribute vec2 aCorner; varying vec2 vN;\n' +
      'void main() { vN = aCorner * 1.02; gl_Position = toClip(uView.xy + vN * uView.z); }',
    // Kugel mit dem Verlauf von createRadialGradient(cx-0.3R, cy-0.35R, 0.1R, cx, cy, 1.02R) und feinem Rand
    sphereF: F_HEAD + 'uniform float uR; uniform float uU; varying vec2 vN;\n' +
      'void main() {\n' +
      '  vec2 c0 = vec2(-0.3, -0.35); float r0 = 0.1; float dr = 0.92; vec2 cd = -c0; vec2 pd = vN - c0;\n' +
      '  float a = dot(cd, cd) - dr * dr; float b = dot(pd, cd) + r0 * dr; float c = dot(pd, pd) - r0 * r0;\n' +
      '  float sq = sqrt(max(b * b - a * c, 0.0));\n' +
      '  float t = clamp(max((b + sq) / a, (b - sq) / a), 0.0, 1.0);\n' +
      '  vec3 col = t < 0.7 ? mix(vec3(0.1137, 0.1020, 0.0902), vec3(0.0745, 0.0667, 0.0588), t / 0.7)\n' +
      '                     : mix(vec3(0.0745, 0.0667, 0.0588), vec3(0.0510, 0.0471, 0.0431), (t - 0.7) / 0.3);\n' +
      '  float d = length(vN);\n' +
      '  float fill = clamp((1.0 - d) * uR + 0.5, 0.0, 1.0);\n' +
      '  float ring = clamp(0.6 * uU + 0.5 - abs(d - 1.0) * uR, 0.0, 1.0) * 0.10;\n' +
      '  vec4 o = vec4(vec3(0.8392, 0.6902, 0.4706) * ring, ring) + vec4(col * fill, fill) * (1.0 - ring);\n' +
      '  if (o.a <= 0.0) discard;\n' +
      '  gl_FragColor = o;\n' +
      '}',
    dotsV: V_COMMON + '\nattribute vec3 aPos; uniform float uPt; varying float vA;\n' +
      'void main() {\n' +
      '  vec3 q = proj(aPos);\n' +
      '  if (q.z < 0.04) { gl_Position = HIDE; gl_PointSize = 1.0; vA = 0.0; return; }\n' +
      '  vA = q.z > 0.8 ? 0.78 : q.z > 0.6 ? 0.62 : q.z > 0.4 ? 0.46 : q.z > 0.2 ? 0.30 : 0.16;\n' +
      '  gl_Position = toClip(toScreen(q)); gl_PointSize = uPt;\n' +
      '}',
    // quadratische Punkte mit weicher Kante (Pixelabdeckung), wie fillRect im Canvas
    dotsF: F_HEAD + 'uniform float uPt; uniform float uDs; varying float vA;\n' +
      'void main() {\n' +
      '  vec2 l = (gl_PointCoord - 0.5) * uPt; float h = uDs * 0.5;\n' +
      '  vec2 cov = clamp(min(l + 0.5, vec2(h)) - max(l - 0.5, vec2(-h)), 0.0, 1.0);\n' +
      '  float a = cov.x * cov.y * vA; if (a <= 0.0) discard;\n' +
      '  gl_FragColor = vec4(vec3(0.9098, 0.8627, 0.7843) * a, a);\n' +
      '}',
    lineV: V_COMMON + '\nattribute vec3 aA; attribute vec3 aB; attribute vec4 aInfo; uniform float uW;\n' +
      'varying float vSide; varying float vU; varying float vIdx; varying float vVis;\n' +
      'void main() {\n' +
      '  vec3 pa = proj(aA), pb = proj(aB); vec2 sa = toScreen(pa), sb = toScreen(pb);\n' +
      '  vec2 d = sb - sa; float len = length(d); vec2 dir = len > 0.0001 ? d / len : vec2(1.0, 0.0);\n' +
      '  vec2 nrm = vec2(-dir.y, dir.x); float hw = uW * 0.5 + 1.0;\n' +
      '  vec3 pp = aInfo.x < 0.5 ? pa : pb; vec2 sp = aInfo.x < 0.5 ? sa : sb;\n' +
      '  vVis = (pp.z < 0.0 && dot(pp.xy, pp.xy) < 1.0) ? 0.0 : 1.0;\n' +
      '  vSide = aInfo.y * hw; vU = aInfo.z; vIdx = aInfo.w;\n' +
      '  gl_Position = toClip(sp + nrm * aInfo.y * hw);\n' +
      '}',
    lineF: F_HEAD + 'uniform float uW; uniform float uReveal;\n' +
      'varying float vSide; varying float vU; varying float vIdx; varying float vVis;\n' +
      'void main() {\n' +
      '  float grow = clamp((uReveal - vIdx * 0.35) / 1.6, 0.0, 1.0);\n' +
      '  if (vU > grow || vVis < 0.5) discard;\n' +
      '  float a = clamp(uW * 0.5 + 0.5 - abs(vSide), 0.0, 1.0) * 0.85; if (a <= 0.0) discard;\n' +
      '  gl_FragColor = vec4(vec3(0.7882, 0.6431, 0.4314) * a, a);\n' +
      '}',
    // Endpunkte (Hof + Kern) und wandernde Lichtpunkte als runde Punkte
    markV: V_COMMON + '\nattribute vec3 aPos; attribute vec2 aInfo; uniform float uReveal; uniform float uU; uniform float uLights; uniform float uMaxPt;\n' +
      'varying float vKind; varying float vSz;\n' +
      'void main() {\n' +
      '  vec3 q = proj(aPos); float kind = aInfo.x;\n' +
      '  float grow = clamp((uReveal - aInfo.y * 0.35) / 1.6, 0.0, 1.0);\n' +
      '  bool show = kind < 0.5 ? (grow > 0.0 && q.z >= 0.02)\n' +
      '            : kind < 1.5 ? (grow >= 1.0 && q.z >= 0.02)\n' +
      '            : (uLights > 0.5 && grow >= 1.0 && !(q.z < 0.0 && dot(q.xy, q.xy) < 1.0));\n' +
      '  if (!show) { gl_Position = HIDE; gl_PointSize = 1.0; vKind = 0.0; vSz = 1.0; return; }\n' +
      '  float rad = kind < 1.5 ? 8.0 * uU : 1.6 * uU;\n' +
      '  vSz = min(ceil(rad * 2.0 + 2.0), uMaxPt); vKind = kind;\n' +
      '  gl_PointSize = vSz; gl_Position = toClip(toScreen(q));\n' +
      '}',
    markF: F_HEAD + 'uniform float uU; varying float vKind; varying float vSz;\n' +
      'void main() {\n' +
      '  float d = length(gl_PointCoord - 0.5) * vSz; vec4 o;\n' +
      '  if (vKind < 1.5) {\n' +
      '    float ah = clamp(8.0 * uU + 0.5 - d, 0.0, 1.0) * 0.16; float ac = clamp(4.0 * uU + 0.5 - d, 0.0, 1.0);\n' +
      '    vec3 g = vec3(0.7882, 0.6431, 0.4314); o = vec4(g * ac, ac) + vec4(g * ah, ah) * (1.0 - ac);\n' +
      '  } else {\n' +
      '    float a = clamp(1.6 * uU + 0.5 - d, 0.0, 1.0) * 0.9; o = vec4(vec3(1.0, 0.8863, 0.6667) * a, a);\n' +
      '  }\n' +
      '  if (o.a <= 0.0) discard;\n' +
      '  gl_FragColor = o;\n' +
      '}'
  };

  function rendererGL(canvas, gl, routes) {
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vs, fs, attrs) {
      var p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      attrs.forEach(function (a, i) { gl.bindAttribLocation(p, i, a); });
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
      return { p: p, u: u, n: attrs.length };
    }
    var P = {
      sphere: program(SRC.sphereV, SRC.sphereF, ['aCorner']),
      dots: program(SRC.dotsV, SRC.dotsF, ['aPos']),
      line: program(SRC.lineV, SRC.lineF, ['aA', 'aB', 'aInfo']),
      mark: program(SRC.markV, SRC.markF, ['aPos', 'aInfo'])
    };
    var maxPt = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || [1, 64])[1];

    function buffer(data, usage) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW); return b; }

    // Kugel: Quadrat um den Kreis
    var quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));

    // Routen: je Abschnitt zwei Dreiecke, Breite und Sichtbarkeit rechnet der Shader
    var lv = [];
    routes.forEach(function (rt) {
      var p = rt.pts, n = rt.n;
      for (var j = 0; j < n; j++) {
        var A = [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]], B = [p[j * 3 + 3], p[j * 3 + 4], p[j * 3 + 5]];
        [[0, -1], [1, -1], [0, 1], [0, 1], [1, -1], [1, 1]].forEach(function (c) {
          lv.push(A[0], A[1], A[2], B[0], B[1], B[2], c[0], c[1], (j + c[0]) / n, rt.idx);
        });
      }
    });
    var lineBuf = buffer(new Float32Array(lv)), lineCount = lv.length / 10;

    // Endpunkte (fest) und Lichtpunkte (wandern, pro Bild 10 Positionen)
    var ev = [];
    routes.forEach(function (rt) { ev.push(rt.a[0], rt.a[1], rt.a[2], 0, rt.idx, rt.b[0], rt.b[1], rt.b[2], 1, rt.idx); });
    var endBuf = buffer(new Float32Array(ev)), endCount = ev.length / 5;
    var lightData = new Float32Array(routes.length * 5);
    routes.forEach(function (rt, i) { lightData[i * 5 + 3] = 2; lightData[i * 5 + 4] = rt.idx; });
    var lightBuf = buffer(lightData, gl.DYNAMIC_DRAW);

    var dotBuf = null, dotCount = 0, size = 0, R = 0, u = 1;

    function attrib(loc, n, stride, off) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride * 4, off * 4); }
    function common(pr, st) {
      gl.useProgram(pr.p);
      gl.uniform2f(pr.u.uRot, Math.cos(st.rot), Math.sin(st.rot));
      gl.uniform2f(pr.u.uTilt, Math.cos(TILT), Math.sin(TILT));
      gl.uniform3f(pr.u.uView, size / 2, size / 2, R);
      gl.uniform1f(pr.u.uSize, size);
      for (var i = 0; i < 4; i++) { if (i < pr.n) gl.enableVertexAttribArray(i); else gl.disableVertexAttribArray(i); }
    }

    return {
      kind: 'webgl',
      setDots: function (xyz) { dotBuf = buffer(xyz); dotCount = xyz.length / 3; },
      resize: function (s) { size = s; R = s * 0.35; u = Math.max(1, R / 433); gl.viewport(0, 0, s, s); },
      draw: function (st) {
        if (!size || gl.isContextLost()) return;
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        common(P.sphere, st);
        gl.uniform1f(P.sphere.u.uR, R); gl.uniform1f(P.sphere.u.uU, u);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad); attrib(0, 2, 2, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (dotCount) {
          var ds = Math.max(1.4, 1.75 * u);
          common(P.dots, st);
          gl.uniform1f(P.dots.u.uPt, Math.min(Math.ceil(ds) + 2, maxPt)); gl.uniform1f(P.dots.u.uDs, ds);
          gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf); attrib(0, 3, 3, 0);
          gl.drawArrays(gl.POINTS, 0, dotCount);
        }

        common(P.line, st);
        gl.uniform1f(P.line.u.uW, 1.15 * u); gl.uniform1f(P.line.u.uReveal, st.reveal);
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); attrib(0, 3, 10, 0); attrib(1, 3, 10, 3); attrib(2, 4, 10, 6);
        gl.drawArrays(gl.TRIANGLES, 0, lineCount);

        common(P.mark, st);
        gl.uniform1f(P.mark.u.uReveal, st.reveal); gl.uniform1f(P.mark.u.uU, u);
        gl.uniform1f(P.mark.u.uLights, st.lights ? 1 : 0); gl.uniform1f(P.mark.u.uMaxPt, maxPt);
        if (st.lights) {
          routes.forEach(function (rt, i) {
            var ci = lightIndex(rt, st.clock) * 3;
            lightData[i * 5] = rt.pts[ci]; lightData[i * 5 + 1] = rt.pts[ci + 1]; lightData[i * 5 + 2] = rt.pts[ci + 2];
          });
          gl.bindBuffer(gl.ARRAY_BUFFER, lightBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, lightData);
          attrib(0, 3, 5, 0); attrib(1, 2, 5, 3);
          gl.drawArrays(gl.POINTS, 0, routes.length);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, endBuf); attrib(0, 3, 5, 0); attrib(1, 2, 5, 3);
        gl.drawArrays(gl.POINTS, 0, endCount);
      }
    };
  }

  /* ======================================================================
     Zeichenweg 2: Canvas 2D (Ersatz ohne WebGL)
     ====================================================================== */
  var DOT2D = [0.16, 0.3, 0.46, 0.62, 0.78].map(function (a) { return 'rgba(232,220,200,' + a + ')'; });

  function renderer2D(canvas) {
    var ctx = canvas.getContext('2d');
    var X0 = null, Y0 = null, Z0 = null, count = 0, bx = [], by = [], bn = [0, 0, 0, 0, 0];
    var size = 0, R = 0, cx = 0, cy = 0, u = 1, sphere = null;
    var ct = Math.cos(TILT), st0 = Math.sin(TILT), tmp = [0, 0, 0];
    var routes = null, rpx = [], rpy = [], rvis = [];
    function project(x, y, z, cr, sr, out) {
      var x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
      out[0] = x1; out[1] = y * ct - z1 * st0; out[2] = y * st0 + z1 * ct;
    }
    return {
      kind: '2d',
      setRoutes: function (rs) {
        routes = rs;
        rs.forEach(function (rt) { rpx.push(new Float32Array(rt.n + 1)); rpy.push(new Float32Array(rt.n + 1)); rvis.push(new Uint8Array(rt.n + 1)); });
      },
      setDots: function (xyz) {
        count = xyz.length / 3; X0 = new Float32Array(count); Y0 = new Float32Array(count); Z0 = new Float32Array(count);
        for (var i = 0; i < count; i++) { X0[i] = xyz[i * 3]; Y0[i] = xyz[i * 3 + 1]; Z0[i] = xyz[i * 3 + 2]; }
        for (var b = 0; b < 5; b++) { bx[b] = new Float32Array(count); by[b] = new Float32Array(count); }
      },
      resize: function (s) {
        size = s; R = s * 0.35; cx = s / 2; cy = s / 2; u = Math.max(1, R / 433);
        sphere = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.02);
        sphere.addColorStop(0, '#1d1a17'); sphere.addColorStop(0.7, '#13110f'); sphere.addColorStop(1, '#0d0c0b');
      },
      draw: function (st) {
        if (!size) return;
        ctx.clearRect(0, 0, size, size);
        var cr = Math.cos(st.rot), sr = Math.sin(st.rot), i, bi;
        ctx.fillStyle = sphere; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(214,176,120,0.10)'; ctx.lineWidth = 1.2 * u; ctx.stroke();
        if (count) {
          bn[0] = bn[1] = bn[2] = bn[3] = bn[4] = 0;
          var ds = Math.max(1.4, 1.75 * u), hs = ds / 2;
          for (i = 0; i < count; i++) {
            var x = X0[i], z = Z0[i], y = Y0[i];
            var z1 = -x * sr + z * cr, z2 = y * st0 + z1 * ct;
            if (z2 < 0.04) continue;
            bi = z2 > 0.8 ? 4 : z2 > 0.6 ? 3 : z2 > 0.4 ? 2 : z2 > 0.2 ? 1 : 0;
            var n = bn[bi]++;
            bx[bi][n] = cx + (x * cr + z * sr) * R - hs;
            by[bi][n] = cy - (y * ct - z1 * st0) * R - hs;
          }
          for (bi = 0; bi < 5; bi++) {
            var m = bn[bi], X = bx[bi], Y = by[bi];
            if (!m) continue;
            ctx.fillStyle = DOT2D[bi]; ctx.beginPath();
            for (i = 0; i < m; i++) ctx.rect(X[i], Y[i], ds, ds);
            ctx.fill();
          }
        }
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(201,164,110,0.85)'; ctx.lineWidth = 1.15 * u;
        for (var k = 0; k < routes.length; k++) {
          var rt = routes[k], grow = growOf(st.reveal, k);
          if (grow <= 0) continue;
          var lastI = Math.floor(rt.n * grow), pts = rt.pts, px = rpx[k], py = rpy[k], vis = rvis[k];
          for (var j = 0; j <= lastI; j++) {
            project(pts[j * 3], pts[j * 3 + 1], pts[j * 3 + 2], cr, sr, tmp);
            vis[j] = (tmp[2] < 0 && (tmp[0] * tmp[0] + tmp[1] * tmp[1]) < 1) ? 0 : 1;
            px[j] = cx + tmp[0] * R; py[j] = cy - tmp[1] * R;
          }
          ctx.beginPath();
          var pen = false;
          for (j = 0; j <= lastI; j++) {
            if (vis[j]) { if (!pen) { ctx.moveTo(px[j], py[j]); pen = true; } else ctx.lineTo(px[j], py[j]); }
            else pen = false;
          }
          ctx.stroke();
          if (grow >= 1 && st.lights) {
            var ci = lightIndex(rt, st.clock);
            if (vis[ci]) { ctx.fillStyle = 'rgba(255,226,170,0.9)'; ctx.beginPath(); ctx.arc(px[ci], py[ci], 1.6 * u, 0, Math.PI * 2); ctx.fill(); }
          }
          for (var e = 0; e < 2; e++) {
            if (e === 1 && grow < 1) continue;
            var v = e === 0 ? rt.a : rt.b;
            project(v[0], v[1], v[2], cr, sr, tmp);
            if (tmp[2] < 0.02) continue;
            var EX = cx + tmp[0] * R, EY = cy - tmp[1] * R;
            ctx.fillStyle = 'rgba(201,164,110,0.16)'; ctx.beginPath(); ctx.arc(EX, EY, 8 * u, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#c9a46e'; ctx.beginPath(); ctx.arc(EX, EY, 4 * u, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    };
  }

  /* ======================================================================
     Steuerung (gemeinsam): Größe, Sichtbarkeit, Pause, Drehung
     ====================================================================== */
  function Globe(canvas, opts) {
    opts = opts || {};
    var routes = buildRoutes();
    var q = Math.min(window.devicePixelRatio || 1, 2);
    var dots = null, size = 0, R = null;
    var rot = opts.rotation || -1.25, speed = 0.045, extraRot = 0;
    var running = false, paused = false, visible = false, raf = 0, last = 0, clock = 0, revealAt = -1;
    var cost = 0, costN = 0;

    function make2D() {
      var r = renderer2D(canvas); r.setRoutes(routes);
      if (dots) r.setDots(dots);
      return r;
    }
    function makeRenderer() {
      if (!opts.force2d && window.WebGLRenderingContext) {
        var gl = null;
        try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'default' }); } catch (e) { gl = null; }
        if (gl) {
          try {
            var r = rendererGL(canvas, gl, routes);
            if (dots) r.setDots(dots);
            canvas.addEventListener('webglcontextlost', onLost, false);
            return r;
          } catch (err) { swapCanvas(); }
        }
      }
      return make2D();
    }
    // Ein Canvas mit (verlorenem) WebGL-Kontext kann kein 2D mehr: durch eine frische Kopie ersetzen
    function swapCanvas() {
      var c = canvas.cloneNode(false);
      canvas.parentNode.replaceChild(c, canvas);
      io.unobserve(canvas); canvas = c; io.observe(canvas);
      size = 0;
    }
    function onLost(e) {
      e.preventDefault();
      swapCanvas();
      R = make2D();
      resize();
    }

    function resize() {
      var w = canvas.clientWidth;
      if (!w) return;
      var s = Math.min(MAX_SIZE, Math.round(w * q));
      if (s !== size) { size = s; canvas.width = s; canvas.height = s; R.resize(s); }
      draw();
    }

    function draw() {
      if (!size) return;
      var reveal = opts.static ? BIG : revealAt < 0 ? 0 : paused ? BIG : clock - revealAt;
      var t0 = performance.now();
      R.draw({ rot: rot + extraRot, clock: clock, reveal: reveal, lights: !opts.static });
      // Nur der 2D-Ersatz kann zu langsam werden (Zeichnen oder Bildabstand im Mittel zu hoch):
      // dann die interne Auflösung stufenweise senken, im Notfall bis 0,6 (etwas weicher, dafür flüssig)
      if (R.kind === '2d' && running) {
        var dt = performance.now() - t0;
        cost = costN ? cost * 0.9 + dt * 0.1 : dt; costN++;
        if (costN > 40 && (cost > 5 || gap > 22) && q > 0.6) { q = Math.max(0.6, q - 0.2); costN = 0; gap = 16; resize(); }
      }
    }

    var gap = 16; // gleitender Mittelwert des Bildabstands (ms)
    function frame(t) {
      if (!running) return;
      var raw = t - last;
      if (raw > 0 && raw < 200) gap = gap * 0.92 + raw * 0.08;
      var dt = Math.min(0.05, Math.max(0, raw / 1000) || 0); last = t;   // erstes Bild kann vor 'last' liegen
      if (!paused) { clock += dt; rot += speed * dt; }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function update() {
      var should = visible && !document.hidden && !paused && !opts.static && dots;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); draw(); }
    }

    var io = new IntersectionObserver(function (es) {
      visible = es[es.length - 1].isIntersecting;
      if (visible && revealAt < 0) revealAt = clock;
      update();
    }, { rootMargin: '80px 0px' });
    io.observe(canvas);
    R = makeRenderer();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', function () { q = Math.min(window.devicePixelRatio || 1, 2); costN = 0; gap = 16; resize(); });

    loadDots(opts.data || 'assets/data/land-dots.json').then(function (xyz) {
      dots = xyz; R.setDots(xyz); resize(); update();
    });

    return {
      setPaused: function (p) { paused = p; update(); draw(); },
      setScroll: function (v) { if (v === extraRot) return; extraRot = v; if (!running && visible) draw(); },
      kind: function () { return R && R.kind; }
    };
  }

  window.Globe = Globe;
})();
