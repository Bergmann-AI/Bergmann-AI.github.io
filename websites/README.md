# Unterseite „Websites für lokale Betriebe“

Verkaufsseite für Websites unter `/websites/`. Reines HTML, CSS und JavaScript, kein Build-Schritt.
Das 3D-Handy nutzt three.js aus `../assets/3d/` (dieselbe Datei wie die Startseite).

**Ansehen:** im Repo-Ordner `python3 -m http.server` starten und `http://localhost:8000/websites/` öffnen.

## Aufbau

| Abschnitt | Grund | Handy (Desktop) |
|---|---|---|
| Einstieg | dunkel | rechts, schräg, fertige Website am Abend |
| Vorher und nachher | dunkel, am Ende Übergang ins Helle | dreht sich einmal, dann zerfällt die alte Seite in Streifen und die neue setzt sich zusammen |
| Im Preis enthalten (2 Bildschirme) | hell | rechts, eine ganze Drehung |
| Ablauf | hell | rechts, fast frontal |
| Preise | dunkel | in der Mitte; beim Paket öffnet sich der Chat |
| Häufige Fragen | hell | tritt nach rechts aus dem Bild |
| Abschluss | dunkel | rechts neben dem Text |

Am Handy und Tablet erscheint das 3D-Handy im Einstieg und in „Vorher und nachher“.

## So funktioniert das 3D-Handy

- `assets/3d/phone.js` baut das Handy aus three.js-Formen und legt es auf eine feste Leinwand
  zwischen den Grund der Abschnitte und ihren Text.
- Jede Stelle, an die es fliegt, ist im HTML ein Handy mit `data-pose` (`hero`, `wandel`, `turn`,
  `front`, `price`, `close`). Ohne WebGL sind genau diese HTML-Handys zu sehen, die Seite bleibt komplett.
- Der Bildschirm besteht aus Bildern der Beispiel-Website (`assets/3d/screen-*.webp`, `dock-*`, `chat-*`,
  Lage in `screen.json`), je in Desktop- (`-d`) und Handy-Größe (`-m`).
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht keine Drehungen; der Bildschirm wechselt weich.

## Beispiel-Website im Handy ändern

1. Inhalt in `index.html` im `<template id="site">` ändern, Aussehen in `assets/css/style.css` (Klassen `.old` und `.new`).
2. Bilder für das 3D-Handy neu erzeugen: im Repo-Ordner `node websites/_werkzeuge/texturen.cjs`
   (braucht Playwright mit Chromium und Python mit Pillow).

## Noch offen

- Auf der Startseite gibt es noch keinen Link zu `/websites/` (nur auf Wunsch des Inhabers setzen).
