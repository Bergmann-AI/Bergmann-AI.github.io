---
name: ui-feinschliff
description: Feinschliff für Web-Oberflächen im Stil des Design Engineering (nach den Prinzipien von Emil Kowalski, animations.dev, Sonner, Vaul). Schnelle, ruhige Animationen, Menüs, Dialoge, Toasts, Formulare, Fokus, Klickflächen, Browser-Oberflächen und kleine Details, die eine Seite teuer wirken lassen. Verwenden beim Bauen oder Polieren von Landingpages, Cockpits, Komponenten und Bildschirmen für Videos, bei "fühlt sich billig an", "ruckelt", Hover, Übergängen oder Formularen. Use when building or polishing web UI to add tasteful, fast animations and small interaction details.
---

# UI-Feinschliff (Design Engineering)

Ziel: Oberflächen, die sich schnell, ruhig und hochwertig anfühlen, weil die kleinen Details zusammenkommen.

**Regie:** Auf Firmenseiten (Persuade) gilt website-regie Regel 7: Inhalte stehen beim Scrollen fest (kein Einblenden, kein Parallax), dem taste-Bewegungslayer (`assets/motion`) gehören Hover und Druck. Dieser Skill ergänzt Menüs, Dialoge, Toasts, Formulare, Fokus und Zustände.

## Vor jeder Bewegung vier Fragen

1. **Braucht es sie?** Wie oft sieht man sie? Was dutzendfach am Tag passiert (Hover über Listenzeilen, Tab-Wechsel, Tastaturaktionen), bekommt wenig oder keine Animation. Seltene Momente (erster Besuch, Erfolg, Dialog) dürfen mehr.
2. **Was sagt sie?** Gültige Gründe: woher etwas kommt (räumlicher Zusammenhang), ein Zustandswechsel, Rückmeldung auf eine Handlung, ein sonst harter Sprung wird weich. "Sieht cool aus" allein ist kein Grund.
3. **Welche Kurve?** Was erscheint oder verschwindet: ease-out. Nie ease-in für Oberflächen (wirkt am Anfang träge). Eigene Kurve statt Browser-Standard, z. B. `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
4. **Wie schnell?** Unter 300 ms. Druck-Rückmeldung 100 bis 160 ms, Dropdowns und Popover 150 bis 250 ms, Dialoge und Schubladen bis etwa 300 ms.

Dauer und Kurven als Tokens (`--dur-press: 120ms; --dur-menu: 200ms; --dur-dialog: 280ms; --ease-out: …`), nicht als Einzelwerte im Code.

## Bausteine

- **Buttons:** `transform: scale(0.97)` bei `:active` mit etwa 120 ms, damit sich ein Druck körperlich anfühlt.
- Nie aus `scale(0)` animieren. Erscheinen aus etwa `scale(0.95)` plus `opacity: 0`.
- **Popover und Dropdowns** wachsen aus ihrem Auslöser (`transform-origin` am Auslöser). Dialoge bleiben mittig.
- Was schnell oder unterbrochen ausgelöst wird (Schalter, Toasts, Hover-Karten): CSS-Transitions statt Keyframes, dann laufen sie sauber rückwärts.
- Eine leichte Unschärfe (unter 20px) kann einen holprigen Überblend zwischen zwei Zuständen kaschieren.
- **Auftritt per CSS:** `@starting-style` für den Anfangszustand und `transition-behavior: allow-discrete` für `display` und `overlay` (seit 2024 in allen großen Browsern). So blenden `<dialog>` und `[popover]` ohne JavaScript ein und aus. Ohne Unterstützung erscheinen sie einfach ohne Animation.
- **Native Elemente zuerst:** `<dialog>` (mit `::backdrop`, Fokusfalle und Escape eingebaut), `popover`-Attribut für Menüs und Tooltips, `<details>` für Aufklapper. Weniger JavaScript, bessere Barrierefreiheit.
- Höhe animieren (Aufklapper): `interpolate-size: allow-keywords` erlaubt `height: auto` als Ziel, bisher nur in Chromium; sonst `grid-template-rows: 0fr → 1fr`.
- **Listen, die der Nutzer öffnet:** Kinder um 30 bis 50 ms staffeln, insgesamt höchstens etwa 300 ms. Nie beim Scrollen (Regie Regel 7).
- **Toasts** gleiten von ihrem Rand herein und lassen sich wegwischen.
- **Seitenwechsel** (mehrseitige Seiten): `@view-transition { navigation: auto; }` mit kurzer Überblende (Chrome, Edge, Safari; Firefox teilweise). Ein gemeinsames Element (Logo, Produktbild) mit `view-transition-name` verbindet die Seiten. Unter reduzierter Bewegung abschalten.
- **Federn in CSS:** `linear()`-Kurven erlauben federnde Bewegungen ohne Bibliothek (seit Ende 2023 überall).

## Federn und Gesten

- Federn für Ziehen, Wischen, Schwung und alles Unterbrechbare. Wenig Nachschwingen (0,1 bis 0,3).
- Wegwischen nach Geschwindigkeit, nicht nur nach Strecke. Widerstand an Grenzen. Pointer Capture nutzen, weitere Finger ignorieren.
- `touch-action` passend setzen (`pan-y` bei waagerecht wischbaren Elementen), damit die Seite weiter scrollt.

## Formulare (die meisten Anfragen entstehen hier)

- Schrift in Eingabefeldern mindestens 16px, sonst zoomt das iPhone beim Antippen.
- Richtige Tastatur und Autofill: `type="email"`, `type="tel"`, `inputmode="numeric"`, `autocomplete="name|email|tel|postal-code"`, `enterkeyhint="send"`.
- Beschriftung sichtbar über dem Feld (kein Platzhalter als Ersatz). Fehler direkt am Feld, in Worten mit Symbol, nach dem Verlassen des Felds, nicht bei jedem Tastendruck. Fehlermeldung mit `aria-describedby` am Feld.
- Absenden: Button zeigt den Zustand (sendet …, gesendet mit Haken-Symbol aus der Icon-Bibliothek, nicht Emoji oder Unicode-Zeichen), doppeltes Senden verhindern, Erfolg mit einem Satz und dem nächsten Schritt.
- `accent-color` für Checkbox, Radio und Fortschritt in der Markenfarbe (website-farben).

## Fokus, Klickflächen, Tastatur

- Fokusring immer sichtbar und schön: `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`, mindestens 3:1 zum Grund. Nie entfernen.
- Feste Kopfleisten dürfen den fokussierten Inhalt nicht verdecken (WCAG 2.2, 2.4.11): `html { scroll-padding-top: <Höhe der Leiste + 8px>; }`.
- Klickflächen mindestens 24 × 24 px (WCAG 2.2, 2.5.8), besser 44 × 44 px am Handy; kleine Symbole bekommen eine größere unsichtbare Fläche.
- Alles per Tastatur erreichbar, Reihenfolge wie die Leserichtung, Escape schließt Menüs und Dialoge.

## Browser-Oberflächen mitgestalten

Die Teile, die man nicht selbst zeichnet, tragen das Design mit (impeccable craft-floor):

- `::selection` in der Akzentfarbe (leicht), `caret-color`, `accent-color`.
- `scrollbar-gutter: stable` gegen springende Layouts beim Öffnen von Dialogen; `scrollbar-color` in den Farben der Seite, wo unterstützt.
- `text-wrap: balance` für Überschriften, `text-wrap: pretty` für Absätze (wo unterstützt), Zeilenlänge 60 bis 75 Zeichen.
- `font-variant-numeric: tabular-nums` für Zahlen, die sich ändern oder untereinander stehen (Preise, Zähler).
- `-webkit-tap-highlight-color: transparent` nur, wenn ein eigener `:active`-Zustand da ist.
- `<meta name="theme-color">` in der Grundfarbe der Seite, je Farbschema.

## Leistung und Barrierefreiheit

- Nur `transform` und `opacity` animieren. Nie Breite, Höhe, top, left oder box-shadow in Schleifen.
- Feste Animationen mit CSS oder der Web Animations API: Sie laufen außerhalb des Hauptthreads.
- `@media (prefers-reduced-motion: reduce)`: Bewegung weg, hilfreiche Überblendungen und Farbwechsel bleiben.
- Hover-Effekte in `@media (hover: hover) and (pointer: fine)`, damit Touch-Geräte keine hängenden Hover-Zustände bekommen.
- Bewegung über 5 s braucht einen Pause-Knopf (WCAG 2.2.2).

## Kleine Details, die teuer wirken

- Eine Radius-Skala, Haarlinien (1px) in einer Linienfarbe, weiche, mehrschichtige Schatten mit Versatz statt Leuchtrand (impeccable: kein farbiger Halo ohne Versatz).
- Laden: Skelette oder ein leichter Schimmer statt Drehkreisel für Inhaltsflächen; Bildflächen tragen vorab ihre Durchschnittsfarbe (website-bilder).
- Leere Zustände: ein freundlicher Satz und eine klare Aktion.
- Gleiche Abstände für Gleiches; mehr Luft über einer Überschrift als darunter.

## Für Bildschirme, die gefilmt werden (Werbevideos)

- Etwas langsamer als normale Oberflächen (250 bis 400 ms), weiter ease-out.
- Eine Hauptbewegung zur Zeit; nicht mehrere Dinge gleichzeitig.
- Bei 2x aufnehmen (`deviceScaleFactor: 2`), damit Schrift im Video scharf bleibt.

## Bericht

Änderungen als Tabelle:

| Vorher | Nachher | Warum |
|---|---|---|
| … | … | … |

Danach empfehlen: in Zeitlupe prüfen (Animations-Panel der Entwicklertools), an einem echten Handy, mit der Tastatur allein und am nächsten Tag noch einmal mit frischem Blick.
