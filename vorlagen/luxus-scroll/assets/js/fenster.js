/* Fensterfoto-Zoom auf der Grafikkarte (WebGL2, keine Bibliothek).

   Warum: Wird ein großes Foto per CSS stark vergrößert, muss der Browser es bei jeder Zoomstufe neu
   aufbereiten. Das kostet Zeit, das Bild steht kurz still und springt dann. Hier liegt das Foto einmal
   als Textur (mit Mip-Stufen) auf der Grafikkarte; pro Bild ändern sich nur vier Zahlen.

   Laden ohne Ruckler: Das Foto wird außerhalb des Hauptthreads dekodiert (createImageBitmap) und in
   Streifen hochgeladen, ein Streifen pro Bild. Ohne WebGL2 übernimmt das <img> mit CSS (gleiche Geometrie). */
(function () {
  'use strict';

  var BITMAP = { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' };

  var VS = '#version 300 es\n' +
    'in vec2 aPos;\n' +
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

  // Bildschirmpunkt -> Punkt im Foto: Zoom um den Blickpunkt F, der dabei um d verschoben wird
  var FS = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uTex;\n' +
    'uniform vec2 uBack;   // Leinwand in Gerätepixeln\n' +
    'uniform float uDpr;\n' +
    'uniform vec4 uRect;   // Foto bei Zoom 1: x, y, Breite, Höhe (CSS-Pixel)\n' +
    'uniform vec2 uFocus;  // Blickpunkt im Foto (CSS-Pixel ab der linken oberen Ecke)\n' +
    'uniform vec3 uXform;  // Verschiebung x, y und Zoom\n' +
    'out vec4 outColor;\n' +
    'void main() {\n' +
    '  vec2 p = vec2(gl_FragCoord.x, uBack.y - gl_FragCoord.y) / uDpr;\n' +
    '  vec2 local = uFocus + (p - (uRect.xy + uFocus + uXform.xy)) / uXform.z;\n' +
    '  vec2 uv = local / uRect.zw;\n' +
    '  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }\n' +
    '  outColor = vec4(texture(uTex, uv, -0.35).rgb, 1.0);\n' +
    '}';

  function FensterGL(canvas) {
    if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return null;
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) return null;

    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog, u = {};
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'aPos');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return null; }
    ['uTex', 'uBack', 'uDpr', 'uRect', 'uFocus', 'uXform'].forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    var tex = null, ready = false, lost = false, loadingH = 0, loadedH = 0, last = '', dpr = 1;
    var api = { maxTex: maxTex, onready: null, onlost: null };

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; ready = false; if (api.onlost) api.onlost(); }, false);

    // Größe kommt vom Aufrufer (gemessen bei Größenänderung): pro Bild keine Layout-Abfrage
    function resize(cw, ch) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; last = ''; }
    }

    // Foto laden: dekodieren, in Streifen hochladen (einer pro Bild), Mip-Stufen auf der Grafikkarte bauen
    api.load = function (url, height) {
      if (lost || height <= loadedH || height === loadingH) return;
      loadingH = height;
      fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (b) { return createImageBitmap(b, BITMAP); })
        .then(function (bmp) {
          if (lost || loadingH !== height) { bmp.close(); return; }
          var w = bmp.width, h = bmp.height, rows = 256, top = 0;
          var t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.RGBA8, w, h);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          // Streifen außerhalb des Hauptthreads ausschneiden, immer zwei im Voraus
          var cuts = [];
          function cut() {
            if (top >= h) return;
            var c = { top: top, n: Math.min(rows, h - top), s: null }; top += c.n; cuts.push(c);
            createImageBitmap(bmp, 0, c.top, w, c.n, BITMAP).then(function (s) { c.s = s; }, function () { c.fail = true; });
          }
          cut(); cut();
          function step() {
            if (lost) return;
            var c = cuts[0];
            if (c && c.fail) { bmp.close(); return; }
            if (c && c.s) {
              cuts.shift(); cut();
              gl.bindTexture(gl.TEXTURE_2D, t);
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
              gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, c.top, gl.RGBA, gl.UNSIGNED_BYTE, c.s);
              c.s.close();
              if (c.top + c.n >= h) {
                gl.generateMipmap(gl.TEXTURE_2D);
                bmp.close();
                if (tex) gl.deleteTexture(tex);
                tex = t; loadedH = height; ready = true; last = '';
                if (api.onready) api.onready();
                return;
              }
            }
            requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        })
        .catch(function () { loadingH = 0; });
    };

    // p: { vw, ch, x, y, w, h, fx, fy, dx, dy, s } – alles in CSS-Pixeln (vw, ch: Breite und Höhe der Leinwand)
    api.draw = function (p) {
      if (!ready || lost) return;
      resize(p.vw, p.ch);
      var key = p.vw + '|' + p.ch + '|' + p.x + '|' + p.y + '|' + p.w + '|' + p.h + '|' + p.dx + '|' + p.dy + '|' + p.s;
      if (key === last) return;
      last = key;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uBack, canvas.width, canvas.height);
      gl.uniform1f(u.uDpr, canvas.width / p.vw);
      gl.uniform4f(u.uRect, p.x, p.y, p.w, p.h);
      gl.uniform2f(u.uFocus, p.fx, p.fy);
      gl.uniform3f(u.uXform, p.dx, p.dy, p.s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    Object.defineProperty(api, 'ready', { get: function () { return ready && !lost; } });
    Object.defineProperty(api, 'loadedHeight', { get: function () { return loadedH; } });
    return api;
  }

  window.FensterGL = FensterGL;
})();
