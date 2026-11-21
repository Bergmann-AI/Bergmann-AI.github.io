"""Aus dem Jet-Render (6000 px hoch, mit Alpha) die Web-Bilder machen.

Aufruf im Ordner mit jet_6000.png und mask_600.png:
    python3 jet_post.py
Schreibt assets/img/jet-1250.webp, jet-2000.webp, jet-3000.webp, jet-4000.webp und jet-schatten.webp.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'img')

src = Image.open('jet_6000.png').convert('RGBA').convert('RGBa')   # vormultipliziert verkleinern: keine dunklen Ränder
for h in (4000, 3000, 2000, 1250):
    w = h * 4 // 5
    im = src.resize((w, h), Image.LANCZOS).convert('RGBA')
    name = f'jet-{h}.webp'
    im.save(os.path.join(OUT, name), quality=84, alpha_quality=92, method=6)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')

# Schatten: Silhouette weich gezeichnet, nach rechts unten versetzt (Licht von links oben)
m = np.asarray(Image.open('mask_600.png').convert('RGBA'))[..., 3].astype(np.float32) / 255.0
mask = Image.fromarray((m * 255).astype(np.uint8))
W, H = mask.size
Lpx = W / 0.92
def shifted_blur(dx, dy, sigma):
    canvas = Image.new('L', (W, H), 0)
    canvas.paste(mask, (int(round(dx * Lpx)), int(round(dy * Lpx))))
    return np.asarray(canvas.filter(ImageFilter.GaussianBlur(sigma * Lpx))).astype(np.float32) / 255.0
a = 0.30 * shifted_blur(0.010, 0.018, 0.010) + 0.20 * shifted_blur(0.022, 0.040, 0.030)
a = np.clip(a, 0, 1)
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = 52, 38, 24
rgba[..., 3] = (a * 255).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, 'jet-schatten.webp'), quality=80, alpha_quality=80, method=6)
print('jet-schatten.webp', os.path.getsize(os.path.join(OUT, 'jet-schatten.webp')) // 1024, 'KB')
