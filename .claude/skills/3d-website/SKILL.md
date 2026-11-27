---
name: 3d-website
description: Websites mit echter 3D-Szene in sauberer Bildqualität. Szene, die dem Scrollen folgt (Kamerafahrt, drehendes Objekt), Produkt in 3D mit AR am Handy, vorgerenderte 4K-Standbilder. Regeln für sauberes Bild (Farbmanagement, Tone Mapping, Licht, Kantenglättung, Banding), Auflösung (Pixeldichte, Texturgrößen, KTX2), Leistung und ein Prüfskript mit Screenshots und Bildzeiten. Verwenden bei 3D-Website, Scroll-Film, Kamerafahrt, three.js, WebGL, Produkt in 3D, glTF, AR, "Awwwards-Niveau" oder wenn eine Szene unscharf, flimmernd, flau oder ruckelig wirkt.
---

# 3D-Website

Eine 3D-Seite hat genau **ein** Hauptobjekt und **eine** Kamerafahrt. Der Inhalt liegt als normales HTML darüber. Die Szene erzählt, der Text verkauft. Sauber heißt: richtige Farben, ruhige Kanten, kein Flimmern, keine Treppen, kein Ruckeln.

Ausführlich: `references/sauberes-bild.md` (Code zu jeder Bildregel), `references/rezepte.md` (Produkt mit AR, glTF-Pipeline, Standbilder, Scroll-Video, echte 3D-Scans), `references/three-update.md` (von r170 auf die aktuelle Version).

## 0. Passt 3D überhaupt?

Die Art des Betriebs (taste-skill, Abschnitt 1) entscheidet:

| Art | 3D erlaubt | Bauweg |
|---|---|---|
| software, gaming, tech | die eine große Szene, ein Effekt | live mit three.js (dieser Skill) |
| product (physisches Produkt) | das Produkt selbst, als Render oder drehbar mit AR | `<model-viewer>` oder vorgerenderte Standbilder (Rezepte A und C) |
| service, place | keine Szene; Fotos führen | höchstens auf ausdrücklichen Wunsch ein echter 3D-Scan des Raums in einem eigenen Abschnitt (Rezept E) |

**Echtes Material:** Das 3D-Modell kommt vom Hersteller (CAD, STEP, glTF), aus einem Scan des echten Produkts (Fotogrammetrie, z. B. mit iPhone Object Capture, RealityScan, Polycam) oder ist ein sauber gebautes Modell eines echten Gegenstands. KI-erzeugte Modelle nur, wenn der Nutzer das ausdrücklich will.

## 1. Vor dem Bauen klären

Frag den Nutzer, falls es nicht feststeht:

1. **Hauptobjekt:** Was steht im Mittelpunkt (Produkt, Planet, Gerät, Logo)? Gibt es ein echtes Modell?
2. **Bewegung:** Kamerafahrt durch die Szene, Objekt dreht und zerlegt sich, oder frei drehbar per Finger?
3. **Bauweg:** live (three.js), Produkt-Viewer (`<model-viewer>`, mit AR) oder vorgerendert (4K-Standbilder oder Video, null GPU-Last beim Besucher). Braucht es keine Interaktion, ist vorgerendert fast immer schärfer und schneller.
4. **Look:** dunkel mit Leuchten, hell und reduziert, oder im Wechsel? (Dunkel nur nach website-regie Regel 6.)
5. **Umfang:** Dürfen Texte geändert werden, oder nur der Aufbau?

Texte, Preise und Angebote bleiben wörtlich, solange der Nutzer nichts anderes sagt.

## 2. Aufbau

- Eine `<canvas>` mit `position: fixed; inset: 0; z-index: 0; pointer-events: none`. Der Inhalt liegt mit `position: relative; z-index: 1` darüber. Die Leinwand trägt `data-big-scene` (website-regie Regel 8).
- three.js lokal ablegen als **eine** Datei `assets/3d/three.module.min.js`, als `<script type="module">` am Seitenende laden. Kein CDN (Datenschutz, Ausfallsicherheit), kein Build-Schritt bei statischen Seiten.
  - Bis r170: `three@0.170.0/build/three.module.min.js` direkt.
  - Ab r171 ist three.js in `three.module.js` + `three.core.js` geteilt, und neuere Pakete (geprüft r187, Nov. 2026) liefern keine `.min.js` mehr. Dann einmal bündeln: `npx esbuild@0.25.0 node_modules/three/build/three.module.js --bundle --format=esm --minify --outfile=assets/3d/three.module.min.js` (Ergebnis r187: 731 KB, gzip 185 KB). Lizenzdatei `three-LICENSE.txt` daneben.
  - Vor jedem Update `references/three-update.md` lesen. Getestet: die Erde-Vorlage läuft mit r187 ohne Änderung und ohne Konsolenfehler, Bild gleich wie mit r170.
- Hilfsdateien aus `vorlage/` dieses Skills nach `assets/3d/` des Projekts kopieren: `bloom.js` (Glow) und `gpu-upload.js` (ruckelfreies Laden von Shadern und Texturen). Beide importieren `./three.module.min.js`. `vorlage/scene.js` und `vorlage/film.js` nur als Vorbild lesen (siehe Referenz), nicht unverändert übernehmen.
- Die Kamerafahrt ist eine Liste von Wegpunkten `[Scroll 0..1, Position, Blickziel]`. Zwischen den Punkten mit Smoothstep interpolieren. Nie linear: Kamerabewegungen beginnen und enden weich.
- Scrollsteuerung mit GSAP ScrollTrigger (lokal in `assets/vendor`; GSAP samt allen Plugins ist seit 3.13 kostenlos, auch kommerziell), Glättung mit `gsap.quickTo`. Ohne GSAP: Scroll-Wert im passiven `scroll`-Listener lesen und im Render-Loop weich folgen (`k = 1 - pow(0.0015, dt)`).
- Jeder Seitenabschnitt bekommt einen eigenen Blick: Anfang nah und dramatisch, Mitte ruhig, Ende die Totale.

## 3. Sauberes Bild (Pflicht)

Jede Regel mit Code in `references/sauberes-bild.md`.

1. **Farbmanagement:** Ausgabe in sRGB (`renderer.outputColorSpace = SRGBColorSpace`). Farbtexturen (Fotos, Albedo, Emission) bekommen `colorSpace = SRGBColorSpace`, Datentexturen (Normalen, Rauheit, Masken, Höhen) `NoColorSpace`. Eigene Shader rechnen Licht im **linearen** Raum und wandeln erst am Ende. Wer Shader direkt Anzeigewerte schreiben lässt (wie die Erde-Vorlage, `LinearSRGBColorSpace` als Ausgabe), tut das bewusst und durchgängig.
2. **Tone Mapping passend zum Zweck:** Produkt und Markenfarben: `NeutralToneMapping` (Khronos PBR Neutral, Farben bleiben treu). Atmosphäre, Himmel, Licht: `AgXToneMapping` (weiche Lichter, etwas entsättigt). ACES nur, wenn bewusst knallig (verschiebt Farbtöne). Mit Nachbearbeitung: Tone Mapping und sRGB erst im letzten Pass (`OutputPass`), vorher in HalfFloat rechnen.
3. **Hintergrund ohne Naht:** Szenen-Hintergrund und Seitenfarbe müssen exakt gleich aussehen. Tone Mapping verändert auch die Hintergrundfarbe. Darum entweder Leinwand transparent (`alpha: true`, Hintergrund kommt von der Seite) oder die Hintergrundfarbe nach dem Tone Mapping setzen. Mit `szene-pruefen.mjs` die Ränder ansehen.
4. **Licht:** eine Hauptlichtquelle plus Umgebungslicht aus einer HDRI (Poly Haven, CC0, 1k bis 2k reicht für Reflexionen) über `PMREMGenerator`, oder `RoomEnvironment` für Studio-Licht. Weiche Kontaktschatten (vorberechnet oder unscharfe Schattenfläche) statt harter Echtzeit-Schatten, vor allem am Handy. Ambient Occlusion in die Textur backen.
5. **Kanten ohne Treppen:** Bei Bildschirm-DPR 2 und mehr reicht meist die hohe Auflösung. Darunter MSAA (`antialias: true` oder `samples: 4` am Render-Ziel, nur WebGL2). Mit Nachbearbeitung SMAA oder FXAA als letzter Pass. Dünne Linien als Geometrie, nie als 1-px-`LineBasicMaterial` (flimmert).
6. **Kein Flimmern in Texturen:** Mipmaps an, `anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())` für schräg gesehene Flächen. Feine Muster (Gitter, Stoff) in kleiner Entfernung vermeiden oder unscharf vorfiltern.
7. **Kein Banding:** Verläufe, Nebel, Glow und dunkle Himmel in HalfFloat-Render-Zielen rechnen und am Ende fein dithern (±0,5/255 Rauschen oder `material.dithering = true`). Acht Bit pro Kanal reichen für weiche Verläufe nicht.
8. **Nachbearbeitung sparsam:** Bloom nur für wirklich helle Stellen (Schwelle hoch, weiche Schulter), leichte Vignette, Filmkorn höchstens 1 bis 2 %, wenn Render und Fotos zusammen stehen. Keine chromatische Aberration, kein starkes Tiefenunschärfe-Spiel hinter Text, kein Linsenreflex als Dekor.
9. **Bewegung wirkt teuer, wenn sie ruhig ist:** Kamera mit Dämpfung, Drehungen unter etwa 20° pro Sekunde, keine Zuckungen beim Richtungswechsel des Scrollens, ein Sprung (Anker-Link) spielt höchstens 1,6 Szenen ab.
10. **Glas und Unschärfe** nur, wenn bewusst gewählt (website-regie Regel 11). Dann als halbtransparenter Verlauf mit feinem Rand, **kein `backdrop-filter`** auf vielen Elementen (ruckelt beim Scrollen).

## 4. Auflösung

- **Leinwand:** `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`. Mehr als 2x kostet nur GPU (website-bilder: 3x sieht niemand). Die 3D-Szene dahinter intern 1,75 (Desktop) bzw. 1,5 (Handy) über ihren eigenen Render-Puffer, Text und UI bleiben in voller Schärfe darüber. Die Leinwand ändert ihre Größe nie während des Scrollens. MSAA nur bei Szenen-DPR unter 1,5.
- **Frame-Zeit-Regler:** Kommen Bilder zu spät, sinkt die interne Auflösung der Szene stufenweise (Vorlage `scene.js`, `gov`). Prüfen am Gerät mit `?fps`, Messen mit fester Auflösung mit `?gov=0`.
- **Texturgröße aus der Bildschirmgröße ableiten:** so viele Texel, wie die Fläche im größten Bildschirm-Moment Pixel bedeckt (× DPR, höchstens 2). Desktop 4096 nur für das Hauptobjekt in Nahaufnahme, Handy höchstens 2048. Zwei Fassungen als WebP (4k Desktop, 2k Handy) oder als **KTX2** (Basis Universal: etwa 75 % weniger Grafikspeicher als PNG/JPEG; ETC1S für Farbe, UASTC für Normalen und feine Details).
- **Masken packen:** Mehrere Graustufen-Masken in die Farbkanäle einer Textur (R, G, B, A je eine Maske).
- **Distanzfelder für Schrift und Logos:** Kanten bleiben bei jedem Zoom scharf (Vorlage: Wort als Distanzfeld mit fein ±8 und grob ±64 Texel).
- **Vorgerenderte Bilder** (Rezept C) 1,5-fach größer als die Zielgröße rendern und verkleinern: saubere Kanten ohne Echtzeit-Kosten. Ausliefern mit website-bilder (`bilder.py machen`).

## 5. Qualität der Szene

- Eigene Shader statt Standard-Material, wo es um Atmosphäre geht: Tag/Nacht-Grenze, Rand-Leuchten (Fresnel), Atmosphäre als zweite Kugel mit `BackSide` und additivem Blending. Für Produkte dagegen `MeshPhysicalMaterial` mit echten PBR-Texturen.
- Echte Daten statt Zufall, wo es geht (Küstenlinien, Städte, Höhenkarten). Zufällige Punkte sehen sofort künstlich aus.
- Eine Lichtquelle, eine Akzentfarbe (Farben aus website-farben). Leuchten kommt aus additivem Blending und einem leichten Bloom-Pass (`vorlage/bloom.js`: Float-Ziel, Helligkeitsfilter, 3 bis 4 Unschärfe-Stufen, weiche Lichterschulter). Am Handy weniger und kleinere Stufen, kein MSAA.
- Kein Nebel und keine gezeichneten Linien als Ersatz für Licht: das wirkt künstlich.

## 6. Lesbarkeit

- Hinter Überschriften einen weichen dunklen Verlauf legen, keinen Kasten.
- In Abschnitten mit viel Text die Szene abdunkeln (Uniform, das dem Scroll-Wert folgt).
- Text über der Szene erfüllt die Kontraste aus website-farben (Fließtext 4,5:1) gegen die **hellste** Stelle der Szene dahinter, nicht gegen den Durchschnitt.

## 7. Leistung (Pflicht)

- Budgets am Handy (Richtwerte): unter etwa 100 Draw Calls (`renderer.info.render.calls`), Geometrie halbiert gegenüber Desktop, Texturen höchstens 2048, ein WebGL-Kontext (taste: höchstens 4 auf der ganzen Seite).
- Rendern pausieren, wenn der Tab verborgen ist (`visibilitychange`) oder die Leinwand nicht im Bild ist (`IntersectionObserver`). Sonst **jeden Frame** zeichnen (kein Halbtakt), im GSAP-Ticker nach den Tweens; nur ein unverändert stehendes Bild darf die Leinwand einfach behalten.
- Kein Ruckler beim ersten Auftritt eines Objekts: Programme vorab kompilieren (`compileAhead` aus `vorlage/gpu-upload.js`, nutzt `renderer.compileAsync` mit `KHR_parallel_shader_compile`, wo vorhanden) und ihren ersten Gebrauch vorziehen, Render-Targets mit `initRenderTarget` anlegen, einmal in ein 4×4-Ziel proben (Geometrie hochladen). Große Bilder mit `createImageBitmap` dekodieren und in Streifen hochladen (`vorlage/gpu-upload.js`). `renderer.debug.checkShaderErrors` nur mit `?debug`.
- Leinwand per CSS `100lvh` und Größe aus `canvas.clientWidth/Height`: Die Adressleiste am Handy löst dann keine Neuanlage aus. Scroll-Strecken mit einer stabilen Höhe rechnen (`100svh`-Element), nicht mit `innerHeight`.
- Nur `transform` und `opacity` animieren. CSS-Animationen außerhalb des Sichtbereichs pausieren, Timer (Slideshows, Wiederholungen) nur bei Sichtbarkeit laufen lassen.
- Animationen **innerhalb** eines SVG (CSS-Rotation einer Gruppe, SMIL-Punkte) erzwingen jeden Frame Layout: Ein rotierendes Teil als eigenes SVG-Element drehen (Compositor), bewegte Punkte in eine versiegelte Box (`contain: strict`, feste Größe, `will-change: transform`) über das Bild legen.
- `prefers-reduced-motion`: Zeit einfrieren, Kamera ohne Nachlauf setzen.
- Ohne WebGL oder bei Kontextverlust: Klasse `no-3d` setzen und ein Standbild zeigen (in 2x-Schärfe nach website-bilder). Die Seite muss ohne 3D vollständig nutzbar sein. Die WebGL-Prüfung steht als kleines Inline-Skript im `<head>`, damit `no-3d` vor dem ersten Zeichnen gilt. Sonst fällt ein hoher Einstieg (`#intro`) erst nach dem Laden weg, und die Seite springt um mehrere Bildschirme (taste `perf.mjs` misst Layout-Shift auf 3D-Seiten genau so, mit WebGL aus).
- Gewicht: three.js ist die einzige große Bibliothek (gzip etwa 170 bis 190 KB). Handy lädt 2K-Texturen, Desktop 4K erst nach dem ersten gezeichneten Bild.

## 8. Prüfen, bevor es fertig heißt

1. **Skript:** `node scripts/szene-pruefen.mjs index.html --out shots/3d` (Playwright, CPU-Rendering; mit echter GPU `--gpu`). Es macht Screenshots bei Scroll 0, 0,15, 0,35, 0,55, 0,8 und 1,0 am Desktop (1440) und Handy (390), prüft Konsolenfehler, Zahl der WebGL-Kontexte, Zeichenpuffer gegen DPR, leere Leinwand, Bildzeiten und Layouts pro Bild beim Durchscrollen, dann reduzierte Bewegung und einen Browser ohne WebGL (no-3d, Layout-Shift). Die Bildzeiten ohne GPU sind nur relativ zu lesen.
2. **Jeden Screenshot ansehen:** Ist der Text lesbar? Zeigt die Kamera etwas Sinnvolles, nicht nur Schwarz? Kanten ohne Treppen, Verläufe ohne Stufen, Farben wie in DESIGN.md, keine Naht zwischen Leinwand und Seite?
3. **Leistung messen statt schätzen** (bei Verdacht genauer): je Frame JS-Zeit, GPU-Zeit (`EXT_disjoint_timer_query_webgl2`), blockierende GL-Aufrufe, Neuanlagen von Render-Targets, Long Animation Frames. Ziel: nach dem Laden kein Frame über ca. 8 ms Hauptthread, kein Layout pro Frame außerhalb versiegelter Boxen. Am echten Handy mit `?fps`.
4. Konsole ohne Fehler, `no-3d` nicht gesetzt.
5. CSS nie mit Zeilen-Regex löschen. Nur ganze Regeln entfernen und danach die Klammerbilanz des Stylesheets prüfen.

## Referenz: die Erde-Vorlage

`vorlage/scene.js` und `vorlage/film.js` in diesem Skill sind die Vorlage. Sie stammen von der Website Bergmann AI (Repo `Bergmann-AI/Bergmann-AI.github.io`, dort unter `assets/3d/`, Stand November 2026) und importieren `three.module.min.js`, `bloom.js` und `gpu-upload.js` aus demselben Ordner. Bildpfade wie `film/word-one.webp` oder `earth-day-4k.webp` beziehen sich auf jenes Repo. Die Vorlage zeigt: ein Einstieg vor der Seite (der Schriftzug „Bergmann AI“, durch dessen Glasbuchstaben man live die drehende 3D-Erde sieht; Scrollen fliegt in die Buchstaben, während die Kamera vom Horizont auf das Hero-Bild zurückzieht) und danach dieselbe Erde, die sich hinter dem Inhalt dreht.

- Ein einziger Zeitwert `S` steuert alles: 0 bis 10 ist der Einstieg (Scrollen durch den leeren Abschnitt `#intro`, 300svh; Flug 0,5 bis 8,6, danach steht die Erde kurz), 10 bis 11 kommt der Hero über die Erde, 11 ist die Seite.
- Die Erde wird von Anfang an gerendert: Solange das Wort sichtbar ist, geht ihr Bild (mit Bloom) in eine Textur, und `film.js` legt das Wort darüber; danach direkt auf den Bildschirm. Die Kamera folgt dem Flug (`film.progress`): von nah am Horizont (der leuchtende Rand und der Sonnenaufgang laufen durch das Wort, Richtung „AI“) zurück auf den Hero-Ausschnitt.
- Das Wort ist ein Distanzfeld in zwei Satzarten: `film/word-one.webp` einzeilig (Querformat), `film/word-two.webp` „Bergmann“ über „AI“ (Handy); R fein ±8 Texel, G grob ±64 Texel, damit der Umriss bei jedem Zoom (bis 45-fach) scharf bleibt. Erzeugt aus Playfair Display Italic mit PIL und `scipy.ndimage.distance_transform_edt` bei 4-facher Abtastung; der Zoom fliegt in einen Stamm von „AI“ (mittleres Höhenband, keine Serife).
- Glas-Look der Buchstaben: Bild darin aufgehellt, Lichtkante innen, langsamer Lichtstreif, das Licht der Erde (Bloom) knapp außerhalb. Beim Flug blendet erst der dunkle Grund aus, dann normalisiert sich das Bild in den Buchstaben, sodass am Ende die Erde allein steht.
- Ohne WebGL steht ein Standbild der Erde (`assets/img/hero-earth-1600.webp`) im Hintergrund; die WebGL2-Prüfung steht inline im `<head>`, `scene.js` versucht es dann gar nicht erst.
- Die Erde hinter der Seite ist fotorealistisch: echte Tag-, Nacht- und Wolkenkarten (`earth-day/night/clouds-4k.webp`, am Handy `-2k`; Solar System Scope, CC BY 4.0, Nennung im Footer), Licht im linearen Raum mit weichem Terminator, dunklerem Ozean mit Sonnenglanz, Wolkenschatten, Stadtlichtern nur auf der Nachtseite, dünnem Atmosphärensaum (Streuung blau, Morgenrot am Terminator).
- `S` folgt der Scrollposition weich (GSAP ScrollTrigger + `quickTo`); ein Sprung (Anker-Link) spielt höchstens 1,6 Szenen ab.
- Frühere Varianten im selben Repo: das Wort „Bergmann“ mit dem AI-Erde-Bild darin im Commit `4b30a3e`, der Bilder-Film aus dem Storyboard (Gehirn bis AI-Endbild, mit 3D-Partikeln) im Commit `59b672a`, die prozedurale Variante komplett aus Code im Commit `bc98ffb`.
- Prüfen mit `window.__scene.set(S)` und Screenshots je Szene, am Desktop und am Handy, und mit Vor- und Zurückscrollen.
- Gegenbeispiel ohne WebGL im selben Repo: `websites/assets/js/handy.js`, ein Handy aus HTML, das über die ganze Unterseite gleitet und im Bildschirm live eine echte Vorlage zeigt (früher three.js, ersetzt, weil echter Inhalt schärfer und leichter ist als eine Textur). Ein Gerät mit echtem Bildschirminhalt braucht oft kein 3D.
