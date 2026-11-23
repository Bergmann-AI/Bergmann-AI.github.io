/* Bergmann AI, /websites/: die Szene "Vorlage" steuern (Schritte, Überschrift Wort für Wort, Chatbot im Handy),
   die Kopfzeile dem Grund darunter anpassen, Menü und Anfrage-Fenster. Das Handy selbst steuert handy.js.

   Für flüssiges Scrollen: Positionen werden einmal gemessen (bei Größenänderung und nach dem Laden der
   Schriften neu), nie pro Bild. Beim Scrollen wird nur verglichen und gesetzt, wenn sich etwas ändert. */
(function () {
  'use strict';

  var root = document.documentElement;
  var rm = root.classList.contains('rm');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1 Die Überschrift der Szene in Wörter teilen (sie hellt sich beim Scrollen Wort für Wort auf) ---------- */
  var glow = $('[data-glow]'), glowWords = [], glowTop = 0;
  if (glow && !rm) {
    (function split(el) {
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { split(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'gw'; w.textContent = part;
          frag.appendChild(w); glowWords.push(w);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(glow);
  }

  /* ---------- 2 Messen und beim Scrollen vergleichen ---------- */
  var nav = $('.nav');
  var device = $('.device');
  var steps = $$('.step');
  var probe = document.createElement('div');   // stabile Bildschirmhöhe (svh): die Adressleiste am Handy verschiebt nichts
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  var heroPhone = $('.phone--hero');
  var navLinks = $$('.nav__links a[href^="#"]'), current = null;
  var grounds = [], navBg = '', paket = false, chatOn = false, glowFrom = 0, glowSpan = 1;
  var vh = 0, navH = 72, wide = true, lineAt = 0.56, themed = [], anchors = [], active = -1, ticking = false;
  var mqWide = window.matchMedia('(min-width: 900px)');

  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function rgbOf(str) {
    str = (str || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(str);
    if (m) { var v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
    m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(str);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function stopsOf(g) {
    var stops = [];
    (g || '').split(',').forEach(function (part) {
      var bits = part.trim().split(/\s+/), c = rgbOf(bits[0]);
      if (c) stops.push([parseFloat(bits[1]) / 100 || 0, c]);
    });
    return stops;
  }
  function lenOf(v, el) {
    var n = parseFloat(v);
    if (!isFinite(n)) return 0;
    if (/vh\s*$/.test(v)) return n * vh / 100;
    if (/%\s*$/.test(v)) return n * el.offsetHeight / 100;
    return n;
  }
  // Grund eines Abschnitts: Farbe oder Verlauf (--g), dazu Bänder oben (--g-top) und unten (--g-bottom)
  function groundsOf(el) {
    var cs = getComputedStyle(el), t = pageTop(el), b = t + el.offsetHeight, out = [];
    var stops = stopsOf(cs.getPropertyValue('--g'));
    if (!stops.length) { var c = rgbOf(cs.backgroundColor); if (c) stops = [[0, c], [1, c]]; }
    if (stops.length) out.push({ top: t, bottom: b, stops: stops });
    var top = stopsOf(cs.getPropertyValue('--g-top')), bot = stopsOf(cs.getPropertyValue('--g-bottom'));
    if (top.length) out.push({ top: t, bottom: t + lenOf(cs.getPropertyValue('--g-top-h'), el), stops: top });
    if (bot.length) out.push({ top: b - lenOf(cs.getPropertyValue('--g-bottom-h'), el), bottom: b, stops: bot });
    return out;
  }
  // Farbe des Grundes an einer Stelle der Seite (für die Kopfzeile)
  function groundAt(y) {
    for (var i = grounds.length - 1; i >= 0; i--) {
      var g = grounds[i];
      if (y < g.top || y >= g.bottom) continue;
      var f = (y - g.top) / Math.max(1, g.bottom - g.top), st = g.stops;
      for (var j = 0; j < st.length - 1; j++) {
        if (f <= st[j + 1][0]) {
          var t = (f - st[j][0]) / Math.max(1e-6, st[j + 1][0] - st[j][0]);
          t = Math.min(1, Math.max(0, t));
          return [0, 1, 2].map(function (n) { return Math.round(st[j][1][n] + (st[j + 1][1][n] - st[j][1][n]) * t); });
        }
      }
      return st[st.length - 1][1];
    }
    return null;
  }
  function lum(c) {
    return [0, 1, 2].reduce(function (sum, n) {
      var v = c[n] / 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return sum + v * [0.2126, 0.7152, 0.0722][n];
    }, 0);
  }

  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    navH = nav.offsetHeight || 72;
    wide = mqWide.matches;
    themed = $$('main > section, footer.closing').map(function (el) {
      var t = pageTop(el);
      return { id: el.id, theme: el.getAttribute('data-theme') || 'dark', top: t, bottom: t + el.offsetHeight };
    });
    // ein Schritt gilt, sobald seine Überschrift die Lese-Linie erreicht: am Desktop knapp unter der Bildmitte,
    // auf schmalen Bildschirmen die Mitte des Streifens unter dem oben angehefteten Handy (handy.js, Abstand --pin)
    // (auf niedrigen Bildschirmen, --dock: 0, heftet das Handy nicht an: dann wie am Desktop)
    var cs = getComputedStyle(root), pin = parseFloat(cs.getPropertyValue('--pin')) || 16;
    var dock = cs.getPropertyValue('--dock').trim() !== '0';
    var under = (!wide && dock && heroPhone) ? navH + pin + heroPhone.offsetHeight + pin : 0;
    lineAt = under ? (under + (vh - under) * 0.5) / vh : 0.56;
    // die Überschrift der Szene ist ganz hell, bevor sie oben ankommt (schmal: im oberen Drittel des Lese-Streifens)
    glowFrom = under ? vh * 0.96 : vh * 0.88;
    glowSpan = under ? Math.max(120, glowFrom - (under + (vh - under) * 0.3)) : vh * 0.5;
    anchors = steps.map(function (s) { var h = s.querySelector('h3'); return pageTop(h || s); });
    grounds = [];
    $$('main > section, footer.closing').forEach(function (el) { grounds = grounds.concat(groundsOf(el)); });
    if (glow) glowTop = pageTop(glow);
    update();
  }

  function setStep(i) {
    if (i === active) return;
    active = i;
    steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    // die Kopfzeile nimmt genau die Farbe des Grundes unter ihr an; die Schrift wechselt mit der Helligkeit
    if (!root.classList.contains('menu-open')) {
      var c = groundAt(y + navH), theme = 'dark';
      if (c) {
        var css = 'rgb(' + c.join(' ') + ')';
        if (css !== navBg) { navBg = css; nav.style.setProperty('--nav-bg', css); }
        theme = lum(c) > 0.174 ? 'light' : 'dark';   // ab hier ist dunkle Schrift kontrastreicher als helle
      }
      if (nav.getAttribute('data-theme') !== theme) nav.setAttribute('data-theme', theme);
    }
    // die Überschrift der Szene hellt sich Wort für Wort auf, während sie ins Bild läuft
    if (glowWords.length) {
      var gp = Math.min(1, Math.max(0, (glowFrom - (glowTop - y)) / glowSpan));
      var gn = glowWords.length, K = 3;
      for (var g = 0; g < gn; g++) {
        var b = Math.min(1, Math.max(0, (gp * (gn + K) - g) / K));
        var o = Math.round((0.2 + 0.8 * b) * 100) / 100;
        if (glowWords[g]._o !== o) { glowWords[g]._o = o; glowWords[g].style.opacity = o; }
      }
    }
    // der Menüpunkt des Abschnitts, in dem man gerade liest, ist markiert
    var look = y + vh * 0.35, id = null;
    for (var n = 0; n < themed.length; n++) {
      if (look >= themed[n].top && look < themed[n].bottom) { id = themed[n].id; break; }
    }
    if (id !== current) {
      current = id;
      navLinks.forEach(function (l) {
        if (l.getAttribute('href') === '#' + id) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
    }
    if (anchors.length) {
      var line = y + vh * lineAt, a = 0;
      for (var k = 0; k < anchors.length; k++) if (anchors[k] <= line) a = k;
      setStep(a);
    }
    // Chatbot im Handy: beim letzten Schritt der Szene und, bei den Preisen, wenn man auf das Paket zeigt
    if (device) {
      var mid = y + vh * 0.5, inScene = false, inPrices = false;
      for (var q = 0; q < themed.length; q++) {
        if (mid >= themed[q].top && mid < themed[q].bottom) {
          inScene = themed[q].id === 'vorlage'; inPrices = themed[q].id === 'preise';
        }
      }
      var on = (inScene && active === steps.length - 1) || (inPrices && paket);
      if (on !== chatOn) { chatOn = on; device.classList.toggle('is-chat', on); }
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });

  var rsz = 0;
  window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(measure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  measure();

  /* Preise: zeigt man auf das Paket (Website mit Chatbot), erscheint im Handy der Chatbot */
  $$('[data-offer]').forEach(function (o) {
    var show = function () { paket = o.getAttribute('data-offer') === 'paket'; update(); };
    o.addEventListener('pointerenter', show);
    o.addEventListener('focusin', show);
  });

  /* ---------- 3 Sprungmarken weich anfahren ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false, true);
    // scroll-margin-top zählt mit (schmal: "Vorlage" landet dort, wo das Handy gerade oben angekommen ist)
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({ top: Math.max(0, pageTop(target) - margin), behavior: rm ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- 4 Menü (Tablet und Handy) ---------- */
  var toggle = $('.nav__toggle'), menu = $('#menu'), menuTimer = 0;
  function setMenu(open, quiet) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    var use = toggle.querySelector('use');
    if (use) use.setAttribute('href', open ? '#i-x' : '#i-menu');
    clearTimeout(menuTimer);
    if (open) {
      menu.hidden = false;
      root.classList.add('menu-open');
      nav.setAttribute('data-theme', 'dark');
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      root.classList.remove('menu-open');
      menuTimer = setTimeout(function () { menu.hidden = true; }, rm ? 0 : 260);
      update();
      if (!quiet) toggle.focus({ preventScroll: true });
    }
  }
  if (toggle) toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false);
  });
  var mqDesk = window.matchMedia('(min-width: 1152px)');   // wird das Fenster breit, schließt das Menü
  if (mqDesk.addEventListener) mqDesk.addEventListener('change', function (m) {
    if (m.matches && root.classList.contains('menu-open')) setMenu(false, true);
  });

  /* ---------- 5 Anfrage-Fenster (wie auf der Startseite, an denselben n8n-Webhook) ---------- */
  var dlg = $('#anfrage');
  if (!dlg || typeof dlg.showModal !== 'function') return;   // ohne Dialog-Unterstützung öffnet der mailto-Link
  var URL_HOOK = 'https://bergmannai.app.n8n.cloud/webhook/bergmann-anfrage';
  var form = dlg.querySelector('form'), body = dlg.querySelector('.ask__body'), done = dlg.querySelector('.ask__done');
  var err = dlg.querySelector('.ask__err'), send = dlg.querySelector('.ask__send'), sel = form.elements.angebot;
  var opener = null;

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-anfrage]');
    if (!a) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false, true);
    opener = a;
    body.hidden = false; done.hidden = true; err.hidden = true;
    sel.value = a.getAttribute('data-anfrage');
    if (sel.selectedIndex < 0) sel.selectedIndex = 0;
    dlg.showModal();
    (form.elements.name.value ? form.elements.nachricht : form.elements.name).focus();
  });
  dlg.addEventListener('close', function () { if (opener) opener.focus({ preventScroll: true }); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  dlg.querySelector('.ask__copy').addEventListener('click', function () {
    var b = this;
    var ok = function () { b.textContent = 'Kopiert'; setTimeout(function () { b.textContent = 'Adresse kopieren'; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText('bergmannai2@gmail.com').then(ok, function () {});
  });

  form.addEventListener('submit', function (e) {
    if (e.submitter && e.submitter.value === 'close') return;
    e.preventDefault();
    var bad = null;
    ['kontakt', 'nachricht'].forEach(function (n) {
      var f = form.elements[n], empty = !f.value.trim();
      f.setAttribute('aria-invalid', empty ? 'true' : 'false');
      if (empty && !bad) bad = f;
    });
    if (bad) {
      err.textContent = 'Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer und Ihre Nachricht an.';
      err.hidden = false; bad.focus(); return;
    }
    err.hidden = true; send.disabled = true; send.textContent = 'Wird gesendet …';
    fetch(URL_HOOK, { method: 'POST', body: new URLSearchParams(new FormData(form)) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        form.reset(); body.hidden = true; done.hidden = false;
        done.querySelector('h2').focus();
      })
      .catch(function () {
        err.textContent = 'Das hat leider nicht geklappt. Schreiben Sie mir bitte direkt an bergmannai2@gmail.com.';
        err.hidden = false;
      })
      .then(function () { send.disabled = false; send.textContent = 'Anfrage senden'; });
  });
})();
