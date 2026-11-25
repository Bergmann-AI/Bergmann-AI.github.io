#!/usr/bin/env python3
"""Das Leder-Logo des Inhabers freistellen (Unterseite /websites/, Wunsch des Inhabers, 25.11.2026).

Quelle ist das Bild des Inhabers: das B aus dunklem Leder mit Naht und Goldkante auf cremefarbenem Grund
(quellen/logo-leder-inhaber.png, unverändert). Das Skript entfernt nur den Grund, damit das Logo auf Creme und auf
Elfenbein gleich sauber steht. Am Bild selbst ändert es nichts.

So wird freigestellt: Der Grund ist ein gleichmäßiges Creme mit leichtem Verlauf, das Skript schätzt ihn als glatte
Fläche. Zum Logo gehört, was deutlich dunkler ist (Leder) oder deutlich farbiger (Gold, Naht). Der weiche Schatten
des Bildes auf dem Grund fällt weg; den Schatten zeichnet auf der Seite die CSS (drop-shadow). Die Kante bleibt weich,
reicht aber höchstens 3 Pixel über das sichere Logo hinaus.

Aufruf im Repo-Ordner: python3 websites/_werkzeuge/logo-freistellen.py   (braucht numpy und Pillow)
Ergebnis: websites/assets/logo-leder.webp, 128 x 128 Pixel, das B über 93 % der Breite wie beim blauen logo.webp
(angezeigt mit 32 CSS-Pixeln, also scharf bis 4x).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "websites" / "_werkzeuge" / "quellen" / "logo-leder-inhaber.png"
OUT = ROOT / "websites" / "assets" / "logo-leder.webp"
SIZE = 128
FILL = 0.93        # Breite des B im quadratischen Bild
REACH = 3          # so weit (Pixel im Quellbild) darf die weiche Kante über das sichere Logo hinausgehen


def lab(rgb):
    """sRGB (0..1) nach CIE-Lab (D65)."""
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(x), f(y), f(z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=-1)


def grow(mask, n):
    """Maske um n Pixel erweitern (Quadrat)."""
    out = mask.copy()
    for _ in range(n):
        m = out.copy()
        m[1:] |= out[:-1]; m[:-1] |= out[1:]; m[:, 1:] |= out[:, :-1]; m[:, :-1] |= out[:, 1:]
        out = m
    return out


def fill_enclosed(mask, max_area):
    """Ganz vom Logo umschlossene helle Stellen schließen: Glanzlichter auf dem Leder und das blasse Gold im Berg sind
    so hell wie der Grund, gehören aber zum Logo. Die Zwischenräume des B hängen alle mit dem Grund außen zusammen;
    ein größerer umschlossener Bereich (über max_area Pixel) bliebe trotzdem Grund."""
    img = Image.fromarray(np.pad(np.where(mask, 255, 0).astype(np.uint8), 1), "L").copy()   # eigenes Bild für floodfill
    ImageDraw.floodfill(img, (0, 0), 128)                         # Grund, der den Bildrand berührt
    enclosed = (np.asarray(img) == 0)[1:-1, 1:-1]
    todo = set(map(tuple, np.argwhere(enclosed).tolist()))
    out, filled = mask.copy(), 0
    while todo:
        start = todo.pop()
        stack, region = [start], [start]
        while stack:
            y, x = stack.pop()
            for n in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if n in todo:
                    todo.remove(n)
                    stack.append(n)
                    region.append(n)
        if len(region) <= max_area:
            ys, xs = zip(*region)
            out[list(ys), list(xs)] = True
            filled += len(region)
    return out, filled


def main():
    rgb = np.asarray(Image.open(SRC).convert("RGB"), dtype=float) / 255
    L = lab(rgb)
    h, w, _ = L.shape

    # Grund: Creme vom Bildrand, als glatte Fläche (Polynom 2. Grades) über das ganze Bild geschätzt
    border = np.concatenate([L[:10].reshape(-1, 3), L[-10:].reshape(-1, 3), L[:, :10].reshape(-1, 3), L[:, -10:].reshape(-1, 3)])
    bg0 = np.median(border, axis=0)
    yy, xx = np.mgrid[0:h, 0:w]
    X, Y = xx / w, yy / h
    F = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], axis=-1).reshape(-1, 6)
    near = (np.linalg.norm(L - bg0, axis=-1) < 5).ravel()
    idx = np.flatnonzero(near)[::7]
    bg, bg_rgb = np.empty_like(L), np.empty_like(rgb)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(F[idx], L.reshape(-1, 3)[idx, c], rcond=None)
        bg[..., c] = (F @ coef).reshape(h, w)
        coef, *_ = np.linalg.lstsq(F[idx], rgb.reshape(-1, 3)[idx, c], rcond=None)
        bg_rgb[..., c] = (F @ coef).reshape(h, w)

    # Logo: deutlich dunkler als der Grund (Leder) oder deutlich farbiger (Gold, Naht)
    darker = bg[..., 0] - L[..., 0]
    chroma = np.hypot(L[..., 1] - bg[..., 1], L[..., 2] - bg[..., 2])
    score = np.maximum(darker / 30, chroma / 14)
    core, filled = fill_enclosed(score >= 1, max_area=int(h * w * 0.005))
    soft = np.clip((score - 0.35) / 0.65, 0, 1)
    alpha = np.where(core, 1.0, np.where(grow(core, REACH), soft, 0.0))

    # weiche Kante ohne Creme: den Anteil des Grundes aus der Farbe herausrechnen, damit kein heller Saum bleibt
    edge = (alpha > 0) & (alpha < 1)
    a = np.maximum(alpha, 0.15)[..., None]
    rgb = np.where(edge[..., None], np.clip((rgb - (1 - a) * bg_rgb) / a, 0, 1), rgb)

    # Ausschnitt: das B zentriert in einem Quadrat, 93 % breit
    ys, xs = np.nonzero(alpha > 0.5)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    side = int(round(max(x1 - x0, y1 - y0) / FILL))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    left, top = int(round(cx - side / 2)), int(round(cy - side / 2))
    rgba = np.dstack([rgb, alpha[..., None]])
    canvas = np.zeros((side, side, 4))
    sx0, sy0 = max(0, left), max(0, top)
    sx1, sy1 = min(w, left + side), min(h, top + side)
    canvas[sy0 - top:sy1 - top, sx0 - left:sx1 - left] = rgba[sy0:sy1, sx0:sx1]

    img = Image.fromarray((canvas * 255).round().astype(np.uint8), "RGBA")
    img = img.convert("RGBa").resize((SIZE, SIZE), Image.LANCZOS).convert("RGBA")   # Kanten sauber verkleinern
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "WEBP", quality=92, method=6)
    print(OUT.relative_to(ROOT), img.size, OUT.stat().st_size, "Bytes; B im Quellbild",
          f"{x1 - x0}x{y1 - y0} px, Quadrat {side} px, geschlossene helle Stellen {filled} px")


if __name__ == "__main__":
    main()
