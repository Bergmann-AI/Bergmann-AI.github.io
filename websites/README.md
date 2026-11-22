# Unterseite „Websites für lokale Betriebe“

Verkaufsseite für Websites unter `/websites/`. Reines HTML, CSS und JavaScript, kein Build-Schritt.

**Live:** https://bergmann-ai.github.io/websites/ und https://bergmann-ai.pages.dev/websites/

**Ansehen:** im Repo-Ordner `python3 -m http.server` starten und `http://localhost:8000/websites/` öffnen.
(Die Vorlage im Handy lädt nur über einen Server, nicht per Doppelklick auf die Datei.)

## Aufbau

| Abschnitt | Grund | Handy (Desktop) |
|---|---|---|
| Einstieg | Espresso-Braun, am dunkelsten | rechts; die Vorlage lädt, das Rollo fährt hoch |
| Vorlage (die Szene) | Braun, am Ende Übergang ins Helle | angeheftet rechts; die Vorlage scrollt mit, beim Schritt „Chatbot“ erscheint der Chatbot |
| Im Preis enthalten (2 Bildschirme) | hell | angeheftet rechts |
| Ablauf | hell | rechts |
| Preise | Braun | in der Mitte; zeigt man auf das Paket, erscheint der Chatbot |
| Häufige Fragen | hell | kein Handy |
| Abschluss | Braun | rechts neben dem Text, die Vorlage zeigt ihren Schluss |

Unter 900px Breite steht im Einstieg ein Standbild der Vorlage; das Handy mit der echten Vorlage erscheint in der Szene.

## So funktioniert das Handy

- `assets/js/handy.js` steuert ein einziges Handy (`.device`), das fest im Fenster zwischen dem Grund der Abschnitte
  und ihrem Text liegt. Es dreht sich nicht (Wunsch des Inhabers, 22.11.2026).
- Jede Stelle, an die es gleitet, ist im HTML ein Handy mit `data-pose` (`hero`, `wandel`, `turn`, `front`, `price`,
  `close`). Diese HTML-Handys halten den Platz frei, tragen die Beschreibung für Screenreader und sind ohne JavaScript
  das Bild (Standbild `assets/handy/vorlage-start.webp`).
- In derselben Spalte gleitet das Handy weich von Stelle zu Stelle. Wechselt die Spalte (Ablauf, Preise, Abschluss),
  blendet es aus und an der nächsten Stelle wieder ein, damit es nie über Text fährt.
- Im Bildschirm läuft die echte Vorlage `../vorlagen/luxus-scroll/` in einem Rahmen von 390 x 869 CSS-Pixeln. Sie lädt
  erst, wenn die Seite fertig ist; bis dahin steht ihr erstes Bild (`assets/handy/vorlage-zu.webp`) im Handy.
  Ankerpunkte in `handy.js` (`mapTemplate`) legen fest, welcher Abschnitt der Vorlage zu welchem Abschnitt der Seite
  gehört. Den Abschnitt „Stimmen unserer Gäste“ blendet das Handy aus, weil dort nur Platzhalter stehen.
- `assets/js/main.js` setzt die Farbe der Kopfzeile (immer die Farbe des Grundes darunter), lässt die Überschrift der
  Szene Wort für Wort aufhellen und schaltet den Chatbot im Handy.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht keinen Aufbau beim Laden und kein Aufhellen;
  das Handy springt ohne Gleiten an seine Stellen.

## Vorlage geändert?

Nach Änderungen an `vorlagen/luxus-scroll` die zwei Standbilder neu erzeugen, damit sie zum ersten Bild der echten
Vorlage passen: im Repo-Ordner `node websites/_werkzeuge/vorlage-bilder.cjs` (braucht Playwright mit Chromium und
Python mit Pillow). Ändern sich dort die Abschnitte `an-bord`, `welt` oder `anfrage`, die Ankerpunkte in `handy.js`
prüfen.

## Entscheidungen des Inhabers

- 20.11.2026: Ein fester Preis ohne „ab“, egal wie viele Unterseiten die Website hat.
- 20.11.2026: Die Startseite verlinkt nicht auf `/websites/`. Nicht ohne Rückfrage ändern.
- 22.11.2026: Braun statt Schwarz in allen dunklen Abschnitten (oben am dunkelsten), die Vorlage Luxus-Scroll im Handy
  statt der alten Website, das Handy dreht sich nicht, Animationen „edel wie die Vorlage“.

## Nicht mehr benutzt

Seit dem Umbau vom 22.11.2026 lädt die Seite das frühere 3D-Handy nicht mehr: `assets/3d/phone.js`, die Bilder
`assets/3d/screen-*.webp`, `dock-*.webp`, `chat-*.webp`, `assets/3d/screen.json` sowie `_werkzeuge/textur.html` und
`_werkzeuge/texturen.cjs`. Sie bleiben liegen, bis der Inhaber entscheidet, ob sie gelöscht werden.
