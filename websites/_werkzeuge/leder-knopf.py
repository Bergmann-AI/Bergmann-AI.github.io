#!/usr/bin/env python3
"""Die Leder-Fläche für die Knöpfe der Unterseite /websites/ (Wunsch des Inhabers, 25.11.2026).

Quelle ist das Bild des Inhabers: dunkelbraunes Leder mit Narbung (quellen/leder-inhaber.png, unverändert).
Das Skript schneidet daraus einen Streifen aus dem gleichmäßig beleuchteten oberen Mittelteil und macht ihn für
kleine Knöpfe lesbar: etwas heller (das Braun soll auf einem 48 Pixel hohen Knopf noch als Braun wirken, nicht als
Schwarz), etwas weniger Kontrast (die hellen Falten stören die Schrift weniger) und etwas wärmer.

Gemessen gegen die Schrift in Elfenbein (#f3eee2): im Mittel 12,9 : 1, in 95 % der Fläche hinter der Schrift
mindestens 6,6 : 1. Nur einzelne helle Faltenlinien liegen darunter; der feine dunkle Schatten unter der Schrift
(text-shadow in der CSS) hält sie dort lesbar.

Aufruf im Repo-Ordner: python3 websites/_werkzeuge/leder-knopf.py   (braucht Pillow)
Ergebnis: websites/assets/leder.webp, 1280 x 112 Pixel, angezeigt mit 640 CSS-Pixeln Breite (scharf bis 2x).
Das reicht für den breitesten Knopf (volle Breite am Handy, unter 640 Pixel).
"""
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "websites" / "_werkzeuge" / "quellen" / "leder-inhaber.png"
OUT = ROOT / "websites" / "assets" / "leder.webp"
BOX = (196, 180, 196 + 1280, 180 + 112)   # Streifen im Quellbild (1672 x 941)
HELL, KONTRAST, FARBE = 1.35, 0.9, 1.12


def main():
    src = Image.open(SRC).convert("RGB")
    t = src.crop(BOX)
    t = ImageEnhance.Brightness(t).enhance(HELL)
    t = ImageEnhance.Contrast(t).enhance(KONTRAST)
    t = ImageEnhance.Color(t).enhance(FARBE)
    t.save(OUT, "WEBP", quality=70, method=6)
    print(f"{OUT.relative_to(ROOT)}: {t.size[0]} x {t.size[1]}, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
