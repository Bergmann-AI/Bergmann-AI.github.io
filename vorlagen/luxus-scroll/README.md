# Vorlage „Luxus-Scroll“

Premium-Website mit Scroll-Erzählung, nachgebaut nach dem Referenzvideo (Privatjet-Seite), ohne Markennamen und ohne Sprecher, komplett auf Deutsch.
Reines HTML, CSS und JavaScript. Keine Bibliothek, kein Build-Schritt.

**Ansehen:** Ordner über einen lokalen Server öffnen, z. B. `python3 -m http.server` im Ordner `vorlagen/luxus-scroll` und dann `http://localhost:8000`.
(Direkt per Doppelklick geht der Globus nicht, weil der Browser die Punkte-Datei dann nicht laden darf.)

## Aufbau der Seite

| Nr. | Abschnitt | Was passiert |
|---|---|---|
| 1 | Fenster-Hero „Mehr als Luxus.“ | Rollo fährt beim Laden hoch, Licht fällt in die Kabine |
| 2 | Zoom in die Wolken, „Das Erlebnis“ | Scrollen fliegt durchs Fenster, Text hellt sich Wort für Wort auf, dann Übergang ins Helle |
| 3 | „Fliegen mit Klasse.“ | Jet fliegt über die Überschrift, Datenblatt erscheint, Jet wird zum Sitzplan |
| 4 | „Leben an Bord“ | Akkordeon, jedes Thema zeigt ein eigenes Bild |
| 5 | „Ihre Welt“ | Punkt-Globus mit Flugrouten, Städte-Laufband, Bordkarte |
| 6 | „Stimmen unserer Gäste“ | drei laufende Spalten mit Kundenstimmen (am Handy zum Wischen) |
| 7 | „Machen Sie sie außergewöhnlich.“ | Abschluss mit Anfrage-Link |

Unten in der Mitte schwebt immer der Button „Flug planen“. Unten links sitzt ein kleiner Schalter, der alle Bewegungen anhält.

## Für einen neuen Kunden anpassen

1. **Markenname:** In `index.html` überall `MARKE` ersetzen (Logo, Bordkarte, Datenblatt, Fußzeile). Den `<title>` anpassen.
2. **Farben und Schriften:** nur im `:root`-Block oben in `assets/css/style.css`.
3. **Texte:** direkt in `index.html`. Die Sätze sind Beispieltexte für einen Privatjet-Anbieter.
4. **Bilder** in `assets/img`:
   - `wolken-*.webp`: Himmel hinter dem Fenster (Desktop 2560 und 1600, Handy hochkant 900).
   - `kabine-1.webp` bis `kabine-4.webp`: je ein Bild pro Akkordeon-Thema, 4:3, ca. 1600 x 1200.
   - `jet.svg` und `sitzplan.svg`: Jet in Draufsicht und passender Sitzplan (müssen deckungsgleich bleiben).
5. **Kundenstimmen:** Abschnitt `#stimmen`. Dort stehen nur Platzhalter. Nur echte Stimmen mit Erlaubnis eintragen, Initialen oder echtes Foto in `voice__avatar`. Die Zeile „Beispielplätze …“ danach löschen.
6. **Kontakt:** Der Link „Flug planen“ im Abschluss zeigt auf `anfrage@example.com`. Echte Adresse oder Formular-Seite eintragen.
7. **Impressum und Datenschutz:** Links in der Fußzeile auf die echten Seiten setzen.
8. **Suchmaschinen:** `<meta name="robots" content="noindex, nofollow">` entfernen, sobald die Seite live gehen soll.
9. **Globus-Routen:** oben in `assets/js/globe.js` (Städte und Verbindungen).

## Woher die Bilder kommen

Alle Bilder sind selbst erzeugt, keine KI-Bilder und keine fremden Fotos:

- **Wolken:** eigener Volumen-Shader (Raymarching) mit 3D-Rauschen, gerendert im Browser.
- **Kabine:** eigene 3D-Szene (Distanzfelder: Sessel, Tische, Fenster mit dem Wolkenbild), gerendert und nachbearbeitet. Das sind Visualisierungen. Für echte Kunden besser echte Fotos einsetzen.
- **Jet, Sitzplan, Fenster, Bordkarte:** eigene Vektorgrafiken.
- **Globus:** Landpunkte aus Natural-Earth-Daten (Paket `world-atlas`, gemeinfrei).
- **Symbole:** eigene Linien-Symbole, das Flugzeug-Symbol aus Lucide (ISC-Lizenz).
- **Schriften:** Cormorant Garamond und Manrope, beide SIL Open Font License (Lizenztexte in `assets/fonts`).

Die Werkzeuge zum Neu-Erzeugen liegen in `_werkzeuge/`:
`jet_svg.py` (Jet und Sitzplan), `render/clouds.frag` und `render/cabin.frag` (Shader), `render/render.cjs` (rendert per Playwright), `render/noise3d.py` (Rauschtextur), `render/cabin_post.py` (Nachbearbeitung). Die Einstellungen der fertigen Bilder stehen in den `.json`-Dateien daneben.

## Technik in Kürze

- Ein Scroll-Wert folgt der echten Scrollposition weich. Daraus berechnet `assets/js/main.js` alle Zustände (Fenster-Zoom, Jet-Flug, Sitzplan-Wischen, Wort-Aufhellen).
- Abschnitte 1 bis 3 sind „angeheftet“ (`position: sticky`), damit die Szene stehen bleibt, während gescrollt wird.
- Der Globus ist ein Canvas ohne Bibliothek und läuft nur, wenn er sichtbar ist.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt ruhige Überblendungen statt Zoom und Flug.
