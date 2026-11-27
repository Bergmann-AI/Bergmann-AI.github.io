---
name: website-bilder
description: Scharfe, schnelle Bilder auf Websites. Regeln für Auflösung (2x-Ziel), Formate (AVIF, WebP, SVG), srcset und sizes, Bildausschnitt am Handy, Ladeverhalten des Hauptbilds (LCP), Farbprofil, Metadaten und Video, dazu Skripte, die Kundenfotos prüfen, alle Größen erzeugen und im echten Browser messen, ob Bilder unscharf oder zu schwer sind. Laden, sobald Fotos, Logos, Screenshots, Hintergrundbilder oder Videos auf eine Seite kommen, bei "unscharf", "pixelig", "lädt langsam", "bessere Auflösung", 4K oder Retina. Ergänzt website-regie, impeccable und taste-skill.
---

# Website-Bilder

Ein Bild ist scharf, wenn auf jeden CSS-Pixel etwa 2 Bildpixel kommen, und schnell, wenn es nicht mehr sind. Das Hauptbild oben entscheidet über die gefühlte Geschwindigkeit (auf rund zwei Dritteln der Handy-Seiten ist es das größte Element). Belege in `references/quellen.md`, Sonderfälle (Video, Hochskalieren, Pflichtbilder) in `references/sonderfaelle.md`.

**Vorrang:** echte Fotos und Material des Kunden (website-regie Regel 3). KI-Bilder nur, wenn der Nutzer sie ausdrücklich will.

## Die Regeln

1. **Ziel 2x, nie mehr.** Bildbreite = Anzeigebreite in CSS-Pixeln × 2. Mehr als 2x sieht niemand (Twitter hat 3x-Bilder 2019 auf 2x gekappt: gleiches Bild, ein Drittel weniger Daten). Auf 1x-Bildschirmen (der häufigste Desktop in Deutschland ist 1920 × 1080) wählt der Browser per `srcset` selbst die kleinere Datei.
2. **Mindestgröße der Vorlage je Platz.** Kleiner als die linke Spalte wirkt weich, ab der rechten ist es überall scharf.

   | Platz (`--slot`) | Anzeige bei 1440 | Minimum | Ideal |
   |---|---|---|---|
   | `hero` volle Breite | 100vw | 1920 px | 2880 px |
   | `breit` Inhaltsbreite | bis 1200 px | 1600 px | 2400 px |
   | `halb` halbe Spalte | bis 720 px | 960 px | 1440 px |
   | `karte` Drittel | bis 460 px | 640 px | 960 px |
   | `portrait` Team | bis 400 px | 500 px | 800 px |
   | `logo` | Höhe 32 bis 64 px | SVG | SVG |

   Hochformat am Handy: Ein Querformat-Hero, das am Handy mit `object-fit: cover` hochkant gezeigt wird, braucht auch genug **Höhe** (390 × 844 bei 2x heißt 1688 px Höhe). Sonst einen eigenen Hochformat-Ausschnitt per `<picture><source media>` anbieten.
3. **Formate.** Fotos als AVIF mit WebP als Rückfall (AVIF ist bei gleicher Qualität etwa halb so groß wie JPEG, WebP etwa 30 % kleiner). Logos, Symbole, Diagramme als SVG. Screenshots von Oberflächen als WebP verlustfrei oder AVIF hoch. JPEG nur für Vorschaubilder in sozialen Netzen und E-Mails. Nie Text ins Bild backen (taste: jedes Wort ist echter Text).
4. **`srcset` immer mit `sizes`.** Ohne `sizes` nimmt der Browser 100vw an und lädt zu groß. `sizes` beschreibt das echte Layout (der Baustein von `machen` bringt passende Werte je Platz mit; bei eigenem Raster anpassen). Breitenstufen etwa ×1,3 bis ×1,5 auseinander. `sizes="auto, …"` nur bei lazy Bildern und nur als Zusatz vorn (Chrome und Edge können es, Safari noch nicht).
5. **Laden.**
   - Das Hauptbild im ersten Bildschirm: im HTML (nicht per JavaScript nachgeladen), **nie** `loading="lazy"`, dafür `fetchpriority="high"`. Liegt es im CSS, zusätzlich `<link rel="preload" as="image" imagesrcset imagesizes>`.
   - Alle anderen: `loading="lazy" decoding="async"`.
   - Immer `width` und `height` (Seitenverhältnis), sonst springt die Seite (CLS über 0,1).
   - Ziele: LCP unter 2,5 s, CLS unter 0,1 (Core Web Vitals).
6. **Bearbeitung jedes Fotos** (macht `bilder.py machen` automatisch):
   - EXIF-Drehung anwenden, nach **sRGB** umrechnen (iPhone-Fotos sind oft Display P3 und wirken sonst blass), **alle Metadaten entfernen** (GPS-Daten im Foto verraten Wohnorte: Datenschutz).
   - Verkleinern mit Lanczos, danach leicht nachschärfen; nie stark schärfen (helle Säume an Kanten).
   - Ausschnitt mit Fokuspunkt (`--fokus 0.5,0.35`), damit Gesichter und Produkte im Bild bleiben.
   - Durchschnittsfarbe als `background` am `<img>`: Die Fläche ist vor dem Laden nicht leer.
7. **Gewicht.** Richtwerte nach `machen`: Hero in 2560 px als AVIF etwa 150 bis 350 KB, Karte unter 60 KB. Alle Bilder einer Handy-Seite nach vollem Scrollen unter etwa 1,5 MB, Desktop unter 2,5 MB (`messen.mjs` warnt).
8. **Eine Bildsprache.** Fotos einer Seite haben ähnliches Licht, ähnlichen Weißabgleich und ähnliche Helligkeit; lieber vorsichtig angleichen als einzeln "schön filtern". Keine Farbflächen oder Verläufe über Fotos (taste); Schrift auf Fotos nur nach den Regeln von taste.
9. **Hintergrundbilder** lieber als `<img>` mit `object-fit: cover` hinter dem Inhalt (bekommt `srcset`, lazy und Priorität). Muss es CSS sein: `image-set(url(a.avif) type("image/avif"), url(a.webp) type("image/webp"))`.
10. **Bildnachweise** in einer Fußzeile, keine Bildunterschriften (taste). Alt-Texte schreibt website-texte; schmückende Bilder bekommen `alt=""`.

## Ablauf

1. **Fotos einsammeln.** Beim Kunden die **Originale** anfordern (Mail mit "tatsächlicher Größe", Cloud-Link, AirDrop), **nie WhatsApp-Kopien**: Messenger verkleinern und komprimieren stark.
2. **Prüfen:** `python3 -I scripts/bilder.py pruefen <ordner>` zeigt je Foto Pixel, Schärfe, Belichtung, Farbprofil, GPS-Daten und für welche Plätze es reicht. Mit `--slot hero` gezielt für einen Platz. Was nicht reicht, geht als Liste an den Kunden ("bitte größer oder neu fotografieren").
3. **Erzeugen:** je Foto
   `python3 -I scripts/bilder.py machen foto.jpg --slot halb --name werkstatt-innen --ziel assets/img --format 4:3 --fokus 0.5,0.4 --alt "…"`
   Das legt AVIF und WebP in allen Breiten an (nie größer als das Original) und druckt den `<picture>`-Baustein. `--qualitaet hoch` für Produktdetails und feine Stoffe, `--max` begrenzt die größte Breite, `--pfad` setzt den Pfad im Baustein.
4. **Einbauen:** Baustein einsetzen, `sizes` mit dem echten Raster abgleichen.
5. **Prüfen ohne Browser:** `python3 -I scripts/bilder.py seite index.html` (fehlende Maße, `sizes`, `alt`, lazy am ersten Bild, schwere Dateien).
6. **Im Browser messen:** `node scripts/messen.mjs index.html` (bei Seiten in Unterordnern mit Links ab der Wurzel: `--root .`). Misst bei 1440 @2x, 1920 @1x und 390 @3x, welche Datei wirklich lädt, die echte Pixeldichte, das LCP-Element und das Gesamtgewicht. FAIL heißt sichtbar unscharf oder LCP-Bild lazy; WARN heißt weich oder deutlich zu groß. Bilder, die beim Scrollen bewusst gezoomt werden, dürfen über 2x liegen: im Bericht nennen.
7. **Bericht:** fehlende oder zu kleine Fotos (an den Kunden), Ergebnis von `messen.mjs`, jede begründete Ausnahme.

## Häufige Fehler und die Lösung

| Fehler | Lösung |
|---|---|
| Foto am Desktop unscharf | größere Stufe im `srcset` oder größeres Original; `messen.mjs` zeigt die Dichte |
| Handy lädt die 2880-px-Datei | `sizes` fehlt oder sagt 100vw für ein halbes Bild |
| Hero erscheint spät | lazy entfernt, `fetchpriority="high"`, nicht per JS einsetzen |
| Seite springt beim Laden | `width`/`height` am `<img>` |
| Farben im Browser blass | Display-P3-Foto ohne Umrechnung: `machen` rechnet nach sRGB |
| Kopf im Handy-Ausschnitt abgeschnitten | eigener Hochformat-Ausschnitt mit `--fokus` und `<source media>` |
| Logo verwaschen | SVG statt PNG; sonst 2x der Anzeigehöhe |
