# Sonderfälle: Video, Hochskalieren, Pflichtbilder, Art Direction

## Hochformat-Ausschnitt fürs Handy (Art Direction)

Zwei Läufe von `machen`, dann zusammensetzen:

```bash
python3 -I bilder.py machen hero.jpg --slot hero --name hero --ziel assets/img --format 16:9 --fokus 0.5,0.45
python3 -I bilder.py machen hero.jpg --slot breit --name hero-hoch --ziel assets/img --format 4:5 --fokus 0.55,0.4 --max 1600
```

```html
<picture>
  <source media="(max-width: 700px)" type="image/avif" srcset="assets/img/hero-hoch-640.avif 640w, … 1600w" sizes="100vw">
  <source media="(max-width: 700px)" type="image/webp" srcset="assets/img/hero-hoch-640.webp 640w, … 1600w" sizes="100vw">
  <source type="image/avif" srcset="…" sizes="100vw">
  <source type="image/webp" srcset="…" sizes="100vw">
  <img src="assets/img/hero-1280.webp" width="2880" height="1620" alt="…" fetchpriority="high">
</picture>
```

Die `<source>` mit `media` stehen vorn. `width`/`height` am `<img>` gelten für das Querformat; für das Handy das Seitenverhältnis per CSS setzen (`aspect-ratio: 4 / 5` im Media Query), damit nichts springt.

## Hochskalieren (nur als Notlösung)

1. Erst den Kunden nach dem Original fragen. Fast immer gibt es eine größere Fassung (Handy-Galerie, Fotograf, alte Website-Uploads in voller Größe).
2. Reicht es nicht: Werkzeug im Repo Bergmann AI, `vorlagen/luxus-scroll/_werkzeuge/hochskalieren.py` (Real-ESRGAN x4plus über ONNX Runtime, ohne PyTorch; Gewichte BSD-3, separat laden). Ergebnis zu 86 % mit 14 % einer normalen Lanczos-Vergrößerung mischen, sonst wirken Wolken und Haut "gemalt".
3. Grenzen:
   - Nicht für Gesichter, Schrift, Produktdetails oder Speisen: Das Netz erfindet Details. Produktfotos müssen das echte Produkt zeigen (irreführende Werbung, UWG).
   - Mehr Schärfe als das Original hergibt, entsteht nicht. Im Bericht als Hochskalierung nennen, beim Kunden besseres Material anfordern.
   - Gut geeignet: Himmel, Landschaft, Architektur-Totalen, weiche Hintergründe.

## Video

- Nur, wenn Bewegung etwas zeigt, das ein Foto nicht kann (Produkt in Aktion, Ablauf). Auf Seiten der Art place sparsam (taste: Fotos führen).
- `<video muted playsinline loop preload="metadata" poster="…">` mit Poster aus dem ersten Bild (über `bilder.py machen` als AVIF/WebP). Unter `prefers-reduced-motion: reduce` nicht automatisch starten, sichtbarer Pause-Knopf bei mehr als 5 s Bewegung (WCAG 2.2.2).
- Hero-Schleife: 6 bis 12 s, 1080p genügt (1920 breit), unter etwa 3 bis 5 MB. Kodieren:

  ```bash
  ffmpeg -i roh.mov -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 23 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -an hero.mp4
  ffmpeg -i roh.mov -vf "scale=1920:-2,fps=30" -c:v libsvtav1 -crf 35 -preset 6 -pix_fmt yuv420p -an hero-av1.mp4   # zusätzlich, wenn verfügbar
  ```

  Reihenfolge der `<source>`: AV1 zuerst (`type='video/mp4; codecs="av01.0.08M.08"'`), dann H.264.
- Video, das dem Scrollen folgt (Scrubbing): jedes Bild ein Schlüsselbild, sonst ruckelt es (`-g 1`, dafür größer); oder eine Bildfolge auf einem Canvas. Länge und Gewicht vorher abschätzen, am Handy oft besser eine kürzere Fassung.
- YouTube oder Vimeo nur mit Zwei-Klick-Lösung (erst nach Zustimmung laden, Vorschaubild lokal).

## Pflichtbilder jeder Seite

| Datei | Größe | Hinweis |
|---|---|---|
| `favicon.svg` | Vektor | mit `@media (prefers-color-scheme: dark)` im SVG, wenn das Logo auf Dunkel verschwindet |
| `favicon-32.png` (oder `.ico`) | 32 × 32 | Rückfall |
| `apple-touch-icon.png` | 180 × 180 | ohne Transparenz, Logo mit Rand |
| `og.jpg` | 1200 × 630 | Vorschau in WhatsApp, LinkedIn, Facebook; unter 300 KB; Text groß und mittig, weil Ränder beschnitten werden |

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="https://domain.de/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
```

## Screenshots von Oberflächen (Software, Dashboards)

- Mit Playwright bei `deviceScaleFactor: 2` aufnehmen, als WebP verlustfrei oder AVIF mit `--qualitaet hoch` speichern. Nie einen 1x-Screenshot auf 2x-Bildschirmen zeigen: Schrift wird sofort weich.
- Besser noch: die Oberfläche als echtes HTML nachbauen (taste: `app-frame`), dann ist sie bei jeder Auflösung scharf.
