"""Monogramm der Vorlage: ein Buchstabe aus Cormorant Garamond (600) als SVG-Pfad.

Aufruf (braucht fontTools und brotli):  python3 monogramm.py M
Gibt den Pfad (viewBox 0 0 1000 1000, zentriert) aus. Er steht in index.html (Navi, Fußzeile)
und in assets/3d/flakon.js (Etikett auf dem Flakon). Für einen anderen Markennamen hier den
Anfangsbuchstaben einsetzen und den Pfad an beiden Stellen ersetzen.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

letter = sys.argv[1] if len(sys.argv) > 1 else 'M'
font = TTFont(Path(__file__).resolve().parent.parent / 'assets/fonts/cormorant-garamond-latin-600-normal.woff2')
gs = font.getGlyphSet()
name = font.getBestCmap()[ord(letter)]
bp = BoundsPen(gs); gs[name].draw(bp)
x0, y0, x1, y1 = bp.bounds
w, h = x1 - x0, y1 - y0
s = 860 / max(w, h)
dx = (1000 - w * s) / 2 - x0 * s
dy = (1000 + h * s) / 2 + y0 * s   # y nach unten
pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
gs[name].draw(TransformPen(pen, (s, 0, 0, -s, dx, dy)))
print(pen.getCommands())
