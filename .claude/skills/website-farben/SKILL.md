---
name: website-farben
description: Farbregeln für Websites, die gut zusammenpassen, mit Prüf- und Bauskript. Leitet die Palette aus echtem Kundenmaterial ab (Logo, Schild, Fotos), baut Rollen-Tokens in OKLCH für Hell und Dunkel, prüft Kontrast nach WCAG und APCA, Farbfehlsichtigkeit, Harmonie, Violett, grelle Töne und Fast-Dubletten. Laden, sobald auf einer Website Farben gewählt, geändert, geprüft oder vereinheitlicht werden, bei Markenfarben, Dunkelmodus, Kontrastproblemen oder wenn eine Seite "zu bunt", "langweilig" oder "billig" wirkt. Ergänzt website-regie, impeccable und taste-skill.
---

# Website-Farben

Gute Farben auf einer Firmenseite sind fast immer: viel ruhiges Neutral, eine echte Markenfarbe, Unterschiede über Helligkeit statt über viele Farbtöne. Diese Datei gibt die Regeln, `scripts/farben.py` rechnet sie nach. Die Belege stehen in `references/forschung.md`.

**Vorrang:** Corporate Design und Markenfarben des Kunden gehen vor. Die Regie (website-regie) sagt, wer die Richtung bestimmt: impeccable (DESIGN.md) wählt die Welt, taste-skill begrenzt, was zur Art des Betriebs passt. Dieser Skill liefert die Methode, die Token-Leiter und die Prüfung. Jede Abweichung von einer Regel hier steht mit Grund im Bericht.

## Die Regeln

1. **Rollen statt Farben.** Jede Farbe hat eine Aufgabe: `bg` (Grund), `surface` (Fläche), `line`, `ink` (Text), `muted` (Nebentext), `link`, `accent` (Button-Fläche), `accent-ink` (Schrift auf dem Button), `focus`, dazu `error`, `success`, `warning`, `info`. Im Code stehen nur diese Tokens, keine losen Hex-Werte.
2. **Die Marke kommt vom Kunden.** Aus Logo, Schild, Fassade, Fahrzeug, Arbeitskleidung, Visitenkarte oder CD-Handbuch, nie erfunden. Hat der Kunde gar nichts: aus seinen Fotos ableiten (Einrichtung, Material, Licht) und 2 bis 3 Vorschläge mit Vorschau zur Wahl stellen.
3. **90 bis 95 % neutral, ein Akzent.** Farbe kommt aus den Fotos, dem Produkt und der einen Markenfarbe. Der Akzent sitzt auf dem Hauptbutton, Links, Fokus und kleinen Markierungen, in Summe unter etwa 3 bis 10 % eines Bildschirms (Ausnahme: ein bewusstes Markenband). So behält er seine Signalwirkung.
4. **Harmonie über ähnliche Farbtöne, Spannung über Helligkeit.** Studien zeigen: Farbpaare wirken harmonisch, wenn ihre Farbtöne ähnlich sind, und gefallen besser mit klarem Helligkeitsunterschied. Für "Komplementär-Harmonie" fand die Forschung keinen Beleg. Darum:
   - Zweitfarbe nur **ton-in-ton** (gleicher Farbton, andere Helligkeit) oder **analog** (±20 bis 40°).
   - Komplementärfarben nur als kleines, bewusstes Signal, nie als gleich großer Partner.
   - Höchstens zwei Farbtonfamilien außerhalb der Signalfarben.
5. **Neutrale Töne leicht tönen.** Grau ist nie "tot": `bg`, `surface`, `line`, `ink` bekommen eine Spur (OKLCH-Chroma 0,005 bis 0,02) in Richtung Marke oder Licht der Fotos. Warm (um 60 bis 90°) bei Holz, Backstube, Salon, Hotel; kühl (um 230 bis 260°) bei Technik, Praxis, Kanzlei, wenn die Fotos kühl sind. `aus-bild` misst die Lichtrichtung der Fotos.
6. **Helligkeitsleiter.**
   - `bg` → `surface`: ΔL 0,02 bis 0,06 (sichtbar, aber ruhig; mehr wirkt wie ein Kasten).
   - `ink`: L 0,20 bis 0,25, leicht getönt, nie reines Schwarz.
   - `muted`: so hell wie möglich bei 4,5:1, meist um L 0,50.
   - Dunkel: `bg` L 0,16 bis 0,22 (getönt, nicht #000), höhere Ebenen heller, `ink` L 0,92 bis 0,95 statt reinem Weiß.
7. **Kontrast: WCAG ist Pflicht, APCA ist das Ziel.**

   | Element | WCAG 2.2 AA (hart) | APCA-Ziel |
   |---|---|---|
   | Fließtext | 4,5:1 | Lc 75, besser 90 |
   | Nebentext, Formularhinweise | 4,5:1 | Lc 60 |
   | Schrift ab 24px oder 19px fett | 3:1 | Lc 45 bis 60 |
   | Button-Fläche, Fokusring, Symbole, Eingabefeld-Rand | 3:1 | Lc 30 bis 45 |
   | Platzhalter, Deaktiviertes | – | Lc 30 |

   WCAG überschätzt helle Schrift auf Dunkel. Darum im Dunkeln immer auch APCA lesen. Halbtransparente Textfarben vermeiden: Ihr Kontrast hängt vom Untergrund ab.
8. **Button-Fläche und Textlink trennen.** `accent` darf die echte Markenfarbe bleiben, solange sie 3:1 zum Grund hat. `link` ist die Variante, die als Schrift trägt (im Hellen oft dunkler, im Dunkeln heller und etwas weniger bunt). Helle Marken (Gelb, Hellgrün) bleiben als Fläche echt mit dunkler Schrift; der Fokusring nimmt dann `link`. Das ist nach WCAG 1.4.11 erlaubt (die Beschriftung macht den Button erkennbar), taste verlangt 3:1, also im Bericht begründen.
9. **Buntheit begrenzen.** Akzente bis Chroma etwa 0,25; große Flächen bis etwa 0,06 (ein Markenband darf kräftiger sein). Neon (Chroma über 0,29 bei mittlerer Helligkeit) wirkt billig und flimmert. Keine zwei kräftigen Gegenfarben direkt aneinander (Rot an Grün oder Blau flimmert an der Kante).
10. **Kein Violett, kein Cyan-auf-Schwarz.** Violett und Lavendel (OKLCH-Farbton 270 bis 330°) nur, wenn es wirklich die Kundenmarke ist (taste). Cyan oder Neonblau auf Schwarz nur, wenn bewusst gewählt (impeccable: typische KI-Palette).
11. **Signalfarben** stehen auf einer Helligkeitsstufe mit gemäßigter Buntheit und tragen ihre Bedeutung nie allein: Fehler und Erfolg immer mit Symbol und Wort. Rot und Grün trennen etwa 8 % der Männer schlecht. Bei roten Marken: Links unterstreichen, Fehler mit Symbol.
12. **Dunkel nur mit Grund.** Dunkle Seiten und dunkle Heros nur bei Tech-Arten oder wenn Marke oder Kunde dunkel festlegen (website-regie Regel 6). Dunkel heißt: eigene Leiter, nicht die helle umgedreht.
13. **Verläufe** (nur wo taste sie erlaubt, also Tech) im OKLab/OKLCH-Raum interpolieren (`linear-gradient(in oklch, …)`), innerhalb einer Farbtonfamilie, sonst entstehen graue Zonen.
14. **Bildschirme mit großem Farbraum (P3)** nur als Zugabe für den Akzent: erst der sRGB-Wert, dann in `@media (color-gamut: p3)` die P3-Fassung. Die Tokens bleiben sRGB.
15. **Browser-Oberflächen mitfärben:** `::selection`, `caret-color`, `accent-color` (Checkbox, Radio, Fortschritt), `scrollbar-color`, `<meta name="theme-color">` gleich `bg` (je Modus mit `media`), `color-scheme`.

## Ablauf

1. **Material sammeln:** Logo (am besten SVG), Fotos vom Schild, vom Laden, von Produkten, das CD-Handbuch. Markenfarben, die der Kunde als Werte nennt, gelten wörtlich.
2. **Farben ziehen:** `python3 -I scripts/farben.py aus-bild logo.png --logo` und dasselbe ohne `--logo` für 2 bis 3 typische Fotos. Ergebnis: Vorschlag Marke und Lichtrichtung der Neutralen.
3. **Leiter bauen:** `python3 -I scripts/farben.py bauen --marke "#hex" --art <place|service|product|tech> --neutral <marke|warm|kalt|rein> --vorschau farben.html --css farben.css`. Optional `--akzent "#hex"` (eigene Buttonfarbe), `--zweit ton-in-ton|analog`, `--nur-hell`.
4. **Ansehen:** Die Vorschau zeigt Text, Link, Button, Signalfarben und die Simulation für Farbfehlsichtigkeit, hell und dunkel. Bei neuer Welt entscheidet der Nutzer (website-regie Schritt 4).
5. **Einbauen:**
   - *Seite auf dem taste-Kit:* die von `bauen` gedruckte Zeile `start.mjs brand …` ausführen und den `:root`-Block so lassen, ergänzende Tokens (`--link`, `--focus`, Signalfarben) im Seiten-CSS.
   - *Sonst:* den erzeugten `:root`-Block übernehmen und in DESIGN.md (impeccable) eintragen.
6. **Prüfen:**
   - `python3 -I scripts/farben.py pruefen --css <datei.css>` (oder `--design DESIGN.md`). Werden Rollen falsch erkannt: `--rollen "bg=night,ink=ivory,muted=warm-grey,accent=champagne"`. Seiten mit hellen und dunklen Abschnitten: je Abschnittsart einmal mit `--rollen` prüfen.
   - `python3 -I scripts/farben.py inventur <style.css> <index.html>`: findet lose Farbwerte und Fast-Dubletten (ΔE unter 0,02), die zu einem Token werden sollen.
   - `python3 -I scripts/farben.py anteil shots/1440.png --akzent "#hex"` auf den Screenshots aus der Prüfung (1440 und 390): Akzent über 10 % der Fläche ist ein Warnzeichen.
   - Einzelpaar: `python3 -I scripts/farben.py kontrast "#fg" "#bg"`.
7. **Bericht:** Herkunft der Markenfarbe, gewählte Leiter, Ergebnis von `pruefen` (jedes WARN begründet oder behoben), was der Kunde noch liefern muss (z. B. Logo als SVG).

## Wenn der Kunde keine Farben hat

- Nicht aus Branchen-Klischees wählen (impeccable: Farbton aus Bedeutung und Welt, nie aus der Kategorie). Erst die Fotos des Betriebs lesen: Fassade, Einrichtung, Arbeitskleidung, Produkte.
- Zwei bis drei Vorschläge bauen (`bauen` mit verschiedenen `--marke`), als Vorschau zeigen, der Kunde wählt.
- Forschung zu Markenwirkung ist schwach und kulturabhängig (Blau eher "kompetent", Rot eher "aufregend"). Sie bestätigt höchstens eine Wahl, sie trifft sie nicht.

## Häufige Fehler und die Lösung

| Fehler | Lösung |
|---|---|
| Fünf bunte Farben, jede Karte anders | eine Marke, Rest neutral; Unterschiede über Helligkeit und Fotos |
| Grauer Text auf farbiger Fläche | Nebentext aus dem Farbton der Fläche ableiten, nicht Grau |
| Akzent für Dekor verbraucht | Akzent nur für Handlung, Auswahl, Fokus |
| Reines Schwarz auf reinem Weiß | getöntes Fast-Schwarz (L 0,20 bis 0,25) auf leicht getöntem Weiß |
| Dunkelmodus = Farben umgedreht | eigene Leiter: Grund L 0,16 bis 0,22, Ebenen heller, Links heller und weniger bunt |
| Gelbe Marke als Textfarbe | `link` dunkler ableiten, Gelb nur als Fläche mit dunkler Schrift |
| Rot/Grün als einzige Statusinfo | Symbol und Wort dazu |
| Viele fast gleiche Grautöne im CSS | `inventur`, dann zu Tokens zusammenlegen |
