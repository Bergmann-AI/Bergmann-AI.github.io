# Skills von Bergmann AI für den Website-Bau

Stand: 27.11.2026. Quelle der eigenen Skills. In Claude Code wirken sie in diesem Repo direkt als Projekt-Skills. Für claude.ai und andere Projekte als ZIP hochladen (in den Einstellungen von claude.ai bei den Skills; ein ZIP je Ordner, der Ordnername ist der Skill-Name). Ein hochgeladener Skill mit gleichem Namen wird dabei ersetzt.

| Skill | Wofür | Werkzeuge |
|---|---|---|
| `website-regie` | zuerst laden: wer entscheidet was, Ablauf, Qualitäts-Tor vor „fertig“ | – |
| `website-texte` | Texte schreiben und prüfen, Werberecht | `scripts/texte_pruefen.py` |
| `website-farben` | Farben, die zusammenpassen: aus Logo und Fotos ableiten, Rollen-Leiter hell und dunkel, Kontrast (WCAG und APCA), Farbfehlsichtigkeit | `scripts/farben.py` (aus-bild, bauen, pruefen, inventur, anteil, kontrast) |
| `website-bilder` | scharfe und schnelle Bilder: 2x-Ziel, AVIF/WebP, srcset/sizes, LCP, Farbprofil, GPS-Daten entfernen, Video | `scripts/bilder.py` (pruefen, machen, seite), `scripts/messen.mjs` |
| `3d-website` | 3D-Szenen in sauberer Qualität: Farbmanagement, Tone Mapping, Kantenglättung, Banding, Texturen, Produkt mit AR, three.js-Update | `scripts/szene-pruefen.mjs`, `vorlage/` |
| `ui-feinschliff` | Bewegung, Menüs, Dialoge, Formulare, Fokus, Browser-Oberflächen | – |

Nicht hier (fremde Pakete, unverändert hochgeladen): `impeccable` (Richtung, Verarbeitung, Detektor) und `taste-skill` (Anti-KI-Look, Prüfskripte). Die Regie verbindet sie mit den eigenen Skills.

Voraussetzungen der Skripte: Python 3 mit Pillow (AVIF, WebP) und numpy; Node 22 mit Playwright und Chromium (in Claude-Cloud-Sitzungen vorhanden; sonst `npm i -g playwright && npx playwright install chromium`). Bei global installiertem Playwright `NODE_PATH=$(npm root -g)` vor den Node-Aufruf setzen.
