/* Bergmann AI, /websites/: die Beispiel-Website in die Handys setzen, die Szene "Vorher und nachher"
   steuern, die Kopfzeile dem Abschnitt anpassen, Menü und Anfrage-Fenster.

   Für flüssiges Scrollen: Positionen werden einmal gemessen (bei Größenänderung und nach dem Laden der
   Schriften neu), nie pro Bild. Beim Scrollen wird nur verglichen und ein Attribut gesetzt, wenn sich der
   Schritt ändert; die Übergänge im Handy laufen über transform und opacity. */
(function () {
  'use strict';

  var root = document.documentElement;
  var rm = root.classList.contains('rm');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1 Die Beispiel-Website in jedes Handy ---------- */
  var tpl = $('#site');
  if (tpl && tpl.content) $$('[data-site]').forEach(function (screen) { screen.appendChild(tpl.content.cloneNode(true)); });

  /* Animationen (Ladekreis, Schimmer) laufen nur, solange ihr Handy zu sehen ist */
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    $$('.phone').forEach(function (p) { seen.observe(p); });
  }

  /* ---------- 2 Messen und beim Scrollen vergleichen ---------- */
  var nav = $('.nav');
  var live = $('.phone--live');
  var steps = $$('.step');
  var probe = document.createElement('div');   // stabile Bildschirmhöhe (svh): die Adressleiste am Handy verschiebt nichts
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  var stage = $('.wandel__stage');
  var navLinks = $$('.nav__links a[href^="#"]'), current = null;
  var vh = 0, navH = 72, wide = true, lineAt = 0.56, themed = [], anchors = [], active = -1, ticking = false;
  var mqWide = window.matchMedia('(min-width: 900px)');

  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function measure() {
    vh = probe.offsetHeight || window.innerHeight;
    navH = nav.offsetHeight || 72;
    wide = mqWide.matches;
    themed = $$('main > section, footer.closing').map(function (el) {
      var t = pageTop(el);
      return { id: el.id, theme: el.getAttribute('data-theme') || 'dark', top: t, bottom: t + el.offsetHeight };
    });
    // ein Schritt gilt, sobald seine Überschrift die Lese-Linie erreicht: am Desktop knapp unter der Bildmitte,
    // auf schmalen Bildschirmen die Mitte des Streifens unter dem angehefteten Handy
    var under = (!wide && stage) ? navH + stage.offsetHeight : 0;
    lineAt = wide ? 0.56 : (under + (vh - under) * 0.5) / vh;
    anchors = steps.map(function (s) { var h = s.querySelector('h3'); return pageTop(h || s); });
    update();
  }

  function setStep(i) {
    if (i === active || !live) return;
    active = i;
    live.setAttribute('data-step', String(i));
    steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    if (!root.classList.contains('menu-open')) {
      var at = y + navH * 0.5, theme = 'dark';
      for (var i = 0; i < themed.length; i++) {
        if (at >= themed[i].top && at < themed[i].bottom) { theme = themed[i].theme; break; }
      }
      if (nav.getAttribute('data-theme') !== theme) nav.setAttribute('data-theme', theme);
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
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });

  var rsz = 0;
  window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(measure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  measure();

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
    window.scrollTo({ top: pageTop(target), behavior: rm ? 'auto' : 'smooth' });
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
