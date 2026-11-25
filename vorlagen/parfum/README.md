# Vorlage „Parfum“

Parfum-Website mit 3D-Szene, nachgebaut nach einem Referenzvideo (Parfum-Seite eines anderen Studios), ohne dessen Markennamen, Logo, Texte und Bilder, komplett auf Deutsch.
Reines HTML, CSS und JavaScript, dazu three.js lokal im Ordner. Kein Build-Schritt.

**Ansehen:** Ordner über einen lokalen Server öffnen, z. B. `python3 -m http.server` im Ordner `vorlagen/parfum` und dann `http://localhost:8000`.
(Per Doppelklick lädt die 3D-Szene nicht, weil der Browser Module nur über einen Server lädt.)

## Aufbau der Seite

| Nr. | Abschnitt | Was die Szene zeigt |
|---|---|---|
| 1 | Einstieg „Ein Duft aus Licht.“ | Flakon rechts im Lichtkegel, ein Band aus flüssigem Gold windet sich um ihn, Goldtropfen und Goldstaub, roter Rauch links. Beim Laden wächst das Band. |
| 2 | „Der Akkord“ | wie oben, der Flakon dreht sich langsam |
| 3 | „Die Noten“ | wie oben, das Band fließt beim Weiterscrollen ab |
| 4 | „Die Kollektion“ (zwei Bildschirme) | Flakon steigt auf, kippt und fällt groß und gedimmt hinter den Produktkarten nach unten |
| 5 | „Die Maison“ | Flakon taucht ins Goldbecken, Krone aus flüssigem Gold, Spiegelung, Spritzer oben rechts |
| 6 | „Bestellen“ | Flakon versinkt bis zum Verschluss, Ringwellen |
| 7 | Fußzeile | Kamera schwenkt nach oben: Rauch und Goldspritzer über der Fußzeile |

Oben schwebt die Navigation als Pille mit Warenkorb-Knopf. Am Handy klappt dort ein Menü auf.

## Für einen neuen Kunden anpassen

1. **Markenname:** In `index.html`, `impressum.html` und `datenschutz.html` überall `MARKE` ersetzen, dazu `BRAND` oben in `assets/3d/flakon.js` (Schrift auf dem Flakon). Das Monogramm „M“: `python3 _werkzeuge/monogramm.py <Buchstabe>` (braucht fontTools und brotli) gibt den neuen Pfad aus; ihn in `index.html` (`<symbol id="mono">`), in den zwei Rechtsseiten und als `MONO` in `assets/3d/flakon.js` eintragen. Den `<title>` anpassen.
2. **Farben und Schriften:** nur im `:root`-Block oben in `assets/css/style.css`. Die Farben der 3D-Szene stehen in den Dateien unter `assets/3d` (Füllung der Flakons: `LIQUIDS` in `flakon.js`).
3. **Texte:** direkt in `index.html`. Alle Sätze sind Beispieltexte für ein Parfumhaus.
4. **Beispielwerte, die der Kunde liefern muss:** Preise (420 bis 480 €), Füllmenge 50 ml, Grundpreise, Duftnoten, Namen der sechs Düfte, „Gravur inklusive“, „Versand in der Schatulle“, Atelier-Adresse („Musterstraße, Musterstadt“) und „Besuch nach Vereinbarung“. Nichts davon ist echt.
   Bei Parfum gehört zu jedem Preis der Grundpreis je 100 ml (Preisangabenverordnung). Er steht schon unter jedem Preis und muss mit dem echten Preis neu gerechnet werden.
5. **Produktbilder** in `assets/img/flakon-<name>-1200/800/480.webp`: eigene 3D-Renders mit Transparenz. Neu rendern (nach Änderungen an Flakon oder Farben): `node vorlagen/parfum/_werkzeuge/render.cjs` im Repo-Ordner (braucht Playwright mit Chromium); nur einzelne: `… render.cjs or noir`. Echte Produktfotos des Kunden am besten freigestellt (PNG/WebP mit Transparenz) in denselben Größen ablegen.
6. **Warenkorb:** Die Knöpfe „In den Warenkorb“ zählen nur mit und zeigen einen Hinweis. Für einen echten Shop braucht es ein Shopsystem (z. B. Shopify, WooCommerce) und zusätzlich AGB, Widerrufsbelehrung und eine Bestellübersicht.
7. **Kontakt:** „Flakon reservieren“ und „Beratung vereinbaren“ öffnen eine E-Mail an `anfrage@example.com`. Echte Adresse oder Formular-Seite eintragen.
8. **Impressum und Datenschutz:** `impressum.html` und `datenschutz.html` mit den echten Angaben füllen.
9. **Suchmaschinen:** `<meta name="robots" content="noindex, nofollow">` entfernen, sobald die Seite live gehen soll.
10. **Choreografie der Szene:** in `assets/3d/szene.js`, Funktion `pose()`. Ein Wert S steuert alles (0 Einstieg, 1 Akkord, 2 Noten, 3 Kollektion oben, 4 Kollektion Mitte, 5 Maison, 6 Bestellen, 7 Fußzeile, 8 Seitenende). Die Bildschirmstellen des Flakons stehen in `L.path` (Querformat und Hochformat getrennt).

## Woher Bilder und Schriften kommen

- **Flakon, Goldband, Becken, Rauch, Licht:** alles eigene 3D-Szene aus Code (three.js), live im Browser gerechnet. Keine Fotos, keine KI-Bilder.
- **Produktbilder und Standbild:** mit derselben Szene gerendert (`_werkzeuge/render.cjs`, `_werkzeuge/studio.html`).
- **Monogramm:** Buchstabe „M“ aus Cormorant Garamond.
- **Schriften:** Cormorant Garamond und Jost, beide SIL Open Font License (Lizenztexte in `assets/fonts`).
- **three.js:** MIT-Lizenz (`assets/3d/three-LICENSE.txt`).

## Technik in Kürze

- `assets/js/main.js` misst die Abschnitte einmal (und bei Größenänderung neu) und rechnet daraus beim Scrollen den Wert S. Kein Messen während des Scrollens.
- `assets/3d/szene.js` zeichnet die Szene auf eine feste Leinwand hinter dem Inhalt. Die Bauteile: `flakon.js` (Kristallglas mit Lichtbrechung, Füllung, Monogramm, Verschluss), `gold.js` (Goldband, Tropfen, Goldstaub, Krone), `becken.js` (Goldbecken mit Schlieren, Glitzer, Ringwellen und Spiegelung), `grund.js` (Rauch, Lichtkegel, Glimmen), `umgebung.js` (Licht und Spiegelungen), `bloom.js` (Leuchten, Filmkurve, Körnung).
- Die Szene läuft mit höchstens 1,6-facher Auflösung (Handy 1,4), der Hintergrund in geringer Auflösung. Kommen Bilder zu spät, senkt ein Regler die Auflösung stufenweise. Ist der Tab verborgen, pausiert sie.
- Ohne WebGL2 (oder mit `?no3d`) steht ein Standbild hinter der Seite (`assets/img/standbild-*.webp`). Die Seite bleibt vollständig nutzbar.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht die Szene ohne Eigenbewegung; sie ändert sich nur beim Scrollen.
- Prüfen: `?fps` zeigt Bilder pro Sekunde und S, `?gov=0` schaltet den Regler aus, in der Konsole setzt `window.__szene.set(4.6)` die Szene auf eine Stelle, `window.__szene.free()` gibt sie wieder frei.
