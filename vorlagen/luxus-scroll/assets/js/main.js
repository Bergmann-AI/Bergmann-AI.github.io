/* Vorlage "Luxus-Scroll": Scroll-Erzählung ohne Bibliothek.
   Ein Scroll-Wert folgt der echten Position weich; daraus werden alle Zustände berechnet. */
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

  var head = $('.site-head');
  var motionBtn = $('.motion-btn');
  var claim = $('.sky__claim');
  var sky = $('.sky'), skyStage = $('.sky__stage'), porthole = $('.porthole'), heroLayer = $('.hero-layer'), heroCopy = $('.hero-copy');
  var flight = $('.flight'), flStage = $('.flight__stage'), jet = $('.flight__jet');
  var plane = $('.flight__plane'), plan = $('.flight__plan');
  var pass = $('.pass'), worldStage = $('.world__stage');
  var themed = $$('[data-theme]').filter(function (el) { return el !== head; });

  // stabile Viewport-Höhe (svh), damit die Adressleiste am Handy nichts verschiebt
  var probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  var vh = 0, vw = 0, mobile = false;
  var skyTop = 0, skyH = 0, flTop = 0, flH = 0, sEnd = 7, jetBig = 1;

  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  // Kleinste Skalierung, bei der das abgerundete Fensterglas den ganzen Bildschirm abdeckt
  function coverScale() {
    var pw = porthole.offsetWidth, k = pw / 400;
    var gw = 256 * k, gh = 336 * k, gr = 98 * k;
    var hx = vw / 2, hy = vh / 2;
    var lo = 1, hi = 60;
    for (var i = 0; i < 40; i++) {
      var s = (lo + hi) / 2, a = gw * s / 2, b = gh * s / 2, r = gr * s;
      var ok;
      if (hx > a || hy > b) ok = false;
      else if (hx <= a - r || hy <= b - r) ok = true;
      else { var dx = hx - (a - r), dy = hy - (b - r); ok = dx * dx + dy * dy <= r * r; }
      if (ok) hi = s; else lo = s;
    }
    return hi * 1.06;
  }

  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    vw = document.documentElement.clientWidth;
    mobile = vw <= 760;
    skyTop = pageTop(sky); skyH = sky.offsetHeight;
    flTop = pageTop(flight); flH = flight.offsetHeight;
    sEnd = coverScale();
    jetBig = jet.offsetHeight || vh * 1.75;
    render(true);
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
    return { el: el, words: words, last: -1 };
  });

  function renderWords() {
    if (rm) return;
    groups.forEach(function (g) {
      var r = g.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = clamp((vh * 0.9 - r.top) / (vh * 0.5 + r.height * 0.55));
      var key = Math.round(p * 400);
      if (key === g.last) return;
      g.last = key;
      var n = g.words.length;
      for (var i = 0; i < n; i++) {
        var f = clamp((p * (n + 3) - i) / 3);
        g.words[i].style.setProperty('--wo', (0.22 + 0.78 * f).toFixed(3));
      }
    });
  }

  /* ---------- Szene 1 + 2: Fenster, Zoom, Wolken ---------- */
  var skyTheme = 'dark';
  function renderSky(y) {
    var d = y - skyTop;
    if (d > skyH + vh) return;
    var z = clamp(d / (vh * 1.45));
    var ez = inOut(z);
    var st = skyStage.style;
    if (rm) {
      porthole.style.setProperty('--ps', '1');
      porthole.style.opacity = (1 - seg(z, 0.15, 0.6)).toFixed(3);
      st.setProperty('--cs', '1');
      st.setProperty('--cy', '0vh');
    } else {
      porthole.style.setProperty('--ps', Math.pow(sEnd, ez).toFixed(4));
      st.setProperty('--cs', (1.1 - 0.1 * ez).toFixed(4));
      st.setProperty('--cy', ((1 - ez) * 7).toFixed(3) + 'vh');
      heroCopy.style.setProperty('--hx', (-ez * 7).toFixed(2) + 'vw');
      heroCopy.style.setProperty('--hs', (1 + ez * 0.3).toFixed(4));
    }
    porthole.style.visibility = z >= 0.995 ? 'hidden' : 'visible';
    heroLayer.style.setProperty('--hero-o', (1 - seg(z, 0, 0.38)).toFixed(3));
    claim.style.setProperty('--claim', seg(z, 0.8, 1).toFixed(3));
    st.setProperty('--dim', (seg(d, vh * 1.7, vh * 2.3) * (1 - seg(d, skyH - vh * 2.3, skyH - vh * 1.8))).toFixed(3));
    var fade = seg(d, skyH - vh * 2.05, skyH - vh * 1.2);
    st.setProperty('--fade', fade.toFixed(3));
    skyTheme = fade > 0.5 ? 'light' : 'dark';
  }

  /* ---------- Szene 3: Jet ---------- */
  function renderFlight(y) {
    var p = clamp((y - flTop) / (flH - vh));
    var finalH = mobile ? Math.min(vh * 0.44, vw * 1.02) : Math.min(vh * 0.86, vw * 0.62);
    var sF = finalH / jetBig;
    var tyF = mobile ? -vh * 0.17 : vh * 0.015;
    var s, ty;
    if (rm) { s = sF; ty = tyF; }
    else {
      var k1 = inOut(seg(p, 0, 0.34)), k2 = inOut(seg(p, 0.4, 0.62));
      var ty0 = vh * 0.36 + 0.47 * sF * jetBig, ty1 = vh * 0.06;
      s = lerp(lerp(sF, 1, k1), sF, k2);
      ty = lerp(lerp(ty0, ty1, k1), tyF, k2);
    }
    jet.style.setProperty('--jy', ty.toFixed(1) + 'px');
    jet.style.setProperty('--js', s.toFixed(4));

    var tt = rm ? seg(p, 0.25, 0.38) : inOut(seg(p, 0.36, 0.56));
    var ts = rm ? seg(p, 0.36, 0.5) : out3(seg(p, 0.42, 0.6));
    var fs = flStage.style;
    fs.setProperty('--tty', rm ? '0px' : (tt * vh * 0.42).toFixed(1) + 'px');
    fs.setProperty('--tto', (1 - tt).toFixed(3));
    fs.setProperty('--sy', rm ? '0px' : (-(1 - ts) * vh * 0.26).toFixed(1) + 'px');
    fs.setProperty('--dusk', seg(p, 0.18, 0.55).toFixed(3));
    var w = seg(p, 0.66, 0.86);
    if (mobile) {
      fs.setProperty('--so', (ts * (1 - seg(p, 0.7, 0.76))).toFixed(3));
      fs.setProperty('--co', seg(p, 0.77, 0.84).toFixed(3));
    } else fs.setProperty('--so', ts.toFixed(3));
    if (rm) { plane.style.opacity = (1 - w).toFixed(3); plan.style.opacity = w.toFixed(3); }
    else jet.style.setProperty('--wipe', (-12 + 124 * w).toFixed(2) + '%');
  }

  /* ---------- Szene 5: Bordkarte und Globus ---------- */
  var globe = null;
  function renderWorld() {
    var r = worldStage.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    var q = clamp((vh - r.top) / (vh + r.height));
    if (!rm) {
      pass.style.setProperty('--py', lerp(vh * 0.14, -vh * 0.16, q).toFixed(1) + 'px');
      pass.style.setProperty('--pr', lerp(-7, 1.5, out3(clamp(q * 1.6))).toFixed(2) + 'deg');
      if (globe) globe.setScroll(q * 0.9);
    }
  }

  /* ---------- Farbe der Kopfzeile ---------- */
  function sectionAt(yScreen) {
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= yScreen && r.bottom > yScreen) return themed[i];
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
  function renderTheme() {
    var t = themeOf(sectionAt(40));
    if (t !== lastHead) { head.setAttribute('data-theme', t); lastHead = t; }
    // aktiver Menüpunkt: Abschnitt in der Bildschirmmitte
    var mid = sectionAt(vh * 0.5), active = null;
    navLinks.forEach(function (n) {
      var key = n.a.getAttribute('href').slice(1);
      var target = navSections[key] || n.el;
      if (target && mid && (target === mid || target.contains(mid))) active = n.a;
    });
    if (active !== lastNav) {
      navLinks.forEach(function (n) { if (n.a === active) n.a.setAttribute('aria-current', 'true'); else n.a.removeAttribute('aria-current'); });
      lastNav = active;
    }
    var b = themeOf(sectionAt(vh - 40));
    if (b !== lastBtn) { motionBtn.classList.toggle('is-light', b === 'light'); lastBtn = b; }
  }

  function render() {
    renderSky(cur);
    renderFlight(cur);
    renderWorld();
    renderWords();
    renderTheme();
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
  window.addEventListener('resize', function () { measure(); kick(); });

  /* ---------- Akkordeon mit Bildwechsel ---------- */
  var media = $$('[data-media] img');
  function showImage(i) {
    var next = media[i], cur = media.filter(function (im) { return im.classList.contains('is-active'); })[0];
    if (!next || next === cur) return;
    next.hidden = false;
    var reveal = function () {
      next.classList.add('is-entering', 'is-active');
      if (cur) cur.classList.remove('is-active');
      void next.offsetWidth; // Startzustand festhalten, dann einblenden
      next.classList.remove('is-entering');
      if (cur) setTimeout(function () { if (!cur.classList.contains('is-active')) cur.hidden = true; }, rm ? 320 : 850);
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
      measure();
    });
  });

  /* ---------- Stimmen: Spalten für endlose Schleife verdoppeln ---------- */
  $$('.voices__col').forEach(function (col) {
    $$('.voice', col).forEach(function (card) {
      var c = card.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-clone', ''); col.appendChild(c);
    });
  });

  /* ---------- Städte-Laufband ---------- */
  var tickList = $('.ticker__list'), tickN = tickList ? tickList.children.length - 1 : 0, tickI = 0, tickTimer = 0;
  function tick() {
    if (!tickList || root.classList.contains('is-paused') || document.hidden) return;
    tickI++;
    tickList.classList.remove('no-anim');
    tickList.style.setProperty('--ti', tickI);
    if (tickI === tickN) setTimeout(function () { tickList.classList.add('no-anim'); tickI = 0; tickList.style.setProperty('--ti', 0); }, 950);
  }
  if (!rm && tickList) tickTimer = setInterval(tick, 2400);

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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);

  // Intro: Rollo fährt hoch, sobald das Wolkenbild bereit ist
  var cloudImg = $('.sky__clouds img');
  var started = false;
  function start() { if (started) return; started = true; requestAnimationFrame(function () { root.classList.add('is-ready'); }); }
  if (cloudImg && !cloudImg.complete) {
    cloudImg.addEventListener('load', start, { once: true });
    cloudImg.addEventListener('error', start, { once: true });
    setTimeout(start, 1600);
  } else start();
})();
