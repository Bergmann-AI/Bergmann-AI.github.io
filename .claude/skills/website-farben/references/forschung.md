# Belege für die Farbregeln

Stand der Recherche: November 2026. Jede Regel in SKILL.md stützt sich auf einen dieser Punkte. Wo ein Beleg schwach ist, steht es dabei.

## Harmonie und Gefallen

- **Schloss & Palmer (2011), "Aesthetic response to color combinations: preference, harmony, and similarity"**, Attention, Perception & Psychophysics. Getrennte Urteile für Gefallen, Harmonie und Ähnlichkeit von Farbpaaren.
  - Harmonie folgt der Ähnlichkeit, vor allem im Farbton. Kein Beleg für "Harmonie durch Kontrast im Farbton" (widerspricht Chevreul 1839, also der Komplementär-Lehre).
  - Gefallen an einem Paar steigt mit Farbton-Ähnlichkeit und mit Helligkeitskontrast; die Einzelfarben erklären nur einen kleinen Teil (laut Vortragsfolien der Autoren etwa 20 %), die Beziehung der Farben (Harmonie) zusätzlich etwa 48 %.
  - Folge: Regel 4 (ton-in-ton oder analog, Spannung über Helligkeit).
  - Quelle: https://palmerlab.berkeley.edu/pdf/Schloss&Palmer(2011).pdf, PubMed Central PMC3037488.
- **O'Donovan, Agarwala & Hertzmann (2011), "Color Compatibility From Large Datasets"**, SIGGRAPH. Modelle aus Hunderttausenden bewerteter 5-Farben-Paletten (Adobe Kuler, COLOURlovers, Mechanical Turk).
  - Klassische Farbkreis-Schablonen (komplementär, triadisch usw.) sagen die Bewertung nur schwach vorher; Nutzer bauen sie selten, wenn das Werkzeug sie nicht vorgibt. Beliebte Paletten zeigen eine Vorliebe für warme Töne und Cyan.
  - Folge: Keine Schablonen-Mathematik als Qualitätsbeweis; die Prüfung misst Kontrast, Farbtonfamilien und Helligkeitsstufen.
  - Quelle: https://www.dgp.toronto.edu/~donovan/color/

## Erster Eindruck einer Website

- **Tuch et al. (2012), "The role of visual complexity and prototypicality regarding first impression of websites"**, Int. J. Human-Computer Studies (Google/Universität Basel). Urteile über Schönheit fallen in 17 bis 50 ms. Am besten schneiden Seiten mit **niedriger visueller Komplexität** und **hoher Prototypikalität** (sieht aus wie eine Seite dieser Art) ab.
  - Quelle: https://research.google/pubs/pub38315/
- **Reinecke et al. (2013), "Predicting users' first impressions of website aesthetics…"**, CHI. 548 Personen, 450 Websites. Komplexität und Buntheit erklären zusammen etwa die Hälfte der Streuung im Gefallen; Komplexität wiegt deutlich schwerer als Buntheit; Alter, Geschlecht und Bildung verschieben die Vorlieben.
  - Quelle: https://kgajos.seas.harvard.edu/papers/reinecke13aesthetics.pdf
  - Folge: Regel 3 (wenig Farben, ruhige Flächen) und "eine Marke, Rest neutral".

## Kontrast

- **WCAG 2.2** (W3C, gesetzlich relevant über BFSG und EN 301 549): Text 4,5:1, große Schrift (ab 24px oder 18,66px fett) 3:1, Bedienelemente, Fokus und Symbole 3:1 (1.4.11).
- **APCA** (Myndex, Kandidat für WCAG 3, noch keine Norm): Stufen Lc 90 bevorzugt für Fließtext, Lc 75 Minimum für Fließtext ab 18px/400, Lc 60 für Inhaltstext ab 24px oder 16px fett, Lc 45 für Überschriften ab 36px oder 24px fett und feine Symbole, Lc 30 Platzhalter und Deaktiviertes, Lc 15 Mindestmaß für Nicht-Text ab 5px. Grob entspricht Lc 45 etwa 3:1 und Lc 75 etwa 7:1, je nach Helligkeit des Grunds.
  - WCAG 2 überschätzt helle Schrift auf dunklem Grund; darum im Dunkelmodus beide Werte lesen.
  - Quellen: https://github.com/Myndex/apca-w3 , https://github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md
- Das Skript rechnet APCA nach APCA-W3 0.0.98G-4g (Prüfwerte: Schwarz auf Weiß Lc +106,0; Weiß auf Schwarz Lc −107,9; #888 auf Weiß Lc +63,1).

## Farbfehlsichtigkeit

- Rot-Grün-Schwäche: etwa **8 % der Männer und 0,4 % der Frauen** europäischer Herkunft (Metaanalyse 2012, PubMed 22472762; gleiche Zahlen beim Gesundheitsportal des Bundes gesund.bund.de). Häufigste Form ist die Deuteranomalie (Schätzung einer Fachorganisation, nicht aus einer Studie).
- Simulation im Skript: Machado, Oliveira & Fernandes (2009), Matrizen für volle Ausprägung, angewandt in linearem RGB.

## Dunkelmodus

- Material Design empfiehlt dunkles Grau (#121212, etwa OKLCH L 0,18) statt Schwarz: Schatten und Ebenen bleiben sichtbar, weniger Flimmern bei heller Schrift. Höhere Ebenen werden heller. Akzente im Dunkeln entsättigt, damit sie 4,5:1 erreichen.
  - Quelle: https://m2.material.io/design/color/dark-theme
- Reines Schwarz spart auf OLED etwas Strom; für Websites zählt die Lesbarkeit mehr.

## Markenwirkung (schwacher Beleg)

- **Labrecque & Milne (2011/2012), "Exciting red and competent blue"**, Journal of the Academy of Marketing Science: Blau im Logo wird eher mit Kompetenz, Rot eher mit Aufregung verbunden; Sättigung und Helligkeit verstärken die Wirkung. Laborstudien, kulturabhängig. Nur zur Bestätigung einer Wahl, nie als Begründung für ein Branchen-Klischee.

## Farbraum und Rechnen

- **OKLab/OKLCH** (Björn Ottosson, 2020): wahrnehmungsnah, Helligkeit L und Buntheit C lassen sich getrennt steuern. In CSS seit Color Level 4 in allen großen Browsern (`oklch()`).
- Farben außerhalb von sRGB werden im Skript durch Senken der Buntheit bei gleichem L und Farbton in den Farbraum geholt (wie es CSS Color 4 sinngemäß vorsieht).
- **Display P3:** `color(display-p3 …)` und `@media (color-gamut: p3)`; sRGB-Fallback zuerst angeben (WebKit, Chrome-Doku "Migrate to HD CSS color").
