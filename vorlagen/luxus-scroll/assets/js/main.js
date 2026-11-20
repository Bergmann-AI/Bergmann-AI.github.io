/* Vorlage "Luxus-Scroll": Scroll-Erzählung ohne Bibliothek.
   Ein Scroll-Wert folgt der echten Position weich; daraus werden alle Zustände berechnet.

   Für eine hohe Bildrate:
   - pro Bild werden nur transform und opacity gesetzt (läuft auf der Grafikkarte, kein Neuzeichnen),
   - jeder Wert wird nur geschrieben, wenn er sich geändert hat,
   - Positionen der Abschnitte werden einmal gemessen (bei Größenänderung neu), nie pro Bild,
   - die Schleife läuft nur, solange sich etwas bewegt. */
(function () {
  'use strict';

  var root = document.documentElement;
  var rm = root.classList.contains('rm');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var inOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var out3 = function (t) { return 1 - Math.pow(1 - t, 3); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };      // px auf 0,1
  var r4 = function (v) { return Math.round(v * 10000) / 10000; }; // Skalierung
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };   // Deckkraft

  // Schreib-Cache: nur ändern, was sich wirklich ändert
  function setT(el, v) { if (el._t !== v) { el._t = v; el.style.transform = v; } }
  function setO(el, v) { v = r3(v); if (el._o !== v) { el._o = v; el.style.opacity = v; } }
  function setV(el, v) { if (el._v !== v) { el._v = v; el.style.visibility = v; } }

  var head = $('.site-head');
  var motionBtn = $('.motion-btn');
  var sky = $('.sky'), photo = $('.window__photo'), glass = $('.window__glass'), heroLayer = $('.hero-layer'), heroCopy = $('.hero-copy');
  var dim = $('.sky__dim'), fadeEl = $('.sky__fade'), claim = $('.sky__claim');
  var flight = $('.flight'), jet = $('.flight__jet'), dusk = $('.flight__dusk'), title = $('.flight__title');
  var spec = $('.flight__spec'), copy = $('.flight__copy');
  var wipePlane = $('.wipe--plane'), wipePlan = $('.wipe--plan');
  var innerPlane = $('.wipe--plane .wipe__inner'), innerPlan = $('.wipe--plan .wipe__inner');
  var pass = $('.pass'), worldStage = $('.world__stage');
  var themed = $$('[data-theme]').filter(function (el) { return el !== head; });

  // stabile Viewport-Höhe (svh), damit die Adressleiste am Handy nichts verschiebt
  var probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  var vh = 0, vw = 0, mobile = false;
  var skyTop = 0, skyH = 0, flTop = 0, flH = 0, sEnd = 7, jetBig = 1, worldTop = 0, worldH = 0, jetRoom = 1e9;
  var ranges = [];

  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  /* ---------- Fensterfoto ----------
     Glasfläche im Foto (Pixel des Originals, 736 x 1313). Bei einem anderen Foto diese Punkte
     und assets/img/fenster-glas.svg neu setzen. FOCUS: Bildpunkt, der am Ende des Zooms in der Mitte steht. */
  var PHOTO_W = 736, PHOTO_H = 1313;
  var GLASS = [[170,255],[200,228],[235,215],[300,211],[330,213],[380,228],[440,248],[500,275],[545,300],[575,330],
    [595,370],[603,420],[604,500],[602,580],[598,640],[590,700],[585,760],[578,830],[565,900],[545,960],[515,1010],
    [480,1045],[420,1070],[350,1080],[280,1078],[220,1065],[180,1045],[150,1010],[132,960],[120,880],[112,780],
    [108,680],[106,580],[107,480],[112,400],[125,330],[145,285]];
  var FOCUS_DESK = [353, 702], FOCUS_MOBILE = [353, 690];
  var focus = FOCUS_DESK, win = { x: 0, y: 0, w: 1, h: 1, k: 1 };

  function inGlass(px, py) {
    var inside = false;
    for (var i = 0, j = GLASS.length - 1; i < GLASS.length; j = i++) {
      var xi = GLASS[i][0], yi = GLASS[i][1], xj = GLASS[j][0], yj = GLASS[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Kleinste Vergrößerung, bei der die Scheibe den ganzen Bildschirm abdeckt (kein Rahmen mehr zu sehen)
  function coverScale() {
    var lo = 1, hi = 60, fx = focus[0], fy = focus[1];
    for (var it = 0; it < 36; it++) {
      var s = (lo + hi) / 2, hx = vw / 2 / (win.k * s), hy = vh / 2 / (win.k * s), ok = true;
      for (var a = -4; a <= 4 && ok; a++) {
        for (var b = -4; b <= 4 && ok; b++) {
          if (Math.abs(a) !== 4 && Math.abs(b) !== 4) continue;   // nur der Rand des Bildschirms
          if (!inGlass(fx + hx * a / 4, fy + hy * b / 4)) ok = false;
        }
      }
      if (ok) hi = s; else lo = s;
    }
    return hi * 1.03;
  }

  /* ---------- Wörter einzeln aufhellen ---------- */
  var groups = $$('[data-words]').map(function (el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); words.push(s);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    return { el: el, words: words, top: 0, h: 0, last: -1 };
  });

  // Alles, was sich nur bei Größenänderungen verschiebt, einmal messen
  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    vw = document.documentElement.clientWidth;
    mobile = vw <= 760;
    skyTop = pageTop(sky); skyH = sky.offsetHeight;
    flTop = pageTop(flight); flH = flight.offsetHeight;
    worldTop = pageTop(worldStage); worldH = worldStage.offsetHeight;
    groups.forEach(function (g) { g.top = pageTop(g.el); g.h = g.el.offsetHeight; g.last = -1; });
    ranges = themed.map(function (el) { var t = pageTop(el); return { el: el, top: t, bottom: t + el.offsetHeight }; });
    focus = mobile ? FOCUS_MOBILE : FOCUS_DESK;
    win = { x: photo.offsetLeft, y: photo.offsetTop, w: photo.offsetWidth, h: photo.offsetHeight };
    win.k = win.h / PHOTO_H;
    var origin = (focus[0] / PHOTO_W * 100).toFixed(3) + '% ' + (focus[1] / PHOTO_H * 100).toFixed(3) + '%';
    photo.style.transformOrigin = origin; glass.style.transformOrigin = origin;
    sEnd = coverScale();
    jetBig = jet.offsetHeight || vh * 1.55;
    // Platz zwischen Datenblatt (links) und Text (rechts): die Flügel dürfen beides nicht berühren
    var gap = 24, specRight = spec.offsetLeft + spec.offsetWidth, copyLeft = copy.offsetLeft;
    jetRoom = 2 * Math.min(vw / 2 - specRight - gap, copyLeft - gap - vw / 2);
    wipeLast = null;
    render();
  }

  function renderWords(y) {
    if (rm) return;
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi], top = g.top - y;
      if (top + g.h < -50 || top > vh + 50) continue;
      var p = clamp((vh * 0.9 - top) / (vh * 0.5 + g.h * 0.55));
      var key = Math.round(p * 300);
      if (key === g.last) continue;
      g.last = key;
      var n = g.words.length;
      for (var i = 0; i < n; i++) setO(g.words[i], 0.22 + 0.78 * clamp((p * (n + 3) - i) / 3));
    }
  }

  /* ---------- Szene 1 + 2: Fenster, Zoom in die Scheibe ---------- */
  var skyTheme = 'dark';
  function renderSky(y) {
    var d = y - skyTop;
    if (d > skyH + vh) { setV(photo, 'hidden'); return; }
    setV(photo, 'visible');
    var z = clamp(d / (vh * 1.45));
    var ez = inOut(z);
    if (!rm) {
      // Zoom um den Blickpunkt; er wandert dabei in die Bildschirmmitte
      var s = Math.pow(sEnd, ez);
      var dx = (vw / 2 - (win.x + focus[0] * win.k)) * ez, dy = (vh / 2 - (win.y + focus[1] * win.k)) * ez;
      var t = 'translate3d(' + r1(dx) + 'px,' + r1(dy) + 'px,0) scale(' + r4(s) + ')';
      setT(photo, t); setT(glass, t);
      setT(heroCopy, 'translate3d(' + r1(-ez * 0.07 * vw) + 'px,0,0) scale(' + r4(1 + ez * 0.3) + ')');
    }
    setO(heroLayer, 1 - seg(z, 0, 0.38));
    setO(claim, seg(z, 0.8, 1));
    setO(dim, seg(d, vh * 1.7, vh * 2.3) * (1 - seg(d, skyH - vh * 2.3, skyH - vh * 1.8)));
    var fade = seg(d, skyH - vh * 2.05, skyH - vh * 1.2);
    setO(fadeEl, fade);
    skyTheme = fade > 0.5 ? 'light' : 'dark';
  }

  /* ---------- Szene 3: Jet ---------- */
  var wipeLast = null;
  function renderFlight(y) {
    if (y < flTop - vh * 1.5 || y > flTop + flH + vh) return;
    var p = clamp((y - flTop) / (flH - vh));
    // Bildbox des Jets: Bug bei 6,5 % ihrer Höhe, Heck bei 94 %, Triebwerke bei 67 %.
    // Endstellung wie im Original: Rumpflänge 0,75 Bildschirmhöhen, Bug bei 12 %, Heck über dem Button.
    var finalH = mobile ? Math.min(vh * 0.44, vw * 1.02) : Math.min(vh * 0.86, jetRoom / 0.6957);   // Spannweite = 0,6957 x Boxhöhe
    var sF = finalH / jetBig;
    var tyF = mobile ? -vh * 0.17 : -vh * 0.007;
    var s, ty;
    if (rm) { s = sF; ty = tyF; }
    else {
      // rollt groß von unten herein (Bugspitze am unteren Rand), steigt, bis die Triebwerke im unteren
      // Drittel stehen, und schrumpft dann in die Endstellung
      var k1 = inOut(seg(p, 0, 0.34)), k2 = inOut(seg(p, 0.4, 0.62));
      var sA = mobile ? 0.8 : 0.78;
      var ty0 = vh * 0.43 + 0.4348 * sA * jetBig;
      var ty1 = vh * 0.32 - 0.174 * jetBig;
      s = lerp(lerp(sA, 1, k1), sF, k2);
      ty = lerp(lerp(ty0, ty1, k1), tyF, k2);
    }
    setT(jet, 'translate(-50%,-50%) translate3d(0,' + r1(ty) + 'px,0) scale(' + r4(s) + ')');

    var tt = rm ? seg(p, 0.25, 0.38) : inOut(seg(p, 0.36, 0.56));
    // am Handy liegt das Datenblatt unter dem Jet: erst einblenden, wenn er klein geworden ist
    var ts = rm ? seg(p, 0.36, 0.5) : out3(mobile ? seg(p, 0.56, 0.66) : seg(p, 0.42, 0.6));
    setT(title, 'translateY(-58%) translate3d(0,' + (rm ? 0 : r1(tt * vh * 0.42)) + 'px,0)');
    setO(title, 1 - tt);
    var sy = rm ? 0 : r1(-(1 - ts) * vh * 0.26);
    setT(spec, (mobile ? '' : 'translateY(-52%) ') + 'translate3d(0,' + sy + 'px,0)');
    setT(copy, (mobile ? '' : 'translateY(-50%) ') + 'translate3d(0,' + sy + 'px,0)');
    if (mobile) { setO(spec, ts * (1 - seg(p, 0.7, 0.76))); setO(copy, seg(p, 0.77, 0.84)); }
    else { setO(spec, ts); setO(copy, ts); }
    setO(dusk, seg(p, 0.18, 0.55));

    // Jet -> Sitzplan: Kante wandert von unten (108 %) nach oben (-8 %)
    var w = seg(p, 0.66, 0.86);
    if (rm) { setO(wipePlane, 1 - w); setO(wipePlan, w); return; }
    // Was gerade nicht zu sehen ist, wird ausgeblendet und muss von der Grafikkarte nicht zusammengesetzt werden
    setO(wipePlan, w > 0 ? 1 : 0);
    setO(wipePlane, w < 1 ? 1 : 0);
    var edge = r1((1.08 - 1.16 * w) * jetBig);
    if (edge !== wipeLast) {
      wipeLast = edge;
      var a = 'translate3d(0,' + edge + 'px,0)', b = 'translate3d(0,' + (-edge) + 'px,0)';
      setT(wipePlane, a); setT(wipePlan, a); setT(innerPlane, b); setT(innerPlan, b);
    }
  }

  /* ---------- Szene 5: Bordkarte und Globus ---------- */
  var globe = null;
  function renderWorld(y) {
    var top = worldTop - y;
    if (top + worldH < -100 || top > vh + 100) return;
    var q = clamp((vh - top) / (vh + worldH));
    if (!rm) {
      setT(pass, 'translate3d(0,' + r1(lerp(vh * 0.14, -vh * 0.16, q)) + 'px,0) rotate(' + (Math.round(lerp(-7, 1.5, out3(clamp(q * 1.6))) * 100) / 100) + 'deg)');
      if (globe) globe.setScroll(q * 0.9);
    }
  }

  /* ---------- Farbe der Kopfzeile, aktiver Menüpunkt ---------- */
  function sectionAt(yScreen, y) {
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r.top - y <= yScreen && r.bottom - y > yScreen) return r.el;
    }
    return null;
  }
  function themeOf(el) {
    if (!el) return 'dark';
    if (el === sky) return skyTheme;
    return el.getAttribute('data-theme');
  }
  var navLinks = $$('.site-nav a').map(function (a) { return { a: a, el: document.querySelector(a.getAttribute('href')) }; });
  var navSections = { erlebnis: sky, flugzeug: flight };
  var lastHead = '', lastBtn = '', lastNav = null;
  function renderTheme(y) {
    var t = themeOf(sectionAt(40, y));
    if (t !== lastHead) { head.setAttribute('data-theme', t); lastHead = t; }
    var mid = sectionAt(vh * 0.5, y), active = null;
    for (var i = 0; i < navLinks.length; i++) {
      var n = navLinks[i], key = n.a.getAttribute('href').slice(1);
      var target = navSections[key] || n.el;
      if (target && mid && (target === mid || target.contains(mid))) active = n.a;
    }
    if (active !== lastNav) {
      navLinks.forEach(function (n) { if (n.a === active) n.a.setAttribute('aria-current', 'true'); else n.a.removeAttribute('aria-current'); });
      lastNav = active;
    }
    var b = themeOf(sectionAt(vh - 40, y));
    if (b !== lastBtn) { motionBtn.classList.toggle('is-light', b === 'light'); lastBtn = b; }
  }

  function render() {
    renderSky(cur);
    renderFlight(cur);
    renderWorld(cur);
    renderWords(cur);
    renderTheme(target);
  }

  /* ---------- Weiches Folgen der Scrollposition ---------- */
  var target = window.scrollY, cur = target, running = false, lastT = 0;
  function frame(t) {
    var dt = Math.min(0.064, (t - lastT) / 1000 || 0.016); lastT = t;
    var k = rm ? 1 : 1 - Math.pow(0.00004, dt);
    cur += (target - cur) * k;
    if (Math.abs(target - cur) < 0.4) cur = target;
    render();
    if (cur !== target) requestAnimationFrame(frame); else running = false;
  }
  function kick() {
    target = window.scrollY;
    if (Math.abs(target - cur) > vh * 3) cur = target - Math.sign(target - cur) * vh * 3; // Sprünge (Anker) kürzen
    if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', kick, { passive: true });

  // Neu messen, wenn sich Größen ändern (Fenster, Schriften, Bilder, Akkordeon) – gebündelt auf ein Bild
  var measurePending = false;
  function scheduleMeasure() {
    if (measurePending) return;
    measurePending = true;
    requestAnimationFrame(function () { measurePending = false; measure(); kick(); });
  }
  window.addEventListener('resize', scheduleMeasure);
  if (window.ResizeObserver) new ResizeObserver(scheduleMeasure).observe(document.body);

  /* ---------- Akkordeon mit Bildwechsel ---------- */
  var media = $$('[data-media] img');
  function showImage(i) {
    var next = media[i], current = media.filter(function (im) { return im.classList.contains('is-active'); })[0];
    if (!next || next === current) return;
    next.hidden = false;
    var reveal = function () {
      next.classList.add('is-entering', 'is-active');
      if (current) current.classList.remove('is-active');
      void next.offsetWidth; // Startzustand festhalten, dann einblenden
      next.classList.remove('is-entering');
      if (current) setTimeout(function () { if (!current.classList.contains('is-active')) current.hidden = true; }, rm ? 320 : 850);
    };
    if (next.decode) next.decode().then(reveal, reveal); else reveal();
  }
  $$('[data-accordion] button').forEach(function (btn, idx, all) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      all.forEach(function (b) {
        var on = b === btn && !open;
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        b.closest('.acc-item').classList.toggle('is-open', on);
        document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
      if (!open) showImage(+btn.dataset.img);
      scheduleMeasure();
    });
  });

  /* ---------- Stimmen: Spalten für endlose Schleife verdoppeln, außerhalb des Bildschirms anhalten ---------- */
  $$('.voices__col').forEach(function (col) {
    $$('.voice', col).forEach(function (card) {
      var c = card.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-clone', ''); col.appendChild(c);
    });
  });
  var voiceCols = $('[data-voices]');
  if (voiceCols && window.IntersectionObserver) {
    new IntersectionObserver(function (es) { voiceCols.classList.toggle('is-offscreen', !es[0].isIntersecting); }, { rootMargin: '100px 0px' }).observe(voiceCols);
  }

  /* ---------- Städte-Laufband (läuft nur, wenn sichtbar) ---------- */
  var tickList = $('.ticker__list'), tickN = tickList ? tickList.children.length - 1 : 0, tickI = 0, tickVisible = false;
  function tick() {
    if (!tickList || !tickVisible || root.classList.contains('is-paused') || document.hidden) return;
    tickI++;
    tickList.classList.remove('no-anim');
    tickList.style.setProperty('--ti', tickI);
    if (tickI === tickN) setTimeout(function () { tickList.classList.add('no-anim'); tickI = 0; tickList.style.setProperty('--ti', 0); }, 950);
  }
  if (!rm && tickList) {
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { tickVisible = es[0].isIntersecting; }).observe(tickList);
    else tickVisible = true;
    setInterval(tick, 2400);
  }

  /* ---------- Bewegung anhalten ---------- */
  var pauseBtns = $$('[data-pause]');
  function setPaused(p) {
    root.classList.toggle('is-paused', p);
    pauseBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', p ? 'true' : 'false');
      var label = b.querySelector('span');
      if (label) label.textContent = p ? 'Bewegung fortsetzen' : 'Bewegung anhalten';
      else b.setAttribute('aria-label', p ? 'Bewegung fortsetzen' : 'Bewegung anhalten');
    });
    if (globe) globe.setPaused(p);
  }
  pauseBtns.forEach(function (b) { b.addEventListener('click', function () { setPaused(!root.classList.contains('is-paused')); }); });

  /* ---------- Start ---------- */
  var canvas = $('.world__globe');
  if (canvas && window.Globe) globe = window.Globe(canvas, { static: rm, data: 'assets/data/land-dots.json' });

  measure();
  kick();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);

  // Bilder des Jet-Abschnitts früh dekodieren, damit beim ersten Auftauchen nichts ruckelt
  function warm() { $$('.flight__jet img').forEach(function (im) { if (im.decode) im.decode().catch(function () {}); }); }
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 1200);

  // Intro: Rollo fährt hoch, sobald das Fensterfoto bereit ist; danach Rollo-Ebenen ausblenden
  var started = false;
  function start() {
    if (started) return; started = true;
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
    setTimeout(function () { root.classList.add('intro-done'); }, rm ? 50 : 3400);
  }
  (photo.decode ? photo.decode().catch(function () {}) : Promise.resolve()).then(start);
  setTimeout(start, 1600);
})();
