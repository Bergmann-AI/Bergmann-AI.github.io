# Vorlage „Luxus-Scroll“

Premium-Website mit Scroll-Erzählung, nachgebaut nach dem Referenzvideo (Privatjet-Seite), ohne Markennamen und ohne Sprecher, komplett auf Deutsch.
Reines HTML, CSS und JavaScript. Keine Bibliothek, kein Build-Schritt.

**Ansehen:** Ordner über einen lokalen Server öffnen, z. B. `python3 -m http.server` im Ordner `vorlagen/luxus-scroll` und dann `http://localhost:8000`.
(Direkt per Doppelklick geht der Globus nicht, weil der Browser die Punkte-Datei dann nicht laden darf.)

## Aufbau der Seite

| Nr. | Abschnitt | Was passiert |
|---|---|---|
| 1 | Fenster-Hero „Mehr als Luxus.“ (Fensterfoto) | Rollo fährt beim Laden in der Scheibe hoch, Licht fällt in die Kabine |
| 2 | Zoom ans Fenster, „Das Erlebnis“ | Scrollen zoomt nah ans Fenster heran, der Rahmen bleibt am Rand sichtbar. Ab „Die Welt gehört Ihnen“ steigt das helle Braun mit weichem Rand über das Foto, der Text hellt sich Wort für Wort auf |
| 3 | „Fliegen mit Klasse.“ | Jet fliegt über die Überschrift, Datenblatt erscheint, Jet wird zum Sitzplan |
| 4 | „Leben an Bord“ | Akkordeon, jedes Thema zeigt ein eigenes Bild |
| 5 | „Ihre Welt“ | Punkt-Globus mit Flugrouten, Städte-Laufband, Bordkarte |
| 6 | „Stimmen unserer Gäste“ | drei laufende Spalten mit Kundenstimmen (am Handy zum Wischen) |
| 7 | „Machen Sie sie außergewöhnlich.“ | Abschluss mit Anfrage-Link |

Unten in der Mitte schwebt immer der Button „Flug planen“. Unten links sitzt ein kleiner Schalter, der alle Bewegungen anhält.

## Für einen neuen Kunden anpassen

1. **Markenname:** In `index.html` überall `MARKE` ersetzen (Logo, Bordkarte, Datenblatt, Fußzeile). Den `<title>` anpassen.
2. **Farben und Schriften:** nur im `:root`-Block oben in `assets/css/style.css`.
3. **Texte:** direkt in `index.html`. Die Sätze sind Beispieltexte für einen Privatjet-Anbieter.
4. **Bilder** in `assets/img` (alles bis 4K, der Browser lädt automatisch die passende Größe):
   - `fenster-foto-2944/2208/1472/736.webp`: das Fensterfoto im Hero (hochkant, größte Fassung 2944 x 5252).
     Beim Scrollen wird bis in die Scheibe gezoomt. Wer ein anderes Foto nimmt, zeichnet die Glasfläche neu:
     `fenster-glas.svg` (Maske für das Rollo) und dieselben Punkte als `GLASS` oben in `assets/js/main.js`
     (Pixel des Originalfotos). `FOCUS_DESK` und `FOCUS_MOBILE` legen fest, welcher Bildpunkt am Ende in der Mitte steht.
     Neue Fassungen in derselben Benennung ablegen und in `SIZES` in `main.js` eintragen. Die Kopfzeile misst selbst,
     wie hell das Foto unter ihr ist, und wechselt dort auf dunkle Schrift. Dafür ist nichts einzustellen.
   - `kabine-1` bis `kabine-4`, je in `-3840`, `-2400`, `-1600`, `-800`: ein Bild pro Akkordeon-Thema, 4:3 (4K = 3840 x 2880).
     Eigene Fotos am besten in 3840 x 2880 liefern und in die vier Größen verkleinern.
   - `jet-1250/2000/3000/4000.webp`: der Jet in Draufsicht mit transparentem Hintergrund (4K = 3200 x 4000), dazu `jet-schatten.webp`.
   - `sitzplan.svg`: der passende Sitzplan. Er nutzt dieselben Koordinaten wie das Jet-Bild und muss deckungsgleich bleiben.
5. **Kundenstimmen:** Abschnitt `#stimmen`. Dort stehen nur Platzhalter. Nur echte Stimmen mit Erlaubnis eintragen, Initialen oder echtes Foto in `voice__avatar`. Die Zeile „Beispielplätze …“ danach löschen.
6. **Kontakt:** Der Link „Flug planen“ im Abschluss zeigt auf `anfrage@example.com`. Echte Adresse oder Formular-Seite eintragen.
7. **Impressum und Datenschutz:** Links in der Fußzeile auf die echten Seiten setzen.
8. **Suchmaschinen:** `<meta name="robots" content="noindex, nofollow">` entfernen, sobald die Seite live gehen soll.
9. **Globus-Routen:** oben in `assets/js/globe.js` (Städte und Verbindungen).
10. **Scroll-Längen und Zoom:** in `assets/css/style.css` bei `.sky__spacer` (Fenster-Zoom bis zum Hellbraun) und `.flight` (Jet und Sitzplan). Wie stark ins Fenster gezoomt wird, steht oben in `assets/js/main.js` als `ZOOM` (1 = bis die Scheibe den ganzen Bildschirm füllt, jetzt 0,7), die Strecke dafür als `ZOOM_LEN`.

## Handy-Ansicht für die Seite /websites/ (`?handy=1`)

Die Seite `/websites/` zeigt diese Vorlage in einem Handy und verspricht daneben: große Schrift statt Zoomen, einen
Knopf zum Anrufen, eine kurze Ladezeit und einen Chatbot. Damit das im Handy stimmt, lädt sie die Vorlage mit
`?handy=1` (Wunsch des Inhabers, 25.11.2026). Dann gilt:

- Lesetext 16px, Beschriftungen ab 12px (nur die Zeile unten auf der Bordkarte hat 10,5px), Knöpfe und Links
  mindestens 44px hoch. Die Schriftarten bleiben.
- Neben „Flug planen“ steht ein Anruf-Knopf (`tel:000000`, für Kunden die echte Nummer eintragen), unten rechts ein
  runder Chat-Knopf. Die Begrüßung des Chatbots zeichnet die Seite `/websites/` darüber.
- Ladezeit am Handy (390px breit, gemessen am 25.11.2026): rund 340 KB, das erste Bild steht sofort.

Ohne `?handy=1` sieht die Vorlage aus wie das Original. Die Regeln stehen am Ende von `assets/css/style.css`
(Abschnitt „Handy-Ansicht“), die beiden Knöpfe vor den Skripten am Ende von `index.html`.

## Woher die Bilder kommen

- **Fensterfoto (Hero):** vom Inhaber geliefert (`_werkzeuge/quellen/fenster-original.jpg`, 736 x 1313). Für 4K mit Real-ESRGAN viermal vergrößert (`_werkzeuge/hochskalieren.py`). Mehr Schärfe als das Original hergibt, ist so nicht möglich: Auf 4K-Bildschirmen wirkt der voll gezoomte Blick etwas weich. Für echte 4K-Schärfe das Foto in mindestens 3000 x 5300 Pixeln besorgen. **Vor dem Einsatz für Kunden klären, dass die Nutzungsrechte an dem Foto vorliegen.**
- **Kabine:** eigene 3D-Szene (Distanzfelder: Sessel, Tische, Fenster mit gerendertem Wolkenhimmel), gerendert und nachbearbeitet. Das sind Visualisierungen. Für echte Kunden besser echte Fotos einsetzen.
- **Jet:** eigenes 3D-Modell (Rumpf, gepfeilte Flügel mit Winglets, Hecktriebwerke, T-Leitwerk) als Shader, in 6000 px Höhe gerendert und für das Web verkleinert. Hochglanz-Schwarz mit Lichtkanten wie im Referenzvideo.
- **Sitzplan, Bordkarte:** eigene Vektorgrafiken.
- **Globus:** Landpunkte aus Natural-Earth-Daten (Paket `world-atlas`, gemeinfrei).
- **Symbole:** eigene Linien-Symbole, das Flugzeug-Symbol aus Lucide (ISC-Lizenz).
- **Schriften:** Cormorant Garamond und Manrope, beide SIL Open Font License (Lizenztexte in `assets/fonts`).

Die Werkzeuge zum Neu-Erzeugen liegen in `_werkzeuge/`:
`hochskalieren.py` (Fensterfoto 4x), `sitzplan_svg.py` (Sitzplan), `render/jet.frag` mit `render/jet.json` und `render/jet_post.py` (Jet rendern und in Web-Größen samt Schatten umwandeln), `render/clouds.frag` (Wolkenhimmel für die Kabinenfenster) und `render/cabin.frag` (Shader), `render/render.cjs` (rendert per Playwright), `render/noise3d.py` (Rauschtextur), `render/post_4k.py` (macht aus den 4K-Renders die Web-Bilder in allen Größen). Die Einstellungen der fertigen Bilder stehen in den `.json`-Dateien daneben. Gerendert wird 1,5-fach größer als 4K und dann verkleinert, damit Kanten sauber sind.

## Technik in Kürze

- `assets/js/main.js` berechnet alle Zustände (Fenster-Zoom, Jet-Flug, Sitzplan-Wischen, Wort-Aufhellen) direkt aus der echten Scrollposition, ohne Nachlauf. So steht man immer genau dort, wo man hingescrollt hat. Weiches Scrollen übernimmt der Browser selbst.
- Abschnitte 1 bis 3 sind „angeheftet“ (`position: sticky`), damit die Szene stehen bleibt, während gescrollt wird. Diese Bühnen sind so hoch wie der Bildschirm bei eingeklappter Adressleiste (`lvh`). Texte und Knöpfe stehen in der kleinen Höhe (`svh`). So bleibt am Handy unten kein dunkler Streifen, und nichts verschwindet hinter der Leiste.
- Der Fenster-Zoom zeichnet das Foto als Textur auf der Grafikkarte (`assets/js/fenster.js`, WebGL2). Er nimmt die kleinste Fassung, die für den stärksten Zoom reicht, am Handy höchstens 2208 x 3939 (Speicher). Ohne WebGL2 übernimmt das `<img>` mit CSS dieselbe Bewegung.
- Die Kopfzeile bekommt einen weichen Hintergrund, wo Text unter ihr durchläuft. Über dem gezoomten Foto liegt ein sanfter dunkler Schleier hinter ihr. Sobald es dort hell wird, wechselt sie auf dunkle Schrift mit hellbraunem Dunst. Gemessen wird an einer winzigen Graustufen-Kopie des Fotos. Die Stufen des hellbraunen Verlaufs stehen zweimal: in `.sky__band::before` (CSS) und als `BAND` in `main.js`. Bei Änderungen beide anpassen.
- Fokusrahmen (Tastatur): 2 px Gold, auf hellen Abschnitten (`data-theme="light"`) und am schwebenden Button über hellen Abschnitten (Klasse `is-light`, gesetzt in `renderTheme` in `main.js`) dunkel, weil Gold auf Creme nur 1,9:1 hat. Der schwebende Button selbst bleibt Gold: Seine Schrift hat 6,35:1, das macht ihn auch auf Creme erkennbar (WCAG 1.4.11).
- Der Globus zeichnet mit der Grafikkarte (WebGL, ohne Bibliothek). Ohne WebGL zeichnet er denselben Globus als Canvas 2D. Er läuft nur, wenn er sichtbar ist.
- Auf sehr großen Bildschirmen (4K ohne Skalierung) wachsen Überschriften, Abstände und kleine Schrift mit.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt ruhige Überblendungen statt Zoom und Flug.

## Flüssiges Scrollen (so viele Bilder pro Sekunde wie möglich)

Die Seite ist darauf gebaut, dass die Grafikkarte die Bewegung übernimmt und der Prozessor kaum etwas tun muss:

- Beim Scrollen ändern sich nur Verschiebung, Größe und Deckkraft fertiger Ebenen. Nichts muss neu gezeichnet oder neu angeordnet werden.
- Der Fenster-Zoom läuft als Textur auf der Grafikkarte. Ein per CSS stark vergrößertes Foto müsste der Browser bei jeder Zoomstufe neu aufbereiten: Das Bild stand dabei bis zu 106 ms still und sprang dann. Jetzt ändern sich pro Bild nur vier Zahlen.
- Weiche Lichter und Schatten sind fertige Bilder statt Effekte, die der Browser in jedem Bild neu rechnen müsste.
- Der Wechsel Jet zu Sitzplan schiebt zwei feste Masken übereinander, statt sie in jedem Bild neu zu berechnen. Die Masken gibt es nur während des Wechsels. Sonst müsste die Grafikkarte den Jet in jedem Bild über ein Zwischenbild zeichnen.
- Beim wortweisen Aufhellen ist jedes Wort eine eigene kleine Ebene: Es ändert sich nur die Deckkraft, nichts wird neu gezeichnet. Die Deckkraft geht höchstens bis 0,999, denn ein Sprung auf genau 1 lässt den Browser alle Ebenen neu aufbauen.
- Die Hero-Schrift bewegt sich nur, solange sie zu sehen ist. Die Kundenstimmen blenden oben und unten mit zwei Farbverläufen aus statt mit einer Maske.
- Positionen der Abschnitte werden einmal gemessen (und bei Größenänderung neu), nie während des Scrollens.
- Globus, Städte-Laufband und Kundenstimmen laufen nur, solange sie zu sehen sind.
- Bildschirme mit 120 Hz bekommen automatisch 120 Bilder pro Sekunde.

Gemessen (Chrome, Rechenzeit pro Bild im Mittel, ohne echte Grafikkarte): Desktop 1440 px etwa 1 bis 2 ms,
Handy 390 px (3-fache Pixeldichte) etwa 1 bis 1,5 ms, 4K etwa 1 bis 2 ms. Für 120 Bilder pro Sekunde stehen 8,3 ms zur Verfügung.
Wartezeit, bis ein neues Bild angezeigt werden kann (95 % aller Bilder, ebenfalls ohne echte Grafikkarte): Fenster-Zoom etwa 6 bis 7 ms,
Jet etwa 4 bis 6 ms. Mit echter Grafikkarte ist beides deutlich kürzer.
Wie auf einem Mittelklasse-Handy (390 px, Prozessor vierfach gedrosselt): Bilder über 16 ms im Fenster-Abschnitt 4,5 % (vorher 7,7 %),
im Jet-Abschnitt 0 % (vorher 4,7 %).

**Beim Anpassen bitte beibehalten:** neue Bewegungen nur über `transform` und `opacity`, keine Filter, Schatten oder Masken,
die sich beim Scrollen ändern, und keine Messungen (`getBoundingClientRect`, `offsetHeight`) im Scroll-Ablauf.

