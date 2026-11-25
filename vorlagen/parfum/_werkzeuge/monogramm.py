"""Logo der Vorlage: Monogramm (ein Buchstabe aus Cormorant Garamond 600) und darunter der Markenname
(Jost 500, gesperrt) als SVG-Pfade. So ist das Logo eine Grafik und bleibt in jeder Größe scharf.

Aufruf (braucht fontTools und brotli):  python3 monogramm.py M MARKE
Gibt zwei Pfade aus:
  1. das Monogramm allein (viewBox 0 0 1000 1000): als MONO in assets/3d/flakon.js (Etikett auf dem Flakon)
  2. das ganze Logo, Monogramm über dem Namen (viewBox steht dabei): als <symbol id="logo"> in index.html,
     impressum.html und datenschutz.html
Für einen anderen Markennamen hier Buchstaben und Namen einsetzen und die Pfade an diesen Stellen ersetzen.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

letter = sys.argv[1] if len(sys.argv) > 1 else 'M'
name = sys.argv[2] if len(sys.argv) > 2 else 'MARKE'
fonts = Path(__file__).resolve().parent.parent / 'assets/fonts'
num = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')

# 1. Monogramm, zentriert in 1000 x 1000
serif = TTFont(fonts / 'cormorant-garamond-latin-600-normal.woff2')
gs = serif.getGlyphSet()
g = serif.getBestCmap()[ord(letter)]
bp = BoundsPen(gs); gs[g].draw(bp)
x0, y0, x1, y1 = bp.bounds
s = 860 / max(x1 - x0, y1 - y0)
dx = (1000 - (x1 - x0) * s) / 2 - x0 * s
dy = (1000 + (y1 - y0) * s) / 2 + y0 * s
pen = SVGPathPen(gs, ntos=num)
gs[g].draw(TransformPen(pen, (s, 0, 0, -s, dx, dy)))
mono = pen.getCommands()
print(mono)
print()

# 2. Logo: Monogramm oben (Höhe 1000), darunter der Name in Jost 500, Großbuchstaben 150 hoch, gesperrt
sans = TTFont(fonts / 'jost-latin-500-normal.woff2')
gs2 = sans.getGlyphSet()
cmap = sans.getBestCmap()
cap = sans['OS/2'].sCapHeight or 700
k = 150 / cap
track = 0.42 * sans['head'].unitsPerEm
x = 0
parts = []
for ch in name:
    gn = cmap[ord(ch)]
    parts.append((gn, x))
    x += gs2[gn].width + track
width = (x - track) * k
top = 1000 + 120
left = (1000 - width) / 2
pen2 = SVGPathPen(gs2, ntos=num)
for gn, gx in parts:
    gs2[gn].draw(TransformPen(pen2, (k, 0, 0, -k, left + gx * k, top + 150)))
vb_x = min(0, left) - 10
vb_w = max(1000, width) + 20
print(f'viewBox="{num(vb_x)} 70 {num(vb_w)} {num(top + 150 - 70 + 20)}"')
print(mono + pen2.getCommands())
