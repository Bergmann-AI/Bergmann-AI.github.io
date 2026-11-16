/* Punkt-Globus mit Flugrouten (Canvas 2D, keine Bibliothek).
   Landpunkte: assets/data/land-dots.json, erzeugt aus Natural-Earth-Daten (world-atlas, gemeinfrei).
   Routen unten anpassen: [Breite, Länge] je Stadt. */
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

  function vec(lat, lon) {
    lat *= D2R; lon *= D2R;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  }

  function Globe(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var size = 0, R = 0, cx = 0, cy = 0;
    var cosLat = null, sinLat = null, lons = null, count = 0;
    var rot = opts.rotation || -1.25, tilt = opts.tilt || 0.42, speed = 0.045;
    var extraRot = 0;
    var running = false, paused = false, visible = false, raf = 0, last = 0, clock = 0, revealAt = -1;
    var routes = ROUTES.map(function (r) {
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
      return { pts: pts, n: n, a: a, b: b, phase: Math.random() };
    });

    function resize() {
      var w = canvas.clientWidth;
      if (!w) return;
      size = Math.round(w * dpr);
      if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
      R = size * 0.35; cx = size / 2; cy = size / 2;
      draw();
    }

    function load() {
      return fetch(opts.data || 'assets/data/land-dots.json').then(function (r) { return r.json(); }).then(function (d) {
        var lats = [], lo = [];
        d.rows.forEach(function (row) {
          var lat = d.lat0 - row[0] * d.step, n = row[1];
          for (var k = 2; k < row.length; k += 2) {
            for (var i = row[k]; i < row[k] + row[k + 1]; i++) { lats.push(lat); lo.push(-180 + (i + 0.5) * 360 / n); }
          }
        });
        count = lats.length;
        cosLat = new Float32Array(count); sinLat = new Float32Array(count); lons = new Float32Array(count);
        for (var i = 0; i < count; i++) { cosLat[i] = Math.cos(lats[i] * D2R); sinLat[i] = Math.sin(lats[i] * D2R); lons[i] = lo[i] * D2R; }
        resize();
      });
    }

    // Drehung um die y-Achse, dann Neigung zur Kamera
    function project(x, y, z, r, out) {
      var cr = Math.cos(r), sr = Math.sin(r);
      var x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      out[0] = x1; out[1] = y * ct - z1 * st; out[2] = y * st + z1 * ct;
      return out;
    }

    var buckets = [[], [], [], [], []];
    var tmp = [0, 0, 0];

    function draw() {
      if (!size) return;
      ctx.clearRect(0, 0, size, size);
      var r = rot + extraRot;

      // Kugel
      var g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.02);
      g.addColorStop(0, '#1d1a17'); g.addColorStop(0.7, '#13110f'); g.addColorStop(1, '#0d0c0b');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(214,176,120,0.10)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();

      // Landpunkte
      if (count) {
        for (var b = 0; b < 5; b++) buckets[b].length = 0;
        var cr = Math.cos(r), sr = Math.sin(r), ct = Math.cos(tilt), st = Math.sin(tilt);
        for (var i = 0; i < count; i++) {
          var lon = lons[i], cl = cosLat[i];
          var x = cl * Math.sin(lon), z = cl * Math.cos(lon), y = sinLat[i];
          var x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
          var y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
          if (z2 < 0.04) continue;
          var bi = z2 > 0.8 ? 4 : z2 > 0.6 ? 3 : z2 > 0.4 ? 2 : z2 > 0.2 ? 1 : 0;
          buckets[bi].push(cx + x1 * R, cy - y2 * R);
        }
        var alpha = [0.16, 0.3, 0.46, 0.62, 0.78], ds = Math.max(1.4, 1.75 * dpr), hs = ds / 2;
        for (var k = 0; k < 5; k++) {
          var arr = buckets[k];
          ctx.fillStyle = 'rgba(232,220,200,' + alpha[k] + ')';
          for (var j = 0; j < arr.length; j += 2) ctx.fillRect(arr[j] - hs, arr[j + 1] - hs, ds, ds);
        }
      }

      // Routen
      var reveal = revealAt < 0 ? 0 : clock - revealAt;
      ctx.lineCap = 'round';
      routes.forEach(function (rt, idx) {
        var grow = paused && revealAt >= 0 ? 1 : Math.max(0, Math.min(1, (reveal - idx * 0.35) / 1.6));
        if (opts.static) grow = 1;
        if (grow <= 0) return;
        var last = Math.floor(rt.n * grow);
        var px = [], py = [], vis = [];
        for (var i = 0; i <= last; i++) {
          project(rt.pts[i * 3], rt.pts[i * 3 + 1], rt.pts[i * 3 + 2], r, tmp);
          var hidden = tmp[2] < 0 && (tmp[0] * tmp[0] + tmp[1] * tmp[1]) < 1;
          px.push(cx + tmp[0] * R); py.push(cy - tmp[1] * R); vis.push(!hidden);
        }
        ctx.strokeStyle = 'rgba(201,164,110,0.85)'; ctx.lineWidth = 1.15 * dpr;
        ctx.beginPath();
        var pen = false;
        for (var j = 0; j < px.length; j++) {
          if (vis[j]) { if (!pen) { ctx.moveTo(px[j], py[j]); pen = true; } else ctx.lineTo(px[j], py[j]); }
          else pen = false;
        }
        ctx.stroke();
        // Lichtpunkt, der die Route entlangfährt
        if (grow >= 1 && !opts.static) {
          var t = ((clock / 5.5) + rt.phase) % 1, ci = Math.floor(t * rt.n);
          if (vis[ci]) {
            ctx.fillStyle = 'rgba(255,226,170,0.9)';
            ctx.beginPath(); ctx.arc(px[ci], py[ci], 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
          }
        }
        // Endpunkte
        [0, rt.n].forEach(function (e, ei) {
          if (ei === 1 && grow < 1) return;
          var v = ei === 0 ? rt.a : rt.b;
          project(v[0], v[1], v[2], r, tmp);
          if (tmp[2] < 0.02) return;
          var X = cx + tmp[0] * R, Y = cy - tmp[1] * R;
          ctx.fillStyle = 'rgba(201,164,110,0.16)';
          ctx.beginPath(); ctx.arc(X, Y, 8 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c9a46e';
          ctx.beginPath(); ctx.arc(X, Y, 4 * dpr, 0, Math.PI * 2); ctx.fill();
        });
      });
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      if (!paused) { clock += dt; rot += speed * dt; }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function update() {
      var should = visible && !document.hidden && !paused && !opts.static;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); draw(); }
    }

    var io = new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && revealAt < 0) revealAt = clock;
      update();
    }, { rootMargin: '120px 0px' });
    io.observe(canvas);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', resize);

    load().then(update);

    return {
      setPaused: function (p) { paused = p; update(); draw(); },
      setScroll: function (v) { extraRot = v; if (!running) draw(); }
    };
  }

  window.Globe = Globe;
})();
