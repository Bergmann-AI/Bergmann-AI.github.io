/* Seite: Menü am Handy, Warenkorb-Zähler, Scroll-Wert für die 3D-Szene und deren Start.
   Der Scroll-Wert S läuft von 0 (Einstieg) bis 8 (Seitenende); jede ganze Zahl ist eine Stelle der Seite
   (siehe assets/3d/szene.js). Die Stellen werden einmal gemessen (und bei Größenänderung neu), nie beim Scrollen. */
const doc = document.documentElement;
const reduced = doc.classList.contains('rm');

/* ---------- Menü am Handy ---------- */
const menuBtn = document.querySelector('[data-menu]');
const menu = document.getElementById('menu');
function setMenu(open) {
  doc.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('.pill__menu-label').textContent = open ? 'Schließen' : 'Menü';
}
menuBtn.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
});
matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ---------- Warenkorb (Vorlage: zählt nur mit, keine Kasse) ---------- */
const bag = document.querySelector('[data-bag]');
const badge = document.querySelector('[data-bag-count]');
const toast = document.querySelector('[data-toast]');
let count = 0, toastTimer = 0;
function say(text) {
  toast.textContent = text;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
}
document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
  count++;
  badge.hidden = false;
  badge.textContent = String(count);
  bag.setAttribute('aria-label', `Warenkorb: ${count} Artikel`);
  btn.classList.add('is-added');
  say(`${btn.dataset.add} liegt im Warenkorb`);
}));
bag.addEventListener('click', () => say(count ? `${count} Artikel im Warenkorb` : 'Ihr Warenkorb ist leer'));

/* ---------- Scroll-Wert für die Szene ---------- */
const ids = ['top', 'akkord', 'noten', 'kollektion', 'maison', 'bestellen'];
const sec = ids.map((id) => document.getElementById(id));
const foot = document.querySelector('.foot');
const probe = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
probe.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
let marks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function measure() {
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  const vh = probe.offsetHeight || innerHeight;
  const coll = sec[3];
  const end = Math.max(1, doc.scrollHeight - innerHeight);
  const m = [
    0, top(sec[1]), top(sec[2]), top(coll),
    top(coll) + Math.max(1, coll.offsetHeight - vh) * 0.5,
    top(sec[4]), top(sec[5]), Math.min(top(foot) - vh * 0.6, end - 2), end
  ];
  for (let i = 1; i < m.length; i++) m[i] = Math.max(m[i], m[i - 1] + 1);
  marks = m;
}
function stage() {
  const y = scrollY;
  for (let i = 0; i < marks.length - 1; i++) {
    if (y < marks[i + 1]) return i + Math.max(0, (y - marks[i]) / (marks[i + 1] - marks[i]));
  }
  return marks.length - 1;
}
measure();
window.__stufe = { stage, marks: () => marks.slice() };
document.fonts?.ready.then(measure);
addEventListener('load', measure);
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 100); });
new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(measure, 100); }).observe(document.body);

/* ---------- Schalter: Bewegung anhalten (die Szene bewegt sich sonst ständig) ---------- */
function motionSwitch(szene) {
  const btn = document.querySelector('[data-motion]');
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Bewegung fortsetzen' : 'Bewegung anhalten');
    szene.pause(on);
  });
}

/* ---------- 3D-Szene ---------- */
if (!doc.classList.contains('no-3d')) {
  const canvas = document.querySelector('.scene');
  import('../3d/szene.js')
    .then((m) => m.start({ canvas, stage, reduced }))
    .then((szene) => { doc.classList.add('has-3d'); if (!reduced) motionSwitch(szene); })
    .catch((err) => { console.error(err); doc.classList.add('no-3d'); });
}
