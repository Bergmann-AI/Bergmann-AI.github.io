# Bergmann AI Website

Website-Arbeit (bauen, umbauen, polieren, prüfen): zuerst den Skill `website-regie` laden, im Skill-Tool z. B. als `anthropic-skills:website-regie` oder als Projekt-Skill `website-regie` aus `.claude/skills/`. Er regelt, wie impeccable, taste-skill, website-texte, website-farben, website-bilder, 3d-website und ui-feinschliff zusammenarbeiten, und setzt das Qualitäts-Tor vor „fertig“.

Die eigenen Skills liegen als Quelle in `.claude/skills/` (Übersicht und Hochladen: `.claude/skills/README.md`). Gibt es einen Skill doppelt (hochgeladen und im Repo), gilt die neuere Fassung im Repo.

Texte (schreiben, umschreiben, kürzen, prüfen, auch einzelne Buttons, Überschriften, FAQ, Meta-Texte): zusätzlich den Skill `website-texte` laden (liegt in `.claude/skills/website-texte/`, nach dem Hochladen in claude.ai z. B. als `anthropic-skills:website-texte`). Prüfskript: `python3 .claude/skills/website-texte/scripts/texte_pruefen.py index.html --anrede sie`. Überschriften-Gerüst: `--gliederung`. Varianten für H1, Buttons und Kernsätze vorsortieren: `--varianten varianten.txt --art h1`.

Farben (wählen, ändern, prüfen, Dunkelmodus): Skill `website-farben`. Prüfen: `python3 -I .claude/skills/website-farben/scripts/farben.py pruefen --css <datei.css>`; Seiten mit hellen und dunklen Abschnitten je Abschnittsart mit `--rollen "bg=…,ink=…"`.

Bilder (Fotos, Logos, Hintergründe, Video, Schärfe, Ladezeit): Skill `website-bilder`. Erzeugen: `python3 -I .claude/skills/website-bilder/scripts/bilder.py machen <foto> --slot <hero|breit|halb|karte|portrait> --name <name> --ziel assets/img`. Im Browser messen: `NODE_PATH=$(npm root -g) node .claude/skills/website-bilder/scripts/messen.mjs index.html`.

3D (Erde auf der Startseite, jede Szene): Skill `3d-website`. Prüfen: `NODE_PATH=$(npm root -g) node .claude/skills/3d-website/scripts/szene-pruefen.mjs index.html --out shots/3d`.
