"""Erzeugt assets/img/jet.svg und assets/img/sitzplan.svg (Draufsicht, Bug oben).

Aufruf:  python3 _werkzeuge/jet_svg.py
Alle Formen sind für die rechte Seite definiert und werden an x = 400 gespiegelt.
"""
import re, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'img')
VB = '-24 -12 848 1104'   # Platz für Schatten


def mirror(d):
    """Spiegelt einen Pfad (nur absolute M/L/C/Q/Z-Befehle) an x = 400."""
    toks = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', d)
    out, i, cmd, idx = [], 0, None, 0
    for t in toks:
        if t in 'MLCQZ':
            cmd, idx = t, 0
            out.append(t)
            continue
        v = float(t)
        if idx % 2 == 0:
            v = 800 - v
        idx += 1
        out.append(('%g' % v))
    return ' '.join(out)


def both(d):
    return d, mirror(d)


FUSELAGE = ('M400 8 C408 28 422 92 427 146 C430 178 431 196 431 220 L431 700 '
            'C431 800 427 905 412 992 Q407 1006 400 1008 Q393 1006 388 992 '
            'C373 905 369 800 369 700 L369 220 C369 196 370 178 373 146 C378 92 392 28 400 8 Z')
WING_R = ('M430 452 C445 456 458 462 470 469 L762 652 Q773 659 772 671 L770 690 '
          'Q768 699 757 698 L522 616 L431 630 Z')
WINGLET_R = 'M762 652 Q777 656 783 678 L787 704 Q779 706 773 696 L771 678 Z'
NACELLE_R = dict(x=436, y=640, w=54, h=160, r=22)
HSTAB_R = 'M404 905 L588 994 Q600 1001 598 1014 L574 1018 L404 1000 Z'
FIN = 'M397 830 L403 830 L405 1004 Q404 1036 400 1038 Q396 1036 395 1004 Z'


def rect_path(x, y, w, h, r):
    return (f'M{x + r} {y} L{x + w - r} {y} Q{x + w} {y} {x + w} {y + r} L{x + w} {y + h - r} '
            f'Q{x + w} {y + h} {x + w - r} {y + h} L{x + r} {y + h} Q{x} {y + h} {x} {y + h - r} '
            f'L{x} {y + r} Q{x} {y} {x + r} {y} Z')


def nacelle_paths():
    n = NACELLE_R
    r = rect_path(n['x'], n['y'], n['w'], n['h'], n['r'])
    return r, mirror(r)


def jet_svg():
    wr, wl = both(WING_R)
    gr, gl = both(WINGLET_R)
    hr, hl = both(HSTAB_R)
    nr, nl = nacelle_paths()
    sil = [FUSELAGE, wr, wl, nr, nl, hr, hl, gr, gl]
    win = []
    for k in range(12):
        y = 232 + k * 31
        win.append(f'<ellipse cx="373.5" cy="{y}" rx="2.2" ry="5"/><ellipse cx="426.5" cy="{y}" rx="2.2" ry="5"/>')
    n = NACELLE_R
    def nac(x):
        # x = linke Kante der Gondel
        return (f'<rect x="{x}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" rx="{n["r"]}" fill="url(#nacelle)"/>'
                f'<rect x="{x + 2}" y="{n["y"] + 1}" width="{n["w"] - 4}" height="12" rx="6" fill="url(#chrome)"/>'
                f'<rect x="{x + 7}" y="{n["y"] + 4}" width="{n["w"] - 14}" height="5" rx="2.5" fill="#0d0d0e" opacity="0.85"/>'
                f'<rect x="{x + 5}" y="{n["y"] + n["h"] - 15}" width="{n["w"] - 10}" height="10" rx="5" fill="url(#chrome)"/>')
    flaps_r = 'M452 618 L524 604 L744 680 M600 630 L602 644 M680 658 L682 671 M484 548 L600 584'
    flaps_l = mirror(flaps_r)
    spar_r = 'M470 520 L742 676'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}" width="848" height="1104">
  <!-- Business-Jet in Draufsicht, Bug oben. Eigene Vektorzeichnung (erzeugt mit _werkzeuge/jet_svg.py). -->
  <defs>
    <linearGradient id="fus" x1="369" x2="431" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7a5d3c"/>
      <stop offset="0.07" stop-color="#2c2219"/>
      <stop offset="0.2" stop-color="#070707"/>
      <stop offset="0.42" stop-color="#131314"/>
      <stop offset="0.5" stop-color="#3c3c40"/>
      <stop offset="0.56" stop-color="#131314"/>
      <stop offset="0.82" stop-color="#060606"/>
      <stop offset="0.94" stop-color="#1e1d1f"/>
      <stop offset="1" stop-color="#55524b"/>
    </linearGradient>
    <linearGradient id="crown" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.06" stop-color="#fff" stop-opacity="0.75"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.3"/>
      <stop offset="0.9" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="goldEdge" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#e2bd82" stop-opacity="0"/>
      <stop offset="0.12" stop-color="#e2bd82" stop-opacity="0.95"/>
      <stop offset="0.7" stop-color="#c9a066" stop-opacity="0.8"/>
      <stop offset="1" stop-color="#c9a066" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="wingR" x1="430" x2="780" y1="460" y2="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#050505"/>
      <stop offset="0.5" stop-color="#111112"/>
      <stop offset="0.85" stop-color="#202023"/>
      <stop offset="1" stop-color="#2e2d30"/>
    </linearGradient>
    <linearGradient id="wingL" x1="370" x2="20" y1="460" y2="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#050505"/>
      <stop offset="0.5" stop-color="#131210"/>
      <stop offset="0.85" stop-color="#26211b"/>
      <stop offset="1" stop-color="#3d3227"/>
    </linearGradient>
    <linearGradient id="wingSheen" x1="0" x2="0" y1="450" y2="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0.09"/>
      <stop offset="0.4" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="nacelle" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#3d3a35"/>
      <stop offset="0.14" stop-color="#0b0b0b"/>
      <stop offset="0.38" stop-color="#1a1a1c"/>
      <stop offset="0.5" stop-color="#4d4d52"/>
      <stop offset="0.6" stop-color="#151516"/>
      <stop offset="0.9" stop-color="#060606"/>
      <stop offset="1" stop-color="#2b2a28"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#6d6a66"/>
      <stop offset="0.25" stop-color="#f4f2ee"/>
      <stop offset="0.5" stop-color="#9c9993"/>
      <stop offset="0.75" stop-color="#f7f5f1"/>
      <stop offset="1" stop-color="#5e5b57"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#66737d"/>
      <stop offset="0.45" stop-color="#1c2329"/>
      <stop offset="1" stop-color="#0c0f12"/>
    </linearGradient>
    <linearGradient id="tailR" x1="404" x2="600" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#060606"/>
      <stop offset="1" stop-color="#28282c"/>
    </linearGradient>
    <linearGradient id="tailL" x1="396" x2="200" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#060606"/>
      <stop offset="1" stop-color="#312a24"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id="tight" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
    <g id="sil">{''.join(f'<path d="{d}"/>' for d in sil)}</g>
  </defs>

  <use href="#sil" transform="translate(14 24)" fill="#2a1e12" opacity="0.32" filter="url(#soft)"/>
  <use href="#sil" transform="translate(5 9)" fill="#1c140c" opacity="0.26" filter="url(#tight)"/>

  <!-- Höhenleitwerk -->
  <path d="{hr}" fill="url(#tailR)"/><path d="{hl}" fill="url(#tailL)"/>
  <path d="M404 906 L589 995" stroke="#d2cdc5" stroke-opacity="0.55" stroke-width="1.6" fill="none"/>
  <path d="M396 906 L211 995" stroke="#e0bb80" stroke-opacity="0.8" stroke-width="1.6" fill="none"/>
  <path d="M410 994 L574 1010 M390 994 L226 1010" stroke="#2e2e32" stroke-width="1.1" fill="none"/>

  <!-- Flügel -->
  <path d="{wr}" fill="url(#wingR)"/><path d="{wl}" fill="url(#wingL)"/>
  <path d="{wr}" fill="url(#wingSheen)"/><path d="{wl}" fill="url(#wingSheen)"/>
  <path d="M432 453 C446 457 458 463 470 470 L762 653" stroke="#dcd7cf" stroke-opacity="0.62" stroke-width="2" fill="none"/>
  <path d="M368 453 C354 457 342 463 330 470 L38 653" stroke="#e8c68e" stroke-opacity="0.92" stroke-width="2.4" fill="none"/>
  <path d="M366 458 C353 462 342 468 332 475 L60 645" stroke="#a87c44" stroke-opacity="0.5" stroke-width="5" fill="none" filter="url(#tight)"/>
  <g stroke="#36363c" stroke-width="1.3" fill="none" opacity="0.9"><path d="{flaps_r}"/><path d="{flaps_l}"/></g>
  <g stroke="#5c5c62" stroke-width="0.9" fill="none" opacity="0.55"><path d="{spar_r}"/><path d="{mirror(spar_r)}"/></g>
  <path d="{gr}" fill="#1c1c1f"/><path d="{gl}" fill="#262019"/>
  <path d="M764 653 Q778 657 784 678 L787 702" stroke="#d2cdc5" stroke-opacity="0.7" stroke-width="1.6" fill="none"/>
  <path d="M36 653 Q22 657 16 678 L13 702" stroke="#e6c38c" stroke-opacity="0.85" stroke-width="1.6" fill="none"/>

  <!-- Triebwerke -->
  <rect x="429" y="680" width="9" height="80" fill="#090909"/><rect x="362" y="680" width="9" height="80" fill="#090909"/>
  {nac(NACELLE_R['x'])}
  {nac(800 - NACELLE_R['x'] - NACELLE_R['w'])}
  <path d="M312 654 L312 786" stroke="#d8b27a" stroke-opacity="0.55" stroke-width="2" fill="none"/>
  <path d="M488 654 L488 786" stroke="#d8d3cb" stroke-opacity="0.32" stroke-width="2" fill="none"/>

  <!-- Rumpf -->
  <path d="{FUSELAGE}" fill="url(#fus)"/>
  <path d="M398 12 C390 30 378 92 373 146 C370 178 369.6 196 369.6 220 L369.6 700 C369.6 800 373 905 388 992" stroke="url(#goldEdge)" stroke-width="2.2" fill="none"/>
  <path d="M402 12 C410 30 422 92 427 146 C430 178 430.4 196 430.4 220 L430.4 700 C430.4 800 427 905 412 992" stroke="#dcd7cf" stroke-opacity="0.3" stroke-width="1.4" fill="none"/>
  <path d="M400 22 L400 1002" stroke="url(#crown)" stroke-width="1.5" fill="none"/>
  <path d="M396 60 C393 120 392 300 392 640" stroke="#fff" stroke-opacity="0.05" stroke-width="5" fill="none"/>

  <!-- Cockpit -->
  <path d="M400 124 C411 125 420 132 424 146 L426 165 C417 161 409 160 400 160 C391 160 383 161 374 165 L376 146 C380 132 389 125 400 124 Z" fill="url(#glass)"/>
  <path d="M400 124 C411 125 420 132 424 146 L426 165 C417 161 409 160 400 160 C391 160 383 161 374 165 L376 146 C380 132 389 125 400 124 Z M400 124 L400 160" stroke="#e8e5e0" stroke-width="1.8" stroke-opacity="0.9" fill="none"/>
  <path d="M426 165 C428 178 429.5 192 430 210 M374 165 C372 178 370.5 192 370 210" stroke="#e8e5e0" stroke-width="1.5" stroke-opacity="0.8" fill="none"/>
  <path d="M422 144 C417 136 410 131 403 130" stroke="#fff" stroke-opacity="0.45" stroke-width="1" fill="none"/>

  <!-- Kabinenfenster -->
  <g fill="#e9d8b6" fill-opacity="0.72" stroke="#a9824f" stroke-width="1">{''.join(win)}</g>
  <g stroke="#2c2c30" stroke-width="1" fill="none" opacity="0.85">
    <path d="M371 216 L380 216 L380 226 M429 216 L420 216 L420 226 M371 620 L429 620 M372 820 L428 820 M376 920 L424 920"/>
  </g>

  <!-- Seitenleitwerk -->
  <path d="{FIN}" fill="#0b0b0c"/>
  <path d="M400 832 L400 1034" stroke="#ece8e1" stroke-opacity="0.55" stroke-width="1.2" fill="none"/>
</svg>
'''


def seat(x, y, flip=False):
    """Ein Clubsessel 22 x 26, Lehne hinten (unten), Armlehnen seitlich."""
    back = f'M{x + 2} {y + 26} L{x + 20} {y + 26}' if not flip else f'M{x + 2} {y} L{x + 20} {y}'
    return (f'<rect x="{x}" y="{y}" width="22" height="26" rx="5"/>'
            f'<path d="M{x + 4} {y + 4} L{x + 4} {y + 22} M{x + 18} {y + 4} L{x + 18} {y + 22}"/>'
            f'<path d="{back}" stroke-width="2.2"/>')


def blueprint_svg():
    """Sitzplan: nur Rumpf (ohne Flügel), Innenwand, Cockpit, Pantry, 7 Reihen à 2 Sitze, Waschraum, Heck."""
    # Innenwand: Rumpf um 5 Einheiten nach innen versetzt (vereinfacht, gleiche Kurvenform)
    inner = ('M400 22 C406 40 418 96 422 146 C425 178 426 196 426 222 L426 700 '
             'C426 798 422 896 409 980 Q405 992 400 994 Q395 992 391 980 '
             'C378 896 374 798 374 700 L374 222 C374 196 375 178 378 146 C382 96 394 40 400 22 Z')
    seats = []
    for k in range(7):
        y = 290 + k * 46
        seats.append(seat(377, y))
        seats.append(seat(401, y))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}" width="848" height="1104">
  <!-- Sitzplan in Draufsicht, passt deckungsgleich auf jet.svg. Erzeugt mit _werkzeuge/jet_svg.py. -->
  <g fill="none" stroke="#2a231b" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
    <path d="{FUSELAGE}" stroke-width="2"/>
    <path d="{inner}" stroke-opacity="0.75" stroke-width="1.2"/>
    <!-- Cockpit -->
    <path d="M400 124 C411 125 420 132 424 146 L426 165 C417 161 409 160 400 160 C391 160 383 161 374 165 L376 146 C380 132 389 125 400 124 Z M400 124 L400 160"/>
    <path d="M374 214 L426 214" stroke-width="1.8"/>
    <path d="M386 190 L414 190 M392 176 L392 204 M408 176 L408 204" stroke-opacity="0.7"/>
    <!-- Einstieg und Pantry -->
    <rect x="378" y="222" width="18" height="40" rx="2"/>
    <path d="M381 230 L393 230 M381 240 L393 240 M381 250 L393 250" stroke-opacity="0.7"/>
    <rect x="406" y="222" width="18" height="24" rx="2"/>
    <circle cx="415" cy="234" r="5"/>
    <path d="M374 274 L426 274" stroke-dasharray="4 3" stroke-opacity="0.7"/>
    <!-- Sitze -->
    {''.join(seats)}
    <!-- Waschraum -->
    <path d="M374 626 L426 626 M374 690 L426 690 M400 626 L400 690"/>
    <circle cx="387" cy="660" r="8"/>
    <rect x="406" y="640" width="15" height="20" rx="3"/>
    <circle cx="413.5" cy="650" r="4"/>
    <!-- Gepäck und Heck -->
    <path d="M376 760 L424 760 M380 850 L420 850"/>
    <path d="M384 768 L416 842 M416 768 L384 842" stroke-opacity="0.45"/>
    <path d="M388 900 L400 990 L412 900" stroke-opacity="0.7"/>
  </g>
</svg>
'''


open(os.path.join(OUT, 'jet.svg'), 'w').write(jet_svg())
open(os.path.join(OUT, 'sitzplan.svg'), 'w').write(blueprint_svg())
print('ok')
