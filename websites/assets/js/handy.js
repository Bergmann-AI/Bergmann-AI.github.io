/* Bergmann AI, /websites/: das Handy mit der Vorlage, das über die ganze Seite gleitet.

   Ein Handy (.device, fest im Fenster) liegt zwischen dem Grund der Abschnitte und ihrem Text. Jede Stelle, an der es
   stehen soll, ist im Layout ein Handy aus HTML (.phone[data-pose]): Ohne JavaScript ist das das Bild (Standbild der
   Vorlage), mit JavaScript gleitet dieses eine Handy genau dorthin und die HTML-Handys halten nur den Platz frei.
     hero    Einstieg, rechts neben dem Text
     wandel  die Szene "Vorlage": angeheftet, solange die Schritte daneben laufen
     turn    "Im Preis enthalten" (zwei Bildschirme), angeheftet
     front   Ablauf
     price   Preise, zwischen den Angeboten
     close   Abschluss, rechts neben dem Text
   Liegen zwei Stellen in derselben Spalte, gleitet das Handy von einer zur nächsten. Wechselt es die Spalte (Ablauf ->
   Preise -> Abschluss), fährt es nicht quer über Text: Es scrollt mit seinem Platz hinaus, blendet aus und an der
   nächsten Stelle wieder ein.
   Unter 900px Breite (alles untereinander) gibt es nur das Handy aus dem Einstieg (Wunsch des Inhabers, 23.11.2026):
   Es scrollt mit dem Einstieg hoch, bleibt in der Szene oben unter der Kopfzeile stehen und scrollt mit ihrem Ende
   hinaus. Überschrift, Schritte und Knopf der Szene blenden aus, bevor sie unter ihm durchlaufen.

   Im Bildschirm läuft die echte Vorlage Luxus-Scroll (gleiche Herkunft, also steuerbar). Sie scrollt mit der Seite:
   Während der Szene läuft sie vom Fenster über den Flug bis zur Kabine, danach Abschnitt für Abschnitt weiter bis zu
   ihrem Schluss, wenn die Seite unten ankommt. Das Handy dreht sich nicht (Wunsch des Inhabers, 22.11.2026).

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

    // jede sichtbare Handy-Stelle: wo das HTML-Handy liegt, ob es angeheftet ist und wie lange
    keys = [];
    if (!wide) narrowKey();
    else Array.prototype.forEach.call(document.querySelectorAll('.phone[data-pose]'), function (ph) {
      if (!ph.offsetParent) return;   // ausgeblendet (unter 1024px ab dem dritten Abschnitt)
      var pose = ph.getAttribute('data-pose');
      var holder = ph.closest('.wandel__stage, .spot--sticky');
      var k, pr;
      if (holder) {
        holder.style.position = 'static';
        var hr = holder.getBoundingClientRect();
        pr = ph.getBoundingClientRect();
        holder.style.position = '';
        var cb = holder.parentElement.getBoundingClientRect();
        k = { sticky: true, N: hr.top + window.scrollY, Hs: hr.height, B: cb.bottom + window.scrollY, dy: pr.top - hr.top, x: pr.left + pr.width / 2, h: pr.height };
      } else {
        pr = ph.getBoundingClientRect();
        k = { sticky: false, N: pr.top + window.scrollY, Hs: pr.height, B: 0, dy: 0, x: pr.left + pr.width / 2, h: pr.height };
      }
      k.pose = pose;
      var s = null;
      for (var i = 0; i < sections.length; i++) if (k.N >= sections[i].top && k.N < sections[i].bottom) { s = sections[i]; break; }
      s = s || sections[0];
      if (pose === 'hero') { k.y0 = 0; k.y1 = 0; }
      else if (k.sticky) { k.y0 = s.top; k.y1 = Math.max(s.top, k.B - k.Hs - navH); }
      else { k.y0 = k.y1 = s.top; }
      keys.push(k);
    });
    keys.sort(function (a, b) { return a.y0 - b.y0; });
    measureFlow();
    mapTemplate();
  }

  // Schmale Bildschirme: nur das Handy aus dem Einstieg, wie mit position: sticky. Es scrollt mit dem Einstieg hoch,
  // bleibt --pin unter der Kopfzeile stehen und lässt erst los, wenn der Knopf am Ende der Szene noch ganz darunter steht.
  // Auf niedrigen Bildschirmen (--dock: 0, Handy quer) heftet es nicht an und scrollt mit dem Einstieg weg.
  function narrowKey() {
    var ph = document.querySelector('.phone--hero');
    if (!ph || !ph.offsetParent) return;
    var cs = getComputedStyle(root);
    var pin = parseFloat(cs.getPropertyValue('--pin')) || 16;
    var dock = cs.getPropertyValue('--dock').trim() !== '0';
    var pr = ph.getBoundingClientRect();
    var end = document.querySelector('.wandel__cta') || document.querySelector('.wandel__flow');
    var k = { pose: 'hero', scene: true, sticky: true, N: pr.top + window.scrollY - pin, Hs: pr.height + 2 * pin, dy: pin, x: pr.left + pr.width / 2, h: pr.height };
    k.B = Math.max(k.N + k.Hs, dock && end ? pageTop(end) - 80 : 0);
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
    var top = k.N;
    if (k.sticky) top = clamp(k.N, y + navH, Math.max(k.N, k.B - k.Hs));
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
      if (wk) add(wk.y1, bord !== null ? Math.max(0, bord - tWin.innerHeight * 0.25) : tMax * 0.55);
      var l = sec('leistungen'), ab = sec('ablauf'), pr = sec('preise'), fr = sec('fragen');
      if (l) add(l.top, bord);
      if (ab) add(ab.top, welt);
      if (pr && welt !== null && schluss !== null) add(pr.top, mix(welt, schluss, 0.62));
      if (fr) add(fr.top, tMax);
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
  var lastT = '', lastShadow = -1, lastO = -1, lastAt = -1;

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
    keys: function () { return keys.map(function (k) { return { pose: k.pose, y0: Math.round(k.y0), y1: Math.round(k.y1), h: Math.round(k.h) }; }); },
    map: function () { return tMap.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }); },
    state: function () { return { x: Math.round(cur.x), y: Math.round(cur.y), h: Math.round(cur.h), t: Math.round(tCur), onScreen: onScreen, loaded: device.classList.contains('is-loaded') }; },
  };
})();
