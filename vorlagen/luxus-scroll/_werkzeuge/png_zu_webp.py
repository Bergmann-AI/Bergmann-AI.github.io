"""PNG mit Transparenz -> WebP (Farbe verlustbehaftet, Transparenz verlustfrei). Aufruf: python3 png_zu_webp.py <in.png> <out.webp> [qualität]"""
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
q = int(sys.argv[3]) if len(sys.argv) > 3 else 88
Image.open(src).convert('RGBA').save(dst, quality=q, method=6, alpha_quality=100)
print('geschrieben', dst)
