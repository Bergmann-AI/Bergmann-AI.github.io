"""Nachbearbeitung der 4K-Renders zu Web-Bildern in mehreren Größen.

Aufruf im Ordner mit den Roh-Renders (cab4k_1.png ... cab4k_4.png):
    python3 post_4k.py
Schreibt nach assets/img der Vorlage.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'img')


def grain(a, amt, seed):
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, a.shape[:2]).astype(np.float32)
    lum = a.mean(2, keepdims=True)
    return a + g[..., None] * (amt / 255.0) * (0.35 + lum * (1 - lum) * 2.6)


def save(im, name, q=80):
    im.save(os.path.join(OUT, name), quality=q, method=6)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


def clouds():
    d = Image.open('w4k_desk.png').convert('RGB').resize((3840, 2160), Image.LANCZOS)
    a = np.asarray(d).astype(np.float32) / 255.0
    a = np.clip(grain(a, 3.0, 3), 0, 1)
    d = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    save(d, 'wolken-3840.webp', 78)
    save(d.resize((2560, 1440), Image.LANCZOS), 'wolken-2560.webp', 80)
    save(d.resize((1600, 900), Image.LANCZOS), 'wolken-1600.webp', 80)
    m = Image.open('w4k_mob.png').convert('RGB').resize((2160, 3840), Image.LANCZOS)
    a = np.asarray(m).astype(np.float32) / 255.0
    a = np.clip(grain(a, 2.8, 5), 0, 1)
    m = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    save(m, 'wolken-hoch-2160.webp', 78)
    save(m.resize((1080, 1920), Image.LANCZOS), 'wolken-hoch-1080.webp', 80)


def cabin(i):
    W, H = 3840, 2880
    k = W / 1600.0  # Maßstab gegenüber der ersten 1600er Fassung
    im = Image.open(f'cab4k_{i}.png').convert('RGB').resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a.mean(2, keepdims=True)
    bright = np.clip((lum - 0.62) / 0.38, 0, 1) * a
    bimg = Image.fromarray((bright * 255).astype(np.uint8))
    b1 = np.asarray(bimg.filter(ImageFilter.GaussianBlur(14 * k))).astype(np.float32) / 255.0
    b2 = np.asarray(bimg.filter(ImageFilter.GaussianBlur(48 * k))).astype(np.float32) / 255.0
    a = a + b1 * 0.45 + b2 * 0.35
    yy, xx = np.mgrid[0:H, 0:W]
    r2 = ((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2
    a *= (1 - 0.28 * np.clip(r2, 0, 1.6))[..., None]
    a = np.clip(a, 0, 1) ** 1.06
    a[..., 2] *= 0.96
    a = np.clip(grain(a, 2.6, 10 + i), 0, 1)
    out = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    save(out, f'kabine-{i}-3840.webp', 80)
    for w in (2400, 1600, 800):
        save(out.resize((w, w * 3 // 4), Image.LANCZOS), f'kabine-{i}-{w}.webp', 80)


if __name__ == '__main__':
    # Die Wolken-Renders (w4k_*.png) dienen nur noch als Himmel in den Kabinenfenstern (sky_tex_4k.png für cabin.frag);
    # die Seite selbst nutzt sie nicht mehr. clouds() bei Bedarf von Hand aufrufen.
    for i in range(1, 5):
        cabin(i)
