/* Bergmann AI, /websites/: das Handy mit der Vorlage.

   Ein Handy (.device, fest im Fenster) liegt zwischen dem Grund der Abschnitte und ihrem Text. Seine Plätze sind im
   Layout Handys aus HTML (.phone[data-pose]): hero im Einstieg, wandel in der Szene. Ohne JavaScript zeigen sie ein
   Standbild der Vorlage, mit JavaScript halten sie nur den Platz frei.
   Ab 900px Breite (Laptop) steht das Handy fest an seiner Stelle aus dem Einstieg und bewegt sich beim Scrollen nicht;
   nur die Vorlage darin läuft, bis zum Ende der Szene einmal ganz durch. Dann scrollt es mit dem Ende der Szene
   hinaus. Die Abschnitte danach haben kein Handy (Wunsch des Inhabers, 25.11.2026).
   Unter 900px Breite (alles untereinander) gibt es nur das Handy aus dem Einstieg (Wunsch des Inhabers, 23.11.2026):
   Es scrollt mit dem Einstieg hoch und bleibt oben unter der Kopfzeile stehen. Dort wird es zuerst beim Scrollen fast
   bildschirmhoch, die Seite steht still (die Szene beginnt mit einer Fläche ohne Text), und die ganze Vorlage läuft
   darin bis zu ihrem Schluss. Dann wird es wieder klein, die Überschrift der Szene kommt, und Schritte und Knopf laufen
   darunter durch; sie blenden aus, bevor sie unter das Handy kommen (Wunsch des Inhabers, 25.11.2026). Mit dem Knopf
   am Ende der Szene scrollt es hinaus.

   Im Bildschirm läuft die echte Vorlage Luxus-Scroll (gleiche Herkunft, also steuerbar, mit ?handy=1 in der
   Handy-Ansicht). Sie scrollt mit der Seite. Das Handy dreht sich nicht (Wunsch des Inhabers, 22.11.2026).

   Leistung: Positionen werden nur bei Größenänderung gemessen. Pro Bild ändert sich nur transform des Handys, die
   Deckkraft seines Schattens und die Scrollposition der Vorlage; gerechnet wird nur, solange sich etwas bewegt. */
(function () {
  'use strict';

  var root = document.documentElement;
  var device = document.querySelector('.device');
  if (!device || !window.requestAnimationFrame || !document.querySelector('.phone[data-pose]')) return;
  var reduce = root.classList.contains('rm');
  var frameEl = device.querySelector('.device__site');
  var shadow = device.querySelector('.device__shadow');
  var BASE_H = 776, BASE_W = 360;

  var clamp = function (x, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, x)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var ss = function (a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  var pageTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };

  /* ---------- Messen: Abschnitte und Handy-Plätze (nur bei Größenänderung) ---------- */
  var probe = document.createElement('div');   // stabile Bildschirmhöhe (svh): die Adressleiste am Handy verschiebt nichts
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  var nav = document.querySelector('.nav');
  var vw = 0, vh = 0, navH = 72, wide = true, sections = [], keys = [];

  function sec(id) { for (var i = 0; i < sections.length; i++) if (sections[i].id === id) return sections[i]; return null; }

  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    vw = document.documentElement.clientWidth;
    navH = nav ? nav.offsetHeight : 72;
    wide = window.matchMedia('(min-width: 900px)').matches;
    sections = Array.prototype.map.call(document.querySelectorAll('main > section, footer.closing'), function (el) {
      var t = pageTop(el);
      return { id: el.id, light: el.getAttribute('data-theme') === 'light' ? 1 : 0, top: t, bottom: t + el.offsetHeight };
    });

    // wo das Handy steht und wie lange
    keys = [];
    if (!wide) narrowKey(); else wideKey();
    measureFlow();
    mapTemplate();
  }

  // Laptop (ab 900px): das Handy bleibt fest an seiner Stelle aus dem Einstieg (dock = seine Lage oben auf der Seite),
  // vom ersten Pixel bis zum Ende der Szene; dann scrollt es mit ihr hinaus, unten bündig mit ihrem Ende.
  function wideKey() {
    var ph = document.querySelector('.phone--hero'), scene = document.querySelector('.wandel');
    if (!ph || !ph.offsetParent || !scene) return;
    var pr = ph.getBoundingClientRect(), top = pr.top + window.scrollY;
    var k = { pose: 'hero', fixed: true, sticky: true, N: top, dock: top, Hs: pr.height, dy: 0, x: pr.left + pr.width / 2, h: pr.height };
    // Unterkante: das Ende des Inhalts der Szene (ohne ihren unteren Verlauf), damit der Schatten des Handys
    // schon verschwunden ist, wenn der nächste Abschnitt oben ankommt
    var padB = parseFloat(getComputedStyle(scene).paddingBottom) || 0;
    k.B = Math.max(top + pr.height, pageTop(scene) + scene.offsetHeight - padB);
    k.y0 = 0;
    k.y1 = Math.max(0, k.B - k.Hs - k.dock);   // ab hier scrollt es hinaus
    keys.push(k);
  }

  // Schmale Bildschirme: nur das Handy aus dem Einstieg, wie mit position: sticky. Es scrollt mit dem Einstieg hoch,
  // bleibt --pin unter der Kopfzeile stehen und lässt erst los, wenn der Knopf am Ende der Szene noch ganz darunter steht.
  // Vorführung (show) am Anfang der Szene, auf der Fläche ohne Text vor ihrer Überschrift (.wandel oben 720svh):
  // ab g0 (oben angekommen) wächst das Handy bis g1 auf fast Bildschirmhöhe, bis t1 läuft die ganze Vorlage, ab s0
  // wird es wieder klein, und mit s1 kommt die Überschrift von unten. Bei "Bewegung reduzieren" bleibt es dabei klein.
  // Auf niedrigen Bildschirmen (--dock: 0, Handy quer) heftet es nicht an und scrollt mit dem Einstieg weg.
  function narrowKey() {
    var ph = document.querySelector('.phone--hero');
    if (!ph || !ph.offsetParent) return;
    var cs = getComputedStyle(root);
    var pin = parseFloat(cs.getPropertyValue('--pin')) || 16;
    var gut = parseFloat(cs.getPropertyValue('--gut')) || 24;
    var dock = cs.getPropertyValue('--dock').trim() !== '0';
    var pr = ph.getBoundingClientRect();
    var cta = document.querySelector('.wandel__cta'), head = document.querySelector('.wandel__head');
    var k = { pose: 'hero', scene: true, sticky: true, N: pr.top + window.scrollY - pin, Hs: pr.height + 2 * pin, dy: pin, x: pr.left + pr.width / 2, h: pr.height };
    k.B = Math.max(k.N + k.Hs, dock && cta ? pageTop(cta) - 80 : 0);
    if (dock && head) {
      var g0 = k.N - navH;                       // das Handy ist oben angekommen
      var s1 = pageTop(head) - vh * 0.95;        // gleich danach kommt die Überschrift von unten herein
      // groß: höchstens Grundmaß (scharf), unter der Kopfzeile mit Abstand, zwischen den Rändern der Seite
      var h = reduce ? k.h : Math.min(BASE_H, vh - navH - 2 * pin, (vw - 2 * gut) * BASE_H / BASE_W);
      var c = reduce ? navH + pin + k.h / 2 : navH + (vh - navH) / 2;
      var s0 = Math.max(g0, s1 - vh * 0.45);
      var t1 = Math.max(g0, s0 - vh * 0.12);
      var g1 = Math.min(t1, g0 + vh * 0.45);
      if (s1 > g0 + vh) k.show = { g0: g0, g1: g1, t1: t1, s0: s0, s1: s1, h: h, c: c };   // nur mit der Fläche
    }
    k.y0 = 0;
    k.y1 = Math.max(0, k.B - k.Hs - navH);
    keys.push(k);
  }

  // Was in der Szene unter dem angehefteten Handy durchlaufen würde, blendet vorher aus (nur schmale Bildschirme)
  var flowEls = [], flowTops = [];
  function measureFlow() {
    // Block für Block, damit keine große Lücke entsteht: Überschrift, Schritt-Titel, Schritt-Text und Knopf einzeln
    var els = wide ? [] : Array.prototype.slice.call(document.querySelectorAll('.wandel__head, .wandel .step h3, .wandel .step p, .wandel__cta'));
    flowEls.forEach(function (el) { if (els.indexOf(el) < 0) { el.style.opacity = ''; el._fo = 1; } });
    flowEls = els;
    flowTops = els.map(pageTop);
  }

  // Lage einer Stelle im Fenster bei Scrollposition y (angeheftete Stellen wie position: sticky)
  function rectAt(k, y) {
    if (k.show) {
      var s = k.show, dock = clamp(k.N, y + navH, Math.max(k.N, k.B - k.Hs)) - y + k.dy + k.h / 2;   // Mitte, angeheftet
      if (y <= s.g0 || y >= s.s1) return { x: k.x, y: dock, h: k.h };
      var w = y < s.s0 ? ss(s.g0, s.g1, y) : 1 - ss(s.s0, s.s1, y);
      return { x: k.x, y: mix(dock, s.c, w), h: mix(k.h, s.h, w) };
    }
    var top = k.N;
    if (k.sticky) top = clamp(k.N, y + (k.dock !== undefined ? k.dock : navH), Math.max(k.N, k.B - k.Hs));
    return { x: k.x, y: top - y + k.dy + k.h / 2, h: k.h };
  }

  // Ziel bei Scrollposition y: zwischen zwei Stellen derselben Spalte gleitet das Handy weich (Smoothstep), ohne
  // Drehung; zwischen verschiedenen Spalten blendet es aus und an der nächsten Stelle wieder ein (o = Deckkraft)
  function aim(y) {
    if (!keys.length) return null;
    var i = 0;
    while (i < keys.length - 1 && y >= keys[i + 1].y0) i++;
    var a = keys[i], b = keys[i + 1];
    var ra = rectAt(a, y);
    ra.o = 1; ra.at = i;
    if (!b || y <= a.y1) return ra;
    var rb = rectAt(b, y), w = ss(a.y1, b.y0, y);
    if (Math.abs(ra.x - rb.x) > 60) {
      var r = w < 0.5 ? ra : rb;
      return { x: r.x, y: r.y, h: r.h, o: clamp(Math.abs(w - 0.5) / 0.2), at: w < 0.5 ? i : i + 1 };
    }
    return { x: mix(ra.x, rb.x, w), y: mix(ra.y, rb.y, w), h: mix(ra.h, rb.h, w), o: 1, at: i };
  }

  /* ---------- Die Vorlage im Bildschirm ---------- */
  var tWin = null, tDoc = null, tMap = [], tMax = 0, tCur = 0, tSet = -1, tPaused = null, idle = 0;

  // Dauerbewegungen der Vorlage (der drehende Globus, das Städte-Laufband) laufen nur beim Scrollen und ruhen 3 s danach;
  // dafür drückt die Seite den eigenen Pause-Schalter der Vorlage (im Handy ist er nicht bedienbar)
  function pauseTemplate(p) {
    if (!tDoc || tPaused === p) return;
    try {
      var btn = tDoc.querySelector('[data-pause]');
      if (!btn) return;
      if (tDoc.documentElement.classList.contains('is-paused') !== p) btn.click();
      tPaused = p;
    } catch (e) {}
  }
  function wake() {
    pauseTemplate(false);
    clearTimeout(idle);
    idle = setTimeout(function () { pauseTemplate(true); }, 3000);
  }

  // Ankerpunkte: Seite (Scrollposition) -> Vorlage (Scrollposition). Die Szene zeigt Fenster, Flug und Jet;
  // jeder weitere Abschnitt der Seite einen weiteren Abschnitt der Vorlage; am Ende der Seite ihr Schluss.
  function mapTemplate() {
    tMap = [];
    if (!tWin || !tDoc) return;
    try {
      tMax = Math.max(0, tDoc.documentElement.scrollHeight - tWin.innerHeight);
      var at = function (id, f) {
        var el = tDoc.getElementById(id);
        if (!el) return null;
        return clamp(el.getBoundingClientRect().top + tWin.scrollY + (f || 0) * el.offsetHeight, 0, tMax);
      };
      var maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var wk = null, hk = null;
      keys.forEach(function (k) { if (k.pose === 'wandel' || k.scene) wk = k; if (k.pose === 'hero') hk = k; });
      // Die Vorlage beginnt erst zu scrollen, wenn ihr Handy zu sehen ist: am Desktop sofort (es steht ganz im ersten
      // Bild), auf schmalen Bildschirmen erst, wenn das ganze Handy im Bild ist (Wunsch des Inhabers, 23.11.2026)
      var startY = !hk && wk ? Math.max(0, wk.N - vh * 0.75)
        : hk && hk.scene ? Math.max(0, hk.N + hk.dy + hk.h + 12 - vh) : 0;
      var pts = [[startY, 0]];
      var add = function (py, ty) { if (py !== null && ty !== null && isFinite(py) && isFinite(ty)) pts.push([py, ty]); };
      var bord = at('an-bord'), welt = at('welt'), schluss = at('anfrage');
      var kabine = bord !== null ? Math.max(0, bord - tWin.innerHeight * 0.25) : tMax * 0.55;
      if (hk && hk.show) {
        // schmal: in der Vorführung läuft die ganze Vorlage; danach steht sie an ihrem Schluss
        add(hk.show.g0, 0);
        add(hk.show.t1, tMax);
      } else if (hk && hk.fixed) {
        // Laptop: die ganze Vorlage, während das Handy fest steht; kurz bevor es hinausscrollt, ist sie am Schluss
        add(Math.max(1, hk.y1 - vh * 0.1), tMax);
      } else {
        if (wk) add(wk.y1, kabine);
        var l = sec('leistungen'), ab = sec('ablauf'), pr = sec('preise'), fr = sec('fragen');
        if (l) add(l.top, bord);
        if (ab) add(ab.top, welt);
        if (pr && welt !== null && schluss !== null) add(pr.top, mix(welt, schluss, 0.62));
        if (fr) add(fr.top, tMax);
      }
      add(maxY, tMax);
      // nur wachsende Punkte behalten (am Handy fallen Abschnitte zusammen)
      pts.sort(function (a, b) { return a[0] - b[0]; });
      var last = [-1, -1];
      pts.forEach(function (p) {
        var ty = Math.max(p[1], last[1]);
        if (p[0] > last[0]) { tMap.push([p[0], ty]); last = [p[0], ty]; }
      });
    } catch (e) { tMap = []; }
  }

  function templateAt(y) {
    if (!tMap.length) return 0;
    if (y <= tMap[0][0]) return tMap[0][1];
    for (var i = 0; i < tMap.length - 1; i++) {
      if (y < tMap[i + 1][0]) return mix(tMap[i][1], tMap[i + 1][1], (y - tMap[i][0]) / (tMap[i + 1][0] - tMap[i][0]));
    }
    return tMap[tMap.length - 1][1];
  }

  function loadTemplate() {
    if (!frameEl || frameEl.getAttribute('src')) return;
    frameEl.addEventListener('load', function () {
      try {
        tWin = frameEl.contentWindow;
        tDoc = frameEl.contentDocument;
        // ohne Rollbalken und ohne weiches Scrollen: die Seite steuert die Scrollposition selbst. Den Abschnitt
        // "Stimmen unserer Gäste" zeigt das Handy nicht: Dort stehen in der Vorlage nur Platzhalter.
        var st = tDoc.createElement('style');
        st.textContent = 'html{scrollbar-width:none;scroll-behavior:auto!important}html::-webkit-scrollbar{display:none}#stimmen{display:none!important}';
        tDoc.head.appendChild(st);
        try { tWin.dispatchEvent(new Event('resize')); } catch (e) {}
        mapTemplate();
        tSet = -1;
        wake();
        // erst zeigen, wenn die Vorlage ihr erstes Bild gezeichnet hat (dann gleicht es dem Standbild)
        tWin.requestAnimationFrame(function () { tWin.requestAnimationFrame(function () {
          device.classList.add('is-loaded');
          var poster = device.querySelector('.device__poster');
          if (poster) setTimeout(function () { poster.remove(); }, 900);
        }); });
        // Schriften und Bilder der Vorlage können die Höhe noch ändern
        tWin.addEventListener('load', function () { mapTemplate(); kick(); });
        if (tDoc.fonts && tDoc.fonts.ready) tDoc.fonts.ready.then(function () { mapTemplate(); kick(); });
        kick();
      } catch (e) { tWin = tDoc = null; }
    });
    frameEl.src = frameEl.getAttribute('data-src');
  }

  /* ---------- Bild für Bild ---------- */
  var cur = { x: 0, y: 0, h: 0, light: 0 };
  var first = true, last = performance.now(), raf = 0, dirty = true, onScreen = true, pageLoaded = false;
  var lastT = '', lastShadow = -1, lastO = -1, lastAt = -1, lastShow = false;

  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, now - last) / 1000); last = now;
    var y = window.scrollY;
    var tg = aim(y);
    if (!tg) return false;
    // weiches Gleiten: das Handy folgt seinem Ziel mit kurzer Verzögerung (bei "Bewegung reduzieren" direkt);
    // springt es beim Ausblenden an eine andere Stelle, steht es dort sofort
    var jump = tg.at !== lastAt && lastAt !== -1 && tg.o < 0.5;
    lastAt = tg.at;
    var k = first || reduce || jump ? 1 : 1 - Math.exp(-dt / 0.075);
    cur.x += (tg.x - cur.x) * k; cur.y += (tg.y - cur.y) * k; cur.h += (tg.h - cur.h) * k;
    var moving = Math.abs(tg.x - cur.x) + Math.abs(tg.y - cur.y) + Math.abs(tg.h - cur.h) > 0.15;
    if (!moving) { cur.x = tg.x; cur.y = tg.y; cur.h = tg.h; }

    // Schatten nur auf hellem Grund
    var page = y + cur.y, light = 0;
    for (var i = 0; i < sections.length; i++) if (page >= sections[i].top && page < sections[i].bottom) { light = sections[i].light; break; }
    var kl = first ? 1 : 1 - Math.exp(-dt / 0.25);
    cur.light += (light - cur.light) * kl;
    if (Math.abs(light - cur.light) > 0.004) moving = true; else cur.light = light;

    var s = cur.h / BASE_H;
    var t = 'translate3d(' + (cur.x - BASE_W * s / 2).toFixed(2) + 'px,' + (cur.y - cur.h / 2).toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';
    if (t !== lastT) { device.style.transform = t; lastT = t; }
    var so = Math.round((0.22 + 0.78 * cur.light) * 100) / 100;
    if (so !== lastShadow && shadow) { shadow.style.opacity = so; lastShadow = so; }
    var o = Math.round(tg.o * 100) / 100;
    if (o !== lastO) { device.style.opacity = o; lastO = o; }
    // in der Vorführung (schmal) bleibt die Sprechblase des Chatbots weg, damit die ganze Vorlage zu sehen ist
    var sw = keys[0] && keys[0].show, showing = !!sw && y >= sw.g0 && y < sw.s1;
    if (showing !== lastShow) { lastShow = showing; device.classList.toggle('is-show', showing); }

    var half = cur.h * 0.6;
    onScreen = o > 0 && cur.x + half > -40 && cur.x - half < vw + 40 && cur.y + half > -40 && cur.y - half < vh + 40;
    if (pageLoaded && frameEl && !frameEl.getAttribute('src') && cur.y - half < vh * 2.2) loadTemplate();

    // die Vorlage scrollt mit; außerhalb des Bildes springt sie still auf ihr Ziel
    if (tWin && tMap.length) {
      var ty = templateAt(y);
      var kt = first || reduce || !onScreen ? 1 : 1 - Math.exp(-dt / 0.09);
      tCur += (ty - tCur) * kt;
      if (Math.abs(ty - tCur) < 0.5) tCur = ty; else moving = true;
      var ry = Math.round(tCur);
      if (ry !== tSet) {
        tSet = ry;
        try { tWin.scrollTo({ top: ry, left: 0, behavior: 'instant' }); } catch (e) { tWin.scrollTo(0, ry); }
      }
    }

    // schmale Bildschirme: Text der Szene blendet aus, bevor er die Unterkante des Handys erreicht
    if (flowEls.length) {
      var edge = cur.y + cur.h / 2 + 12;
      for (var f = 0; f < flowEls.length; f++) {
        var fo = Math.round(clamp((flowTops[f] - y - edge) / 64) * 100) / 100;
        if (flowEls[f]._fo !== fo) { flowEls[f]._fo = fo; flowEls[f].style.opacity = fo === 1 ? '' : fo; }
      }
    }
    first = false;
    return moving;
  }

  function loop(now) {
    raf = 0;
    var moving = frame(now);
    if (!document.hidden && (moving || dirty)) { dirty = false; raf = requestAnimationFrame(loop); }
  }
  function kick() { dirty = true; if (!raf && !document.hidden) raf = requestAnimationFrame(loop); }

  window.addEventListener('scroll', function () { kick(); if (tDoc) wake(); }, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); kick(); }, 120); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  /* ---------- Start ---------- */
  measure();
  frame(performance.now());
  root.classList.add('is-live');
  // Aufbau beim Laden: nur, wenn man oben im Einstieg startet
  if (!reduce && window.scrollY < vh * 0.4) device.classList.add('is-intro');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); kick(); });
  // die Vorlage lädt erst nach der eigenen Seite und nur, wenn das Handy schon im Bild oder nah daran ist
  // (sonst, etwa beim Neuladen weiter unten, sobald es näher kommt)
  var ready = function () { pageLoaded = true; measure(); kick(); };
  if (document.readyState === 'complete') setTimeout(ready, 60);
  else window.addEventListener('load', function () { setTimeout(ready, 60); });
  kick();

  window.__handy = {
    keys: function () { return keys.map(function (k) {
      var s = k.show ? { g0: Math.round(k.show.g0), g1: Math.round(k.show.g1), t1: Math.round(k.show.t1), s0: Math.round(k.show.s0), s1: Math.round(k.show.s1), h: Math.round(k.show.h) } : null;
      return { pose: k.pose, y0: Math.round(k.y0), y1: Math.round(k.y1), h: Math.round(k.h), show: s };
    }); },
    map: function () { return tMap.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }); },
    state: function () { return { x: Math.round(cur.x), y: Math.round(cur.y), h: Math.round(cur.h), t: Math.round(tCur), onScreen: onScreen, loaded: device.classList.contains('is-loaded') }; },
  };
})();
