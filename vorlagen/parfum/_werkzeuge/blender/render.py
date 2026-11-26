"""Rendert alle Flakon-Bilder der Vorlage mit Blender (flakon.py) und setzt sie zu Bildern mit Transparenz
zusammen. Aufruf mit dem Python, in dem bpy installiert ist (z. B. `pip install bpy`):

  python render.py              alle sechs Kartenflakons und den Hero-Flakon
  python render.py or noir      nur diese
  python render.py hero         nur den Hero-Flakon

Ergebnis in assets/img: flakon-<name>-1200/800/480.webp (Karten, mit warmem Schein) und
flakon-hero-1100/700.webp (Hero, freigestellt, für die 3D-Szene). Braucht numpy und Pillow.
"""
import os, sys, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'img'))
CARDS = ['or', 'noir', 'ambre', 'rose', 'fumee', 'lumiere']


def render(form, duft, size, samples, tmp):
    out = os.path.join(tmp, f'{form}-{duft}.png')
    subprocess.run([sys.executable, os.path.join(HERE, 'flakon.py'), form, duft, '--out', out,
                    '--size', str(size), '--samples', str(samples)], check=True, cwd=HERE,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    col = np.asarray(Image.open(out).convert('RGB')).astype(np.float32) / 255
    mask = np.asarray(Image.open(out[:-4] + '-maske.png').convert('RGBA'))[..., 3].astype(np.float32) / 255
    return col, mask


def compose(col, mask, halo):
    """Farbe aus dem Bild vor der Rückwand, Transparenz aus dem Umriss; außerhalb optional der warme Schein."""
    a = mask.copy()
    if halo:
        lum = col @ np.array([0.3, 0.59, 0.11], np.float32)
        glow = np.clip(lum / 0.42, 0, 1) ** 1.3 * halo
        a = np.maximum(a, glow)
    rgb = np.where(a[..., None] > 0, col, 0)
    return Image.fromarray((np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8), 'RGBA')


def save(im, name, widths):
    for w in widths:
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(os.path.join(IMG, f'{name}-{w}.webp'), quality=88, method=6)


def main():
    want = sys.argv[1:] or CARDS + ['hero']
    os.makedirs(IMG, exist_ok=True)
    keep = os.environ.get('FLAKON_ROH')          # Ordner für die Rohbilder (sonst temporär)
    with (tempfile.TemporaryDirectory() if not keep else open(os.devnull)) as tmp:
        tmp = keep or tmp
        for v in want:
            if v == 'hero':
                col, mask = render('hero', '-', 1100, 160, tmp)
                save(compose(col, mask, 0), 'flakon-hero', [int(1100 * 0.66), 460])
            elif v in CARDS:
                col, mask = render('karte', v, 1200, 128, tmp)
                save(compose(col, mask, 0.55), f'flakon-{v}', [1200, 800, 480])
            print('fertig:', v, flush=True)


if __name__ == '__main__':
    main()
