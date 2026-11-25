#!/usr/bin/env python3
"""Das Bergmann-AI-Logo in braunem Leder für die Unterseite /websites/ (Wunsch des Inhabers, 25.11.2026).

Form und Flächen kommen aus dem echten Logo (logo.webp im Repo-Ordner): Seine Deckkraft ist die Form, seine
Helligkeit die Facetten des Bergs. Das Leder ist berechnet, kein Foto und kein KI-Bild: Narben aus unregelmäßigen
Zellen (Worley-Rauschen), von oben links beleuchtet, dazu feine Poren und leichte Farbwolken. Die Schnittkante ist
dunkler eingefärbt wie bei echtem Leder, und die Prägung fängt oben links etwas Licht.

Aufruf im Repo-Ordner: python3 websites/_werkzeuge/logo-leder.py   (braucht numpy und Pillow)
Ergebnis: websites/assets/logo-leder.webp, 128 x 128 Pixel (angezeigt mit 32 CSS-Pixeln, also scharf bis 4x).
Der feste Startwert sorgt dafür, dass jeder Aufruf dasselbe Leder ergibt.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "logo.webp"
OUT = ROOT / "websites" / "assets" / "logo-leder.webp"
N = 512          # Arbeitsgröße
SIZE = 128       # Ausgabe
rng = np.random.default_rng(20261125)

# Lederfarben von dunkel nach hell (Cognac): dunkle Facetten, Grundton, Licht auf der Kante des Bergs
STOPS = [(0.0, "#432612"), (0.5, "#85521f"), (1.0, "#c48b4a")]


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=float) / 255


def blur(a, s):
    """Gaußsche Unschärfe, getrennt nach Zeilen und Spalten."""
    r = max(1, int(3 * s))
    x = np.arange(-r, r + 1)
    k = np.exp(-x * x / (2 * s * s))
    k /= k.sum()
    p = np.pad(a, ((r, r), (0, 0)), mode="edge")
    a = sum(k[i] * p[i:i + a.shape[0]] for i in range(2 * r + 1))
    p = np.pad(a, ((0, 0), (r, r)), mode="edge")
    return sum(k[i] * p[:, i:i + a.shape[1]] for i in range(2 * r + 1))


def smooth_noise(s):
    """Weiches Rauschen zwischen -1 und 1 mit Strukturen der Größe s."""
    a = blur(rng.standard_normal((N, N)), s)
    return a / (np.abs(a).max() + 1e-9)


def worley(yy, xx, cell):
    """Abstand zum nächsten (f1) und zweitnächsten (f2) Zellpunkt."""
    g = N // cell + 4
    jit = rng.random((g, g, 2))
    cy, cx = np.floor(yy / cell).astype(int), np.floor(xx / cell).astype(int)
    f1 = np.full(yy.shape, np.inf)
    f2 = np.full(yy.shape, np.inf)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ny, nx = cy + dy, cx + dx
            j = jit[(ny + 2) % g, (nx + 2) % g]
            d = np.hypot(yy - (ny + j[..., 0]) * cell, xx - (nx + j[..., 1]) * cell)
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
    return f1, f2


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def main():
    src = Image.open(SRC).convert("RGBA").resize((N, N), Image.LANCZOS)
    s = np.asarray(src, dtype=float) / 255
    alpha = s[..., 3]
    inside = alpha > 0.5

    # Facetten: Helligkeit des Logos, auf 0..1 gestreckt und etwas zusammengezogen, damit es ein Material bleibt
    lum = s[..., 0] * 0.2126 + s[..., 1] * 0.7152 + s[..., 2] * 0.0722
    lo, hi = np.percentile(lum[inside], [2, 98])
    t = 0.12 + 0.76 * np.clip((lum - lo) / (hi - lo), 0, 1)
    pos = [p for p, _ in STOPS]
    cols = np.array([hexrgb(c) for _, c in STOPS])
    base = np.stack([np.interp(t, pos, cols[:, c]) for c in range(3)], axis=-1)

    # Narben: unregelmäßige Zellen mit Falten dazwischen, das Raster leicht verzogen wie gewachsene Haut
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    wy, wx = smooth_noise(18) * 7, smooth_noise(18) * 7
    f1, f2 = worley(yy + wy, xx + wx, 15)
    coarse = smoothstep(0, 5.5, f2 - f1) * (1 - 0.25 * np.clip(f1 / 15, 0, 1) ** 2)
    f1b, f2b = worley(yy - wx * 0.6, xx + wy * 0.6, 6)
    fine = smoothstep(0, 2.2, f2b - f1b)
    pores = blur(rng.standard_normal((N, N)), 0.8)
    height = 0.72 * coarse + 0.22 * fine + 0.06 * pores / (np.abs(pores).max() + 1e-9)

    # Licht von oben links auf die Narben
    gy, gx = np.gradient(blur(height, 0.7) * 3.2)
    nz = 1 / np.sqrt(gx * gx + gy * gy + 1)
    light = np.array([-0.45, -0.55, 0.70])
    light /= np.linalg.norm(light)
    shade = (-gx * light[0] - gy * light[1] + light[2]) * nz
    grain = 1 + 0.55 * (shade - light[2])
    crease = 0.80 + 0.20 * coarse                      # in den Falten sammelt sich Schatten
    mottle = 1 + 0.07 * smooth_noise(40)               # gegerbtes Leder ist nie ganz gleichmäßig

    # Kante: dunkler eingefärbt; Prägung mit Licht oben links, Schatten unten rechts
    soft = blur(alpha, 5)
    rim = np.clip((1 - soft) / 0.5, 0, 1) * inside
    burnish = 1 - 0.32 * rim ** 1.5
    by, bx = np.gradient(blur(alpha, 3.5))
    bevel = (bx + by) / np.sqrt(2)
    bevel = bevel / (np.abs(bevel).max() + 1e-9)
    emboss = 1 + 0.38 * bevel

    rgb = base * (grain * crease * mottle * burnish * emboss)[..., None]
    rgb = np.clip(rgb, 0, 1)

    out = Image.fromarray(np.dstack([rgb, alpha[..., None]]).__mul__(255).round().astype(np.uint8), "RGBA")
    out = out.convert("RGBa").resize((SIZE, SIZE), Image.LANCZOS).convert("RGBA")   # Kanten sauber verkleinern
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "WEBP", quality=92, method=6)
    a = np.asarray(out, dtype=float)
    m = a[..., 3] > 200
    print(OUT.relative_to(ROOT), out.size, OUT.stat().st_size, "Bytes, mittlere Farbe",
          "#%02x%02x%02x" % tuple(int(v) for v in a[..., :3][m].mean(0)))


if __name__ == "__main__":
    main()
