"""Erzeugt assets/img/sitzplan.svg: Sitzplan des Jets in Draufsicht, Bug oben.

Aufruf:  python3 _werkzeuge/sitzplan_svg.py

Koordinaten in Tausendstel der Rumpflänge L, genau wie das Jet-Bild (jet-*.webp):
x von -460 bis 460, z (nach unten) von -75 bis 1075, Bugspitze bei z = 0.
So liegen Sitzplan und Jet beim Überblenden deckungsgleich übereinander.
Die Kontur ist breiter als der Rumpf (wie eine Schnittzeichnung) und reicht vom Bug bis zum Heck.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'img', 'sitzplan.svg')

INK = '#2a2219'

# Außenkontur: (z, halbe Breite)
OUTER = [(0, 0), (27, 27), (53, 37), (80, 45), (107, 52), (133, 57), (160, 61), (187, 65), (213, 68), (240, 71),
         (267, 73), (800, 73), (827, 69.5), (853, 65), (880, 59), (907, 53), (933, 45), (960, 35), (987, 22),
         (1013, 12), (1035, 0)]
WALL = 8   # Wandstärke


def smooth(points):
    """Glatter Pfad (Catmull-Rom als kubische Bezier) durch Punkte (x, y)."""
    d = f'M {points[0][0]:.1f} {points[0][1]:.1f}'
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i > 0 else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C {c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}'
    return d


def outline(profile):
    right = [(w, z) for z, w in profile]
    left = [(-w, z) for z, w in reversed(profile)][1:]
    return smooth(right + left) + ' Z'


def inner_profile():
    pts = [(OUTER[0][0] + 14, 0)]
    for z, w in OUTER[1:-1]:
        if w - WALL > 1:
            pts.append((z, w - WALL))
    pts.append((OUTER[-1][0] - 16, 0))
    return pts


def half_width(profile, z):
    for (z0, w0), (z1, w1) in zip(profile, profile[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0) if z1 > z0 else 0
            return w0 + (w1 - w0) * t
    return 0.0


def cross(profile, z, pad=0.0):
    w = half_width(profile, z) - pad
    return f'<path d="M {-w:.1f} {z} L {w:.1f} {z}"/>'


def seat(x, z, w=39, h=58):
    """Clubsessel von oben, Blick zum Bug: Rahmen, Kissen, Rückenlehne unten."""
    x0, z0 = x - w / 2, z - h / 2
    return (f'<rect x="{x0:.1f}" y="{z0:.1f}" width="{w}" height="{h}" rx="9"/>'
            f'<rect x="{x - w / 2 + 7:.1f}" y="{z0 + 7:.1f}" width="{w - 14}" height="{h - 22}" rx="6"/>'
            f'<path d="M {x - w / 2 + 5:.1f} {z0 + h - 8:.1f} L {x + w / 2 - 5:.1f} {z0 + h - 8:.1f}"/>')


def svg():
    inner = inner_profile()
    parts = [f'<path d="{outline(OUTER)}" stroke-width="3"/>', f'<path d="{outline(inner)}"/>']
    # Radom (dunkle Bugkappe)
    parts.append(f'<path d="M 0 3 C 7 10, 14 22, 20 38 L -20 38 C -14 22, -7 10, 0 3 Z" fill="{INK}" stroke="none" opacity="0.85"/>')
    # Cockpit: Scheibenbogen, zwei Pilotensitze, Mittelkonsole
    parts.append('<path d="M -44 106 Q 0 74 44 106"/>')
    parts.append(seat(-31, 142, 31, 44))
    parts.append(seat(31, 142, 31, 44))
    parts.append('<rect x="-6" y="124" width="12" height="34" rx="2"/>')
    parts.append(cross(inner, 178))
    # Bordküche links (mit Spüle), Schrank rechts, Einstieg in der Mitte
    parts.append('<rect x="-63" y="191" width="43" height="67" rx="3"/>')
    parts.append('<rect x="-56" y="216" width="14" height="14" rx="2"/>')
    parts.append('<rect x="20" y="191" width="45" height="67" rx="3"/>')
    parts.append('<path d="M 42 191 L 42 258" stroke-width="1.8"/>')
    parts.append('<path d="M -20 214 L -10 214 L -5 222 L 5 206 L 10 214 L 20 214" stroke-width="1.8"/>')
    parts.append(cross(inner, 262))
    # Sechs Sitzreihen à zwei Sessel, Fenstermarken an der Wand
    for k in range(6):
        z = 317 + k * 83.6
        parts.append(seat(-34, z))
        parts.append(seat(35, z))
        for s in (-1, 1):
            parts.append(f'<path d="M {s * 69:.1f} {z - 12:.1f} L {s * 69:.1f} {z + 12:.1f}" stroke-width="3.4"/>')
    # Waschräume hinten
    parts.append(cross(inner, 831))
    parts.append('<rect x="-25" y="833" width="24" height="67" rx="2"/>')
    parts.append('<rect x="1" y="833" width="24" height="67" rx="2"/>')
    for s in (-1, 1):
        cx = s * 44
        parts.append(f'<circle cx="{cx}" cy="858" r="9"/>')
        parts.append(f'<circle cx="{cx}" cy="858" r="3" fill="{INK}" stroke="none"/>')
    parts.append(cross(inner, 902))
    # Heckkonus mit kleinem Dreieck
    parts.append('<path d="M -15 995 L 15 995 L 0 1030 Z"/>')

    body = '\n    '.join(parts)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-460 -75 920 1150" width="920" height="1150">
  <!-- Sitzplan in Draufsicht, deckungsgleich mit jet-*.webp. Erzeugt mit _werkzeuge/sitzplan_svg.py. -->
  <g fill="none" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    {body}
  </g>
</svg>
'''


if __name__ == '__main__':
    open(OUT, 'w').write(svg())
    print('geschrieben', os.path.normpath(OUT))
