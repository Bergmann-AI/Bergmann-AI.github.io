---
name: website-regie
description: Zuerst laden, wenn eine Website oder Landingpage gebaut, umgebaut, poliert oder geprüft wird. Regelt, wie impeccable, taste-skill, website-texte, website-farben, website-bilder, 3d-website und ui-feinschliff zusammenarbeiten, und setzt das Qualitäts-Tor (Kontrast, Bildschärfe, Tempo, Barrierefreiheit, Recht und Technik), bevor eine Seite fertig heißt.
---

# Website-Regie

Zwei Design-Skills, eine Seite. **impeccable** gibt die *Richtung*: welche Welt, welcher Stil, wie fein verarbeitet. **taste-skill** ist der *Filter* gegen den KI-Look: was auf eine echte Firmenseite gehört und was nie. Dazu kommen die Fach-Skills der Agentur: **website-texte** (Worte), **website-farben** (Farben, die zusammenpassen), **website-bilder** (Schärfe und Tempo der Bilder), **3d-website** (Szenen) und **ui-feinschliff** (kleine Bewegungen und Details). Diese Datei ist die Regie. Sie sagt, wer bei welcher Frage das letzte Wort hat. Wo sie nichts sagt, gelten die Skills unverändert.

**Vorrang vor allem:** Ein ausdrücklicher Wunsch des Nutzers und feste Vorgaben des Kunden (Corporate Design, Markenfarben, Schriften, echte Daten) gehen allen Skills vor. Jede Abweichung von einer Skill-Regel steht im Bericht. Prüfer-Funde, die genau daher kommen, sind erwartet und werden begründet statt weggebaut.

## Welche Seite, welche Skills

Den Modus bestimmt impeccable (siehe dort "Modes"):

| Seite | Modus | Skills |
|---|---|---|
| Startseite, Landingpage, Angebots-, Produkt-, Preisseite | Persuade | impeccable + taste-skill, ganzer Ablauf |
| Impressum, Datenschutz, Blog, FAQ, Doku | Read | impeccable allein; von taste nur die Liste "Never" |
| Dashboard, Kundenportal, Buchungsstrecke, Cockpit | Operate | impeccable allein; von taste nur die Liste "Never" |
| Portfolio, Galerie, Showcase | Experience | impeccable führt; taste nur als Gegenprobe gegen KI-Look |

website-texte, website-farben und website-bilder gelten in **jedem** Modus. Die taste-Prüfskripte laufen nur auf Persuade-Seiten. Auf den anderen scheitern sie an Regeln, die dort nicht gelten (ein Abschnitt pro Bildschirm, Hero-Pflichten).

## Ablauf

1. **Laden.** Über das Skill-Tool: impeccable (z. B. `impeccable:impeccable`), taste-skill (z. B. `taste-skill:taste-skill`), `website-texte`, `website-farben`, `website-bilder`; wenn die Seite eine 3D-Szene hat oder bekommt `3d-website`; für Menüs, Dialoge, Formulare und Mikro-Bewegungen `ui-feinschliff`. Je nach Installation mit Präfix (z. B. `anthropic-skills:website-farben`) oder als Projekt-Skill aus `.claude/skills/`. Fertig, wenn alle SKILL.md gelesen sind.
2. **Kontext (impeccable).** `impeccable context` ausführen, PRODUCT.md und DESIGN.md lesen. Fertig, wenn feststeht, ob es eine DESIGN.md gibt, welcher Modus gilt und ob die Seite schon auf dem taste-Kit steht (`assets/system.css`, `<html data-type>`).
3. **Material des Kunden (neu).** Was ist da, was fehlt? Logo (am besten SVG), Fotos (Originale, keine Messenger-Kopien), Markenfarben, Texte, Preise, Öffnungszeiten, Adresse.
   - Fotos: `website-bilder` `bilder.py pruefen <ordner>`: reicht jedes Foto für seinen Platz?
   - Farben: `website-farben` `farben.py aus-bild logo.png --logo` und für 2 bis 3 Fotos.
   - Fehlendes geht als Liste an den Kunden. Fertig, wenn die Liste steht.
4. **Art des Betriebs (taste).** taste-skill Abschnitt 1: die Art bestimmen (software, gaming, tech, product, service, place) und als erste Planzeile notieren. Die Art legt fest, welche Mittel erlaubt sind. Fertig, wenn die Art im Plan steht.
5. **Richtung.** Genau ein Weg:
   - *Bestehende Seite verfeinern:* DESIGN.md und der vorhandene Code sind die Richtung. Niemand würfelt.
   - *Neue Seite in einer bestehenden Welt:* DESIGN.md gibt die Welt, impeccable entscheidet den Aufbau.
   - *Neue Welt:* impeccable new-work wählt mit `concept-seed`, der Nutzer entscheidet. Die Grenzen der taste-Art gehen als feste Vorgabe in jede Richtung ein (Beispiel Café: Fotos statt Shader). Die Farben baut `website-farben` aus der Markenfarbe des Kunden (`farben.py bauen … --vorschau`), die Vorschau geht mit der Richtung an den Nutzer. Bauweg *code-led* (Regel 3).

   Fertig, wenn genau eine Richtung feststeht.
6. **Plan in Bildschirmen (taste).** taste Schritt 3: eine Zeile pro Abschnitt mit Idee, Bild (welches echte Foto, welcher Platz nach website-bilder) und Höhe (1 oder 2 Bildschirme). Fertig, wenn jeder Abschnitt seine Zeile hat.
7. **Texte (website-texte).** Neue Texte nach website-texte schreiben, bestehende bleiben wörtlich (Regel 4). Fertig, wenn `texte_pruefen.py` ohne offene Funde ist oder jeder Fund begründet.
8. **Bauen.** Vor jeder UI-Änderung impeccable `reference/craft-floor.md` lesen und die "House rules" von taste dazunehmen. Bilder nur über `bilder.py machen` einbauen (Größen, AVIF/WebP, `sizes`, Ladeverhalten). Farben nur als Rollen-Tokens. Bei Widerspruch gelten die Tabelle und die Konfliktregeln unten.
9. **Prüfen, in dieser Reihenfolge, immer nur ein Browser zur Zeit:**
   1. taste-Skripte nacheinander: `consistency.mjs`, `assets/layout/check.mjs`, `perf.mjs`, `shoot.mjs` mit den Breiten aus taste Schritt 6.
   2. `impeccable detect --json <URL der Seite>` über einen lokalen Server, einmal, danach mit `--viewport 390x844`. Ein Scan der Datei kennt den Hintergrund nicht und meldet Kontrastfehler, die keine sind. Der Detektor läuft nicht in jeder Umgebung automatisch als Hook mit.
   3. Fach-Prüfungen: `farben.py pruefen --css …` und `farben.py inventur …`; `bilder.py seite index.html` und `node messen.mjs index.html`; bei 3D `node szene-pruefen.mjs index.html`; `texte_pruefen.py index.html --anrede sie`.
   4. impeccable `critique` und `polish` auf den Screenshots aus 1.
   5. Alles beheben, dann einmal neu prüfen.

   Fertig, wenn alle Durchgänge gelesen sind und jeder offene Fund im Bericht begründet ist.
10. **Qualitäts-Tor** (unten). Erst wenn jede Zeile erfüllt oder begründet ist, heißt die Seite fertig.
11. **Abschluss.** Neue Welt oder geänderter Stil: impeccable schreibt die DESIGN.md (Documenter), samt Farb-Tokens aus website-farben. Bericht nach taste Schritt 7, plus welche Konfliktregeln gegriffen haben, das Qualitäts-Tor und was nicht geprüft werden konnte.

## Wer entscheidet was

| Frage | Entscheidet |
|---|---|
| Welt, Stil, Schriften, hell oder dunkel | impeccable (DESIGN.md) |
| Markenfarbe | der Kunde (Logo, CD); ohne Vorgabe der Nutzer aus den Vorschlägen von website-farben |
| Farbleiter, Rollen, Kontrast, Dunkelmodus-Werte, Harmonie | website-farben, innerhalb der Richtung von impeccable |
| Welche Mittel zur Art des Betriebs passen (Fotos, Shader, Szenen, Momente) | taste-skill |
| Seitenaufbau in Bildschirmen, gleiche Ränder, ein Abschnitt pro Bildschirm | taste-skill |
| Verarbeitung: Abstände, Zustände, Fokus, Browser-Oberflächen | impeccable (craft-floor) |
| Bildauflösung, Formate, Ausschnitt, Ladeverhalten | website-bilder |
| Typische KI-Muster (Detektor-Regeln) | impeccable, Abgleich mit taste in Regel 9 |
| Texte, Werberecht, Pflichtangaben in Texten | website-texte (Regel 4) |
| 3D-Szene, Kamerafahrt, Bildqualität und Leistung der Szene | 3d-website |
| Mikro-Bewegungen, Menüs, Dialoge, Formulare | ui-feinschliff, innerhalb von Regel 7 |

## Konfliktregeln

1. **Ein Würfel.** Die Richtung kommt aus DESIGN.md oder aus impeccable `concept-seed`. taste `start.mjs deal` (Palette, Schriftpaar) und `deal.mjs` (Hero) laufen nur, wenn der Nutzer ausdrücklich den taste-Look als Grundlage will. Dann gelten die gedealten Farben und Schriften als festgelegt. Hat der Kunde eine Markenfarbe, ersetzt sie die gedealte Palette: `farben.py bauen` druckt dafür die passende Zeile `start.mjs brand …`.
2. **Ein Token-System.**
   - *Seite steht schon auf dem taste-Kit:* Die Kit-Dateien (`assets/system.css`, `system.js`, `layout/`, `motion/`, `ui/`) bleiben unverändert. Angepasst wird über den `:root`-Block und Seiten-CSS. DESIGN.md beschreibt das Ergebnis.
   - *Seite ohne taste-Kit:* `starter.html`, `system.css` und der Kit-Ordner kommen nicht hinein. Einzelne Bausteine (`assets/components`, `assets/ui`, Diagramme) werden übernommen, nachdem ihre Farben, Radien und Schriften auf die DESIGN.md-Tokens umgestellt sind. Bei React, Vue oder Tailwind heißt das: als Komponente nachbauen, Tokens aus dem Projekt.
   - Farben stehen nur als Rollen-Tokens im Code (website-farben Regel 1); `farben.py inventur` findet lose Werte.
3. **Echte Bilder.** Auf der fertigen Seite stehen echte Fotos, Material des Kunden, Renders echter Produkte oder echte Daten (Karten, Texturen). Für neue Welten bei impeccable den Bauweg *code-led* nehmen. KI-Entwürfe (Comps) dienen höchstens als Vorlage, und KI-Bildflächen ("plates") kommen nur auf die Seite, wenn der Nutzer das ausdrücklich will. Zu kleine Kundenfotos werden nicht stillschweigend hochskaliert: erst das Original anfordern, Hochskalieren nur als genannte Notlösung (website-bilder, Sonderfälle).
4. **Texte und Daten.** Vorhandene Texte, Preise und Angebote bleiben wörtlich (impeccable: Verfeinern bewahrt). Neue Texte schreibt website-texte; die Struktur-Prüfungen aus taste `copy.md` (Überschrift nennt Angebot und Kunden, ein harter Fakt im ersten Bildschirm, Buttons mit Verb und Objekt) laufen über `consistency.mjs` mit. Verbesserungen an bestehenden Texten gehen als Vorschlag an den Nutzer. Öffnungszeiten und Preise, die taste für einen Ort erfindet, sind nur im Entwurf erlaubt: sichtbar markiert und als offene Frage an den Kunden gelistet.
5. **Echte Kontaktdaten.** taste-Regel 9 (keine Hausnummer, `.example`-Adressen, keine echten Telefonnummern) gilt für Entwürfe und Demo-Seiten. Auf einer echten Kundenseite stehen die echten Daten des Kunden vollständig, bei lokalen Betrieben auch für Google (Name, Adresse, Telefon gleich wie im Unternehmensprofil). Dem Prüfer werden sie mitgegeben: `consistency.mjs … --address-allow "Musterstraße 12|12345 Musterstadt|0123 456789"`.
6. **Hell oder dunkel.** impeccable entscheidet über den Satz zur Nutzungsszene (wer, wo, bei welchem Licht). taste setzt die Grenze: dunkle Seiten und dunkle Heros nur bei Tech-Arten, außer Marke oder Kunde legen dunkel fest (Bar, Tattoo-Studio, Premium-Autohaus). Die Werte der dunklen Leiter kommen aus website-farben (Grund getönt L 0,16 bis 0,22, nie umgedrehte helle Farben).
7. **Bewegung.** Zusammen gilt:
   - Ein erzählender Moment pro Seite (impeccable). Bei Tech ist das die 3D-Szene, der eine taste-Effekt oder ein taste-Moment, nur eines davon als Hauptsache.
   - Text, Karten und Abschnitte stehen beim Scrollen fest, ohne Einblenden und ohne Parallax (taste).
   - Der Hover-Layer von taste gehört dazu (Karte hebt sich 2px, Foto zoomt 1,02, Buttons drücken). Steht `assets/motion` in der Seite, gehören ihm Hover und Druck. ui-feinschliff ergänzt Menüs, Dialoge, Toasts und Formulare, und Listen staffelt es nur, wenn der Nutzer sie öffnet, nie beim Scrollen.
   - Kartenschleifen nur bei Tech, 2,5 bis 4 s, mit Pause-Möglichkeit. Unter `prefers-reduced-motion` steht alles.
8. **3D-Szene und taste-Checker.** Eine Szene nach `3d-website` (feste Leinwand hinter der Seite, folgt dem Scrollen) ist die eine große Szene der Seite. Sie bekommt `data-big-scene`, und die Seite trägt ihre Art in `<html data-type>` und `<meta name="site-kind">`. Dann wertet `consistency.mjs` sie als erlaubt (WARN statt FAIL). Bleibt trotzdem ein `scroll-linked`- oder `pinned`-Fund genau auf dieser Leinwand, steht er mit Begründung im Bericht, und die Szene bleibt. Alle anderen Funde werden behoben.

   Das Leistungsbudget von `perf.mjs` rechnet mit tastes eigenen, leichten WebGL-Szenen. Eine Szene mit three.js liegt darüber: three.js allein bringt rund 700 KiB JavaScript (r170 675 KiB, r187 gebündelt 731 KiB; gzip 167 bis 185 KiB), dazu kommen die Texturen. Die Funde `JS parsed` und `total transfer` sind deshalb erwartet, wenn das Handy 2K-Texturen lädt, der Desktop 4K erst nach dem ersten gezeichneten Bild und three.js die einzige große Bibliothek ist. Alles andere bleibt im Budget: Schriften als WOFF2 unter 320 KiB, Fotos, Layout-Shift. Den Layout-Shift misst `perf.mjs` auf 3D-Seiten mit WebGL aus, also in der Ersatzansicht: Sie muss vor dem ersten Zeichnen stehen (3d-website, Abschnitt Leistung; `szene-pruefen.mjs` prüft das mit).
9. **impeccable-Detektor gegen taste-Bausteine.** Bei neuer Arbeit gilt ein Fund des Detektors: Das Element wird anders gebaut. Ausgenommen ist nur, was der Nutzer oder Kunde bewusst gewählt hat, festgehalten in PRODUCT.md unter "Brand Commitments". Dass ein Element in der DESIGN.md steht, reicht dafür nicht, denn DESIGN.md beschreibt oft nur, was ein früherer Durchlauf gebaut hat. Auf einer bestehenden Seite wird ein solcher Fund weder still geändert noch still behalten: Er geht einmal als Frage an den Nutzer (behalten oder ersetzen?), und die Antwort kommt in PRODUCT.md. So passen die beiden zusammen:
   - `fx-icon-tiles` und Feature-Karten: Icon neben die Überschrift, nicht als Kachel darüber (`icon-tile-stack`). Jede Karte trägt echten Inhalt (UI-Ausschnitt, Diagramm, Foto, Preis), nie nur Icon, Überschrift und Text.
   - `fx-stat`: Ziffern in Vollfarbe ohne Effektfüllung (`gradient-text`), nicht als Kennzahlen-Block im Hero.
   - Leuchtgründe, Halos, Spotlights (`dark-glow`, `radial-halo`, `radial-spotlight-glow`) nur, wenn bewusst gewählt.
   - Kicker über Überschriften (`hero-eyebrow-chip`, `kicker-above-heading`): fallen weg, auch `hero__kicker` aus taste `hero-split`. Die Info wandert in Überschrift oder Lead.
   - Diagramm-Impulse laufen entlang der Linien. Pulsierende Status-Punkte nur bei echten Live-Daten (`pulsing-dot`).
   - Schriften: keine aus `overused-font` (Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk), außer bewusst gewählt.
   - Farben: kein Violett (taste, `farben.py pruefen` meldet es), Cyan auf Dunkel nur, wenn bewusst gewählt (`ai-color-palette`).
   - Glas-Look: dünner Rand mit breitem Schatten (`gpt-thin-border-wide-shadow`) und Karten in Karten (`nested-cards`) nur, wenn bewusst gewählt.
10. **Icons.** Logos echter Tools und Produkte (n8n, Gmail, WhatsApp) als echte Farb-Logos (taste). Bedien-Icons (Pfeil, Haken, Menü) aus einer Bibliothek in einer Strichstärke (impeccable). Emoji und Unicode-Zeichen ersetzen keine Icons.
11. **Glas und Unschärfe** nur, wenn bewusst gewählt (Regel 9). Dann als halbtransparenter Verlauf mit feinem Rand statt `backdrop-filter` auf vielen Elementen (3d-website).
12. **Bildunterschriften.** Keine Unterschrift unter Bildern, Bildnachweise in einer Fußzeile (taste). Preise, Produktnamen und Überschriften in Karten zählen nicht als Unterschrift. In Galerien (Experience) dürfen Werktitel stehen, wenn der Kunde sie will.
13. **Wenn ein Werkzeug nicht läuft.** Chrome startet als root (Cloud-Sitzung) nur mit `--no-sandbox`: eine kleine Hülle, die `chromium --no-sandbox "$@"` aufruft, als `CHROME_PATH` setzen, an den Kit-Dateien nichts ändern. Die Skripte von website-bilder und 3d-website starten Chromium selbst mit `--no-sandbox` (Playwright; bei Bedarf `NODE_PATH=$(npm root -g)`). Fehlen Node 22, Chrome oder Netz, steht im Bericht, welche Prüfung nicht lief, und die Seite wird per Screenshot in 1440, 768 und 390 Breite angesehen.
14. **Farben zwischen den Skills.** taste will 90 bis 95 % Neutral und einen Akzent mit 3:1 zum Grund; website-farben rechnet das nach und ergänzt APCA, Farbfehlsichtigkeit und die Trennung von Button-Fläche (`accent`) und Textlink (`link`). Helle Markenfarben (Gelb) dürfen als Button-Fläche unter 3:1 bleiben, wenn die Beschriftung 4,5:1 hat und der Fokusring eine eigene Farbe trägt; das steht dann begründet im Bericht.
15. **Bilder zwischen den Skills.** taste bestimmt, *welche* Fotos wohin gehören und wie viele; website-bilder bestimmt, *wie* sie ausgeliefert werden. `photo-upscale` (taste) und `messen.mjs` (website-bilder) zeigen dasselbe Problem: Das größere Original ist die Lösung, nicht Schärfen.

## Qualitäts-Tor

Eine Seite heißt erst fertig, wenn jede Zeile erfüllt oder im Bericht begründet ist.

| Bereich | Ziel | Prüfung |
|---|---|---|
| Kontrast | Text 4,5:1, große Schrift, Bedienelemente und Fokus 3:1; APCA Fließtext Lc 75 | `farben.py pruefen`, impeccable detect |
| Farben | eine Marke, Rollen-Tokens, kein Violett, keine Fast-Dubletten | `farben.py pruefen`, `inventur` |
| Bilder | jedes Foto mindestens 2x bei 1440 und 390 oder begründet; LCP-Bild nicht lazy, `fetchpriority="high"` | `messen.mjs`, `bilder.py seite` |
| Tempo | LCP unter 2,5 s, CLS unter 0,1, INP unter 200 ms; Schriften WOFF2 und selbst gehostet | taste `perf.mjs`, Lighthouse wenn verfügbar |
| 3D | keine Konsolenfehler, Leinwand höchstens 2x, Ersatzbild ohne Sprung | `szene-pruefen.mjs` |
| Texte | keine Floskeln, nichts Erfundenes, Werberecht | `texte_pruefen.py`, website-texte `recht.md` |
| Barrierefreiheit | Tastatur bis zum Ziel, Fokus sichtbar und nicht von festen Leisten verdeckt (`scroll-padding-top`), Klickflächen mindestens 24 × 24 px (WCAG 2.2), Überschriften in Reihenfolge, `lang="de"`, Alt-Texte, Bewegung abschaltbar | Tastatur-Durchgang, impeccable audit |
| BFSG | Onlineshop oder Buchung für Verbraucher und kein Kleinstunternehmen (unter 10 Beschäftigte und höchstens 2 Mio. € Umsatz): volle Barrierefreiheit nach WCAG 2.1 AA (EN 301 549) plus Erklärung zur Barrierefreiheit | website-texte `recht.md` Abschnitt 10; im Zweifel den Kunden fragen |
| Recht und Technik (DE) | Impressum (§ 5 DDG) und Datenschutz von jeder Seite mit einem Klick; nichts lädt vor der Einwilligung von fremden Servern (Schriften, Karten, Videos, Chat-Widgets, CDNs); Cookie-Banner nur, wenn nicht notwendige Dienste laufen (§ 25 TDDDG); Formulare per HTTPS | Netzwerk-Tab bzw. `messen.mjs`-Ressourcen: nur eigene Domain vor Zustimmung |
| Auffindbarkeit | eindeutiger `<title>` und Beschreibung, `canonical`, OG-Bild 1200 × 630, Favicon-Satz, bei lokalen Betrieben `LocalBusiness`-Daten nur mit echten Angaben, `sitemap.xml`, `robots.txt`, 404-Seite | website-texte `seo-ki-suche.md`, website-bilder `sonderfaelle.md` |

Rechtliche Punkte sind Hinweise aus der Praxis, keine Rechtsberatung; im Zweifel prüft das der Kunde mit seiner Beratung (IHK, Anwalt).
