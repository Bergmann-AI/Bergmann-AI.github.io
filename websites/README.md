# Unterseite „Websites für lokale Betriebe“

Verkaufsseite für Websites unter `/websites/`. Reines HTML, CSS und JavaScript, kein Build-Schritt.

**Live:** https://bergmann-ai.github.io/websites/ und https://bergmann-ai.pages.dev/websites/

**Ansehen:** im Repo-Ordner `python3 -m http.server` starten und `http://localhost:8000/websites/` öffnen.
(Die Vorlage im Handy lädt nur über einen Server, nicht per Doppelklick auf die Datei.)

## Aufbau

| Abschnitt | Grund | Handy (Desktop) |
|---|---|---|
| Einstieg | Creme | rechts; die Vorlage lädt, das Rollo fährt hoch |
| Vorlage (die Szene) | Creme, am Ende Übergang ins Elfenbein | angeheftet rechts; die Vorlage scrollt mit, beim Schritt „Chatbot“ erscheint der Chatbot |
| Im Preis enthalten (2 Bildschirme) | Elfenbein | angeheftet rechts |
| Ablauf | Elfenbein | rechts |
| Preise | Creme | in der Mitte; zeigt man auf das Paket, erscheint der Chatbot |
| Häufige Fragen | Elfenbein | kein Handy |
| Abschluss | Creme | rechts neben dem Text, die Vorlage zeigt ihren Schluss |

Farben: Jeder Abschnitt trägt `data-ground="cream"` (Creme #ead9bd) oder `data-ground="ivory"` (Elfenbein #f3eee2).
Die Werte und ihre Kontraste stehen oben in `assets/css/style.css`.

Unter 900px Breite (Handy, Tablet hochkant) gibt es nur ein kleines Handy, das im Einstieg unter dem Text steht und
die echte Vorlage zeigt. Beim Scrollen läuft es mit nach oben und bleibt in der Szene oben unter der Kopfzeile stehen,
während die Vorlage darin mitscrollt. Die Texte der Szene laufen darunter durch und blenden aus, bevor sie das Handy
erreichen. Danach kommt am Ende der Szene eine Fläche ohne Text: Dort wird das Handy beim Scrollen fast bildschirmhoch,
und die Vorlage läuft darin bis zu ihrem Schluss. Erst dann scrollt es hinaus, und „Im Preis enthalten“ folgt. Mit
„Bewegung reduzieren“ bleibt es dabei klein. Auf niedrigen Bildschirmen (Handy quer, unter 560px Höhe) heftet es nicht
an, sondern scrollt mit dem Einstieg weg.

## So funktioniert das Handy

- `assets/js/handy.js` steuert ein einziges Handy (`.device`), das fest im Fenster zwischen dem Grund der Abschnitte
  und ihrem Text liegt. Es dreht sich nicht (Wunsch des Inhabers, 22.11.2026).
- Jede Stelle, an die es gleitet, ist im HTML ein Handy mit `data-pose` (`hero`, `wandel`, `turn`, `front`, `price`,
  `close`). Diese HTML-Handys halten den Platz frei, tragen die Beschreibung für Screenreader und sind ohne JavaScript
  das Bild (Standbild `assets/handy/vorlage-start-*.webp`).
- In derselben Spalte gleitet das Handy weich von Stelle zu Stelle. Wechselt die Spalte (Ablauf, Preise, Abschluss),
  blendet es aus und an der nächsten Stelle wieder ein, damit es nie über Text fährt.
- Im Bildschirm läuft die echte Vorlage `../vorlagen/luxus-scroll/` in einem Rahmen von 390 x 869 CSS-Pixeln. Sie lädt
  erst, wenn die Seite fertig ist; bis dahin steht ihr erstes Bild (`assets/handy/vorlage-zu-*.webp`) im Handy.
  Ankerpunkte in `handy.js` (`mapTemplate`) legen fest, welcher Abschnitt der Vorlage zu welchem Abschnitt der Seite
  gehört. Den Abschnitt „Stimmen unserer Gäste“ blendet das Handy aus, weil dort nur Platzhalter stehen.
- `assets/js/main.js` setzt die Farbe der Kopfzeile (immer die Farbe des Grundes darunter), lässt die Überschrift der
  Szene Wort für Wort erscheinen und schaltet den Chatbot im Handy.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht keinen Aufbau beim Laden, die Überschrift der
  Szene steht gleich ganz da, und das Handy springt ohne Gleiten an seine Stellen.

## Vorlage geändert?

Nach Änderungen an `vorlagen/luxus-scroll` die zwei Standbilder neu erzeugen, damit sie zum ersten Bild der echten
Vorlage passen: im Repo-Ordner `node websites/_werkzeuge/vorlage-bilder.cjs` (braucht Playwright mit Chromium und
Python mit Pillow). Ändern sich dort die Abschnitte `an-bord`, `welt` oder `anfrage`, die Ankerpunkte in `handy.js`
prüfen.

## Logo in Leder

Kopf- und Fußzeile zeigen das Leder-Logo des Inhabers (`assets/logo-leder.webp`). Es ist aus seinem Bild
`_werkzeuge/quellen/logo-leder-inhaber.png` freigestellt, das unverändert im Repo liegt. Neu erzeugen, zum Beispiel nach
einem neuen Bild: dieses ersetzen und im Repo-Ordner `python3 websites/_werkzeuge/logo-freistellen.py` starten (braucht
numpy und Pillow). Das Freistellen ist für die hellen Hintergründe dieser Seite gemacht. Startseite und Browser-Symbol
nutzen weiter das blaue Logo.

## Entscheidungen des Inhabers

- 20.11.2026: Ein fester Preis ohne „ab“, egal wie viele Unterseiten die Website hat.
- 20.11.2026: Die Startseite verlinkt nicht auf `/websites/`. Nicht ohne Rückfrage ändern.
- 22.11.2026: Braun statt Schwarz in allen dunklen Abschnitten (oben am dunkelsten), die Vorlage Luxus-Scroll im Handy
  statt der alten Website, das Handy dreht sich nicht, Animationen „edel wie die Vorlage“.
- 23.11.2026: Am Handy gibt es kein großes Handy mehr in der Szene. Das kleine aus dem Einstieg zeigt die Vorlage live,
  scrollt mit und bleibt oben stehen. Es ist etwas größer als das frühere Standbild, lässt aber gut die Hälfte des
  Bildschirms zum Lesen frei.
- 23.11.2026: Das Braun ist heller und luxuriöser (Schokolade mit Cognac-Ton). Am Handy scrollt die Vorlage im Handy
  erst, wenn das ganze Handy zu sehen ist; am Laptop wie bisher.
- 24.11.2026: Creme statt Braun. Der Inhaber hat seine Farbe #f7e6ca geschickt und aus zwei Vorschauen die eine Spur
  dunklere gewählt (#ead9bd). Die Seite ist damit durchgehend hell; Creme und Elfenbein wechseln sich ab.
- 25.11.2026: Das Logo steht auf dieser Seite in braunem Leder; es ist das Leder-Logo des Inhabers.
- 25.11.2026: Am Handy wird das Handy am Ende der Szene groß und zeigt die ganze Vorlage, bevor „Im Preis enthalten“
  kommt.

Die Dateien des früheren 3D-Handys (three.js) hat der Inhaber am 22.11.2026 löschen lassen; sie stehen noch in der
Versionsgeschichte von GitHub.
