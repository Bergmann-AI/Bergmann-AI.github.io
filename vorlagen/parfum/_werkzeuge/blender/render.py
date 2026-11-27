"""Rendert alle Flakon-Bilder der Vorlage mit Blender (flakon.py) und setzt sie zu Bildern mit Transparenz
zusammen. Aufruf mit dem Python, in dem bpy installiert ist (z. B. `pip install bpy numpy pillow`):

  python render.py              alle sechs Kartenflakons und die Drehfolge des Hero-Flakons
  python render.py or noir      nur diese
  python render.py hero         nur die Drehfolge

Ergebnis in assets/img:
  flakon-<name>-1200/800/480.webp   Karten (Flakon frontal wie im Video, mit warmem Schein)
  flakon-dreh-NN-1400/700.webp      Hero-Flakon für die 3D-Szene, freigestellt, je Winkel ein Bild
                                    (NN = 00 … 12 für -30° … +30° in 5°-Schritten; 1400/700 = Bildhöhe)
"""
import os, sys, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'img'))
CARDS = ['or', 'noir', 'ambre', 'rose', 'fumee', 'lumiere']
YAWS = list(range(-30, 31, 5))          # Drehfolge in Grad; muss zu DREH in assets/3d/bildflakon.js passen


def render(form, duft, size, samples, tmp, yaws=None):
    out = os.path.join(tmp, f'{form}-{duft}.png')
    cmd = [sys.executable, os.path.join(HERE, 'flakon.py'), form, duft, '--out', out,
           '--size', str(size), '--samples', str(samples)]
    if yaws:
        cmd.append('--yaws=' + ','.join(str(y) for y in yaws))      # mit '=': Werte beginnen mit '-'
    subprocess.run(cmd, check=True, cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for base in ([out[:-4] + f'-{i:02d}' for i in range(len(yaws))] if yaws else [out[:-4]]):
        col = np.asarray(Image.open(base + '.png').convert('RGB')).astype(np.float32) / 255
        mask = np.asarray(Image.open(base + '-maske.png').convert('RGBA'))[..., 3].astype(np.float32) / 255
        yield col, mask


def compose(col, mask, halo=0.0):
    """Farbe aus dem Render, Transparenz aus dem Umriss; optional ein warmer Schein hinter dem Flakon."""
    a, rgb = mask, col
    if halo:
        hh, ww = mask.shape
        m8 = Image.fromarray((mask * 255).astype(np.uint8))
        glow = np.asarray(m8.filter(ImageFilter.GaussianBlur(ww * 0.07))).astype(np.float32) / 255
        glow = np.clip(glow * 1.6, 0, 1) ** 1.2 * halo
        y, x = np.mgrid[0:hh, 0:ww]                       # zum Bildrand hin auslaufen lassen
        r = np.sqrt(((x - ww / 2) / (ww / 2)) ** 2 + ((y - hh / 2) / (hh / 2)) ** 2)
        glow *= np.clip((1.0 - r) / 0.3, 0, 1)
        warm = np.array([1.0, 0.56, 0.2], np.float32)
        ga = glow * (1 - mask)
        a = mask + ga
        rgb = (col * mask[..., None] + warm * ga[..., None]) / np.maximum(a, 1e-4)[..., None]
    rgb = np.where(a[..., None] > 0, rgb, 0)
    return Image.fromarray((np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8), 'RGBA')


def save_w(im, name, widths, q=88):
    for w in widths:
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(os.path.join(IMG, f'{name}-{w}.webp'), quality=q, method=6)


def save_h(im, name, heights, q=86):
    for h in heights:
        im.resize((round(im.width * h / im.height), h), Image.LANCZOS).save(os.path.join(IMG, f'{name}-{h}.webp'), quality=q, method=6)


def main():
    want = sys.argv[1:] or CARDS + ['hero']
    os.makedirs(IMG, exist_ok=True)
    keep = os.environ.get('FLAKON_ROH')          # Ordner für die Rohbilder (sonst temporär)
    with (tempfile.TemporaryDirectory() if not keep else open(os.devnull)) as tmp:
        tmp = keep or tmp
        for v in want:
            if v == 'hero':
                for i, (col, mask) in enumerate(render('hero', '-', 1400, 96, tmp, YAWS)):
                    save_h(compose(col, mask), f'flakon-dreh-{i:02d}', [1400, 700])
            elif v in CARDS:
                for col, mask in render('karte', v, 1200, 128, tmp):
                    save_w(compose(col, mask, 0.5), f'flakon-{v}', [1200, 800, 480])
            print('fertig:', v, flush=True)


if __name__ == '__main__':
    main()
