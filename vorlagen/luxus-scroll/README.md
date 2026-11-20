# Vorlage „Luxus-Scroll“

Premium-Website mit Scroll-Erzählung, nachgebaut nach dem Referenzvideo (Privatjet-Seite), ohne Markennamen und ohne Sprecher, komplett auf Deutsch.
Reines HTML, CSS und JavaScript. Keine Bibliothek, kein Build-Schritt.

**Ansehen:** Ordner über einen lokalen Server öffnen, z. B. `python3 -m http.server` im Ordner `vorlagen/luxus-scroll` und dann `http://localhost:8000`.
(Direkt per Doppelklick geht der Globus nicht, weil der Browser die Punkte-Datei dann nicht laden darf.)

## Aufbau der Seite

| Nr. | Abschnitt | Was passiert |
|---|---|---|
| 1 | Fenster-Hero „Mehr als Luxus.“ (Fensterfoto) | Rollo fährt beim Laden in der Scheibe hoch, Licht fällt in die Kabine |
| 2 | Zoom in die Scheibe, „Das Erlebnis“ | Scrollen zoomt ins Foto, bis der Blick nach draußen den Bildschirm füllt, Text hellt sich Wort für Wort auf, dann Übergang ins Helle |
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
4. **Bilder** in `assets/img` (alles bis 4K, der Browser lädt automatisch die passende Größe):
   - `fenster-foto-2944/2208/1472/736.webp`: das Fensterfoto im Hero (hochkant, größte Fassung 2944 x 5252).
     Beim Scrollen wird bis in die Scheibe gezoomt. Wer ein anderes Foto nimmt, zeichnet die Glasfläche neu:
     `fenster-glas.svg` (Maske für das Rollo) und dieselben Punkte als `GLASS` oben in `assets/js/main.js`
     (Pixel des Originalfotos). `FOCUS_DESK` und `FOCUS_MOBILE` legen fest, welcher Bildpunkt am Ende in der Mitte steht.
   - `kabine-1` bis `kabine-4`, je in `-3840`, `-2400`, `-1600`, `-800`: ein Bild pro Akkordeon-Thema, 4:3 (4K = 3840 x 2880).
     Eigene Fotos am besten in 3840 x 2880 liefern und in die vier Größen verkleinern.
   - `jet-1250/2000/3000/4000.webp`: der Jet in Draufsicht mit transparentem Hintergrund (4K = 3200 x 4000), dazu `jet-schatten.webp`.
   - `sitzplan.svg`: der passende Sitzplan. Er nutzt dieselben Koordinaten wie das Jet-Bild und muss deckungsgleich bleiben.
5. **Kundenstimmen:** Abschnitt `#stimmen`. Dort stehen nur Platzhalter. Nur echte Stimmen mit Erlaubnis eintragen, Initialen oder echtes Foto in `voice__avatar`. Die Zeile „Beispielplätze …“ danach löschen.
6. **Kontakt:** Der Link „Flug planen“ im Abschluss zeigt auf `anfrage@example.com`. Echte Adresse oder Formular-Seite eintragen.
7. **Impressum und Datenschutz:** Links in der Fußzeile auf die echten Seiten setzen.
8. **Suchmaschinen:** `<meta name="robots" content="noindex, nofollow">` entfernen, sobald die Seite live gehen soll.
9. **Globus-Routen:** oben in `assets/js/globe.js` (Städte und Verbindungen).

## Woher die Bilder kommen

- **Fensterfoto (Hero):** vom Inhaber geliefert (`_werkzeuge/quellen/fenster-original.jpg`, 736 x 1313). Für 4K mit Real-ESRGAN viermal vergrößert (`_werkzeuge/hochskalieren.py`). Mehr Schärfe als das Original hergibt, ist so nicht möglich: Auf 4K-Bildschirmen wirkt der voll gezoomte Blick etwas weich. Für echte 4K-Schärfe das Foto in mindestens 3000 x 5300 Pixeln besorgen. **Vor dem Einsatz für Kunden klären, dass die Nutzungsrechte an dem Foto vorliegen.**
- **Kabine:** eigene 3D-Szene (Distanzfelder: Sessel, Tische, Fenster mit gerendertem Wolkenhimmel), gerendert und nachbearbeitet. Das sind Visualisierungen. Für echte Kunden besser echte Fotos einsetzen.
- **Jet:** eigenes 3D-Modell (Rumpf, gepfeilte Flügel mit Winglets, Hecktriebwerke, T-Leitwerk) als Shader, in 6000 px Höhe gerendert und für das Web verkleinert. Hochglanz-Schwarz mit Lichtkanten wie im Referenzvideo.
- **Sitzplan, Bordkarte:** eigene Vektorgrafiken.
- **Globus:** Landpunkte aus Natural-Earth-Daten (Paket `world-atlas`, gemeinfrei).
- **Symbole:** eigene Linien-Symbole, das Flugzeug-Symbol aus Lucide (ISC-Lizenz).
- **Schriften:** Cormorant Garamond und Manrope, beide SIL Open Font License (Lizenztexte in `assets/fonts`).

Die Werkzeuge zum Neu-Erzeugen liegen in `_werkzeuge/`:
`hochskalieren.py` (Fensterfoto 4x), `sitzplan_svg.py` (Sitzplan), `render/jet.frag` mit `render/jet.json` und `render/jet_post.py` (Jet rendern und in Web-Größen samt Schatten umwandeln), `render/clouds.frag` (Wolkenhimmel für die Kabinenfenster) und `render/cabin.frag` (Shader), `render/render.cjs` (rendert per Playwright), `render/noise3d.py` (Rauschtextur), `render/post_4k.py` (macht aus den 4K-Renders die Web-Bilder in allen Größen). Die Einstellungen der fertigen Bilder stehen in den `.json`-Dateien daneben. Gerendert wird 1,5-fach größer als 4K und dann verkleinert, damit Kanten sauber sind.

## Technik in Kürze

- Ein Scroll-Wert folgt der echten Scrollposition weich. Daraus berechnet `assets/js/main.js` alle Zustände (Fenster-Zoom, Jet-Flug, Sitzplan-Wischen, Wort-Aufhellen).
- Abschnitte 1 bis 3 sind „angeheftet“ (`position: sticky`), damit die Szene stehen bleibt, während gescrollt wird.
- Der Globus zeichnet mit der Grafikkarte (WebGL, ohne Bibliothek). Ohne WebGL zeichnet er denselben Globus als Canvas 2D. Er läuft nur, wenn er sichtbar ist.
- Auf sehr großen Bildschirmen (4K ohne Skalierung) wachsen Überschriften, Abstände und kleine Schrift mit.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt ruhige Überblendungen statt Zoom und Flug.

## Flüssiges Scrollen (so viele Bilder pro Sekunde wie möglich)

Die Seite ist darauf gebaut, dass die Grafikkarte die Bewegung übernimmt und der Prozessor kaum etwas tun muss:

- Beim Scrollen ändern sich nur Verschiebung, Größe und Deckkraft fertiger Ebenen. Nichts muss neu gezeichnet oder neu angeordnet werden.
- Weiche Lichter und Schatten sind fertige Bilder statt Effekte, die der Browser in jedem Bild neu rechnen müsste.
- Der Wechsel Jet zu Sitzplan schiebt zwei feste Masken übereinander, statt sie in jedem Bild neu zu berechnen.
- Positionen der Abschnitte werden einmal gemessen (und bei Größenänderung neu), nie während des Scrollens.
- Globus, Städte-Laufband und Kundenstimmen laufen nur, solange sie zu sehen sind.
- Bildschirme mit 120 Hz bekommen automatisch 120 Bilder pro Sekunde.

Gemessen (Chrome, Rechenzeit pro Bild im Mittel, ohne echte Grafikkarte): Desktop 1440 px etwa 1 bis 2 ms,
Handy 390 px (3-fache Pixeldichte) etwa 1 bis 1,5 ms, 4K etwa 1 bis 2 ms. Für 120 Bilder pro Sekunde stehen 8,3 ms zur Verfügung.

**Beim Anpassen bitte beibehalten:** neue Bewegungen nur über `transform` und `opacity`, keine Filter, Schatten oder Masken,
die sich beim Scrollen ändern, und keine Messungen (`getBoundingClientRect`, `offsetHeight`) im Scroll-Ablauf.

