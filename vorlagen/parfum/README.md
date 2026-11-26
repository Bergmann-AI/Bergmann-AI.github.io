# Vorlage „Parfum“

Parfum-Website mit 3D-Szene, nachgebaut nach einem Referenzvideo (Parfum-Seite eines anderen Studios), ohne dessen Markennamen, Logo, Texte und Bilder, komplett auf Deutsch. Wie das Original den Namen seines Studios trägt, trägt diese Vorlage das Logo von Bergmann AI (Wunsch des Inhabers, 26.11.2026).
Reines HTML, CSS und JavaScript, dazu three.js lokal im Ordner. Kein Build-Schritt. Die Flakons sind fotorealistisch mit Blender gerendert.

**Ansehen:** Ordner über einen lokalen Server öffnen, z. B. `python3 -m http.server` im Ordner `vorlagen/parfum` und dann `http://localhost:8000`.
(Per Doppelklick lädt die 3D-Szene nicht, weil der Browser Module nur über einen Server lädt.)

## Aufbau der Seite

| Nr. | Abschnitt | Was die Szene zeigt |
|---|---|---|
| 1 | Einstieg „Ein Duft aus Licht.“ | Flakon rechts im Lichtkegel, leicht gedreht (Vorderseite zum Text), ein Band aus flüssigem Gold windet sich um ihn, Goldtropfen und Goldstaub, roter Rauch links. Beim Laden wächst das Band. |
| 2 | „Der Akkord“ | wie oben, der Flakon dreht sich beim Scrollen im Raum, Lichtkanten und Spiegelungen wandern mit |
| 3 | „Die Noten“ | wie oben, das Band fließt beim Weiterscrollen ab |
| 4 | „Die Kollektion“ (zwei Bildschirme) | Flakon steigt auf, kippt und fällt groß und gedimmt hinter den Produktkarten nach unten |
| 5 | „Die Maison“ | Flakon taucht ins Goldbecken, Krone aus flüssigem Gold, Spiegelung, Spritzer oben rechts |
| 6 | „Bestellen“ | Flakon versinkt bis zum Verschluss, Ringwellen |
| 7 | Fußzeile | Kamera schwenkt nach oben: Rauch und Goldspritzer über der Fußzeile |

Oben schwebt die Navigation als Pille mit Warenkorb-Knopf. Am Handy klappt dort ein Menü auf. Unten links sitzt ein kleiner Schalter, der die Bewegung der Szene anhält (Barrierefreiheit: Bewegung, die länger als 5 Sekunden läuft, muss sich anhalten lassen).

## Für einen neuen Kunden anpassen

1. **Name und Logo:** In `index.html`, `impressum.html` und `datenschutz.html` überall „Bergmann AI“ ersetzen und den `<title>` anpassen. Logo als Bild mit Transparenz: `assets/img/logo-b.webp` (Zeichen in der Navigation, 96 px hoch) und `assets/img/logo.webp` (ganzes Logo in der Fußzeile, 270 px hoch). Auf den Flakons stehen Zeichen und Schrift als 3D-Goldrelief: Schriftzug und Zeile in `_werkzeuge/blender/flakon.py`, Funktion `build()` (`'BERGMANN AI'`, `'EAU DE PARFUM'`), das Berg-Zeichen in der Funktion `mark()`. Danach die Flakons neu rendern (Punkt 5).
2. **Farben und Schriften:** nur im `:root`-Block oben in `assets/css/style.css`. Die Farben der 3D-Szene stehen in den Dateien unter `assets/3d`, die Farben der Füllungen in `LIQUIDS` in `_werkzeuge/blender/flakon.py`.
3. **Texte:** direkt in `index.html`. Alle Sätze sind Beispieltexte für ein Parfumhaus.
4. **Beispielwerte, die der Kunde liefern muss:** Preise (420 bis 480 €), Füllmenge 50 ml, Grundpreise, Duftnoten, Namen der sechs Düfte, „Gravur inklusive“, „Versand in der Schatulle“, Atelier-Adresse („Musterstraße, Musterstadt“) und „Besuch nach Vereinbarung“. Nichts davon ist echt.
   Bei Parfum gehört zu jedem Preis der Grundpreis je 100 ml (Preisangabenverordnung). Er steht schon unter jedem Preis und muss mit dem echten Preis neu gerechnet werden.
5. **Flakon-Bilder:** fotorealistische Renders aus Blender (Cycles), freigestellt: die sechs Kartenflakons `assets/img/flakon-<name>-1200/800/480.webp` und die Drehfolge des Flakons in der Szene `assets/img/flakon-dreh-00 … 12-1200/700.webp` (13 Winkel von -30° bis +30°, 1200 bzw. 700 Pixel hoch; die großen Bilder lädt nur ein Bildschirm mit hoher Auflösung). Neu rendern: `python _werkzeuge/blender/render.py` (alle) oder `… render.py or hero` (einzelne), mit einem Python, in dem Blender als Modul installiert ist (`pip install bpy numpy pillow`). Dauert auf 4 Kernen etwa 3 Minuten je Bild, die Drehfolge also rund 45 Minuten. Danach `node vorlagen/parfum/_werkzeuge/standbild.cjs` im Repo-Ordner (Standbild ohne WebGL, braucht Playwright mit Chromium). Echte Produktfotos des Kunden am besten freigestellt in denselben Größen ablegen.
6. **Warenkorb:** Die Knöpfe „In den Warenkorb“ zählen nur mit und zeigen einen Hinweis. Für einen echten Shop braucht es ein Shopsystem (z. B. Shopify, WooCommerce) und zusätzlich AGB, Widerrufsbelehrung und eine Bestellübersicht.
7. **Kontakt:** „Flakon reservieren“ und „Beratung vereinbaren“ öffnen eine E-Mail an `anfrage@example.com`. Echte Adresse oder Formular-Seite eintragen.
8. **Impressum und Datenschutz:** `impressum.html` und `datenschutz.html` mit den echten Angaben füllen.
9. **Suchmaschinen:** `<meta name="robots" content="noindex, nofollow">` entfernen, sobald die Seite live gehen soll.
10. **Choreografie der Szene:** in `assets/3d/szene.js`, Funktion `pose()`. Ein Wert S steuert alles (0 Einstieg, 1 Akkord, 2 Noten, 3 Kollektion oben, 4 Kollektion Mitte, 5 Maison, 6 Bestellen, 7 Fußzeile, 8 Seitenende). Die Bildschirmstellen des Flakons stehen in `L.path`, seine Drehung in Grad in `L.yaw` (je Querformat und Hochformat getrennt; mehr als ±30° gibt die Drehfolge nicht her).

## Woher Bilder und Schriften kommen

- **Flakons:** eigenes 3D-Modell in Blender (`_werkzeuge/blender/flakon.py`) nach dem Entwurfsbild des Inhabers (26.11.2026): dickes Kristallglas mit facettierten Kanten, die Füllung als leuchtendes Volumen direkt am Glas, ein Verschluss wie ein geschliffener Edelstein mit Goldkern, ein geriffelter Goldhals, vorn Berg-Zeichen, Name und „EAU DE PARFUM“ als Goldrelief. Gerendert mit Lichtberechnung (Cycles), freigestellt (`render.py`). Keine Fotos, keine KI-Bilder.
- **Goldband, Becken, Rauch, Licht:** eigene 3D-Szene aus Code (three.js), live im Browser gerechnet. Der Flakon steht darin als gerendertes Bild, das sich zur Kamera dreht (`assets/3d/bildflakon.js`).
- **Standbild:** aus der Szene (`_werkzeuge/standbild.cjs`).
- **Logo:** vom Inhaber geliefert (Variante 5 aus seinem Logo-Bild, 26.11.2026), freigestellt. Die freigestellten Originale liegen in `_werkzeuge/blender/logo-etikett.png` (ganzes Logo) und `logo-zeichen.png` (Zeichen).
- **Schriften:** Cormorant Garamond und Jost, beide SIL Open Font License (Lizenztexte in `assets/fonts`). Auf dem Flakon-Etikett: Cinzel und Jost (SIL Open Font License, Dateien und Lizenztexte in `_werkzeuge/blender`).
- **three.js:** MIT-Lizenz (`assets/3d/three-LICENSE.txt`).

## Technik in Kürze

- `assets/js/main.js` misst die Abschnitte einmal (und bei Größenänderung neu) und rechnet daraus beim Scrollen den Wert S. Kein Messen während des Scrollens.
- `assets/3d/szene.js` zeichnet die Szene auf eine feste Leinwand hinter dem Inhalt. Die Bauteile: `bildflakon.js` (der gerenderte Flakon als Bildfolge: zwischen zwei Winkeln wird übergeblendet, die Bilder laden nach dem ersten im Hintergrund; die Fläche dreht sich zur Kamera, wird an der Beckenoberfläche abgeschnitten, Farben passend zur Filmkurve zurückgerechnet), `gold.js` (Goldband, Tropfen, Goldstaub, Krone), `becken.js` (Goldbecken mit Schlieren, Glitzer, Ringwellen und Spiegelung), `grund.js` (Rauch, Lichtkegel, Glimmen), `umgebung.js` (Licht und Spiegelungen), `bloom.js` (Leuchten, Filmkurve, Körnung).
- Die Szene läuft mit höchstens 1,6-facher Auflösung (Handy 1,4), der Hintergrund in geringer Auflösung. Kommen Bilder zu spät, senkt ein Regler die Auflösung stufenweise. Ist der Tab verborgen, pausiert sie.
- Ohne WebGL2 (oder mit `?no3d`) steht ein Standbild hinter der Seite (`assets/img/standbild-*.webp`). Die Seite bleibt vollständig nutzbar.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht die Szene ohne Eigenbewegung; sie ändert sich nur beim Scrollen.
- Mit der Maus dreht sich der Flakon ein paar Grad mit (nur am Computer, nicht mit Touch und nicht bei „Bewegung reduzieren“).
- Prüfen: `?fps` zeigt Bilder pro Sekunde und S, `?gov=0` schaltet den Regler aus, in der Konsole setzt `window.__szene.set(4.6)` die Szene auf eine Stelle, `window.__szene.free()` gibt sie wieder frei.
