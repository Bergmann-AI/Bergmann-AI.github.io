# Belege für die Bildregeln

Stand: November 2026.

- **2x reicht:** Twitter Engineering, "Capping image fidelity on ultra-high resolution devices" (Mai 2019). Die Apps laden bei Bildschirmen über 2x die 2x-Fassung. 3x und 2x sehen in der App gleich aus, 3x kostet deutlich mehr Daten; viele als 3x verkaufte OLED-Bildschirme lösen Rot und Blau nur mit etwa 1,5x auf. Bericht eines Dritten: rund 33 % schneller, ein Drittel weniger Daten.
  https://blog.x.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices
- **Bildschirme in Deutschland (StatCounter, Juni/Juli 2026):** Desktop: 1920 × 1080 vorn mit rund 25 %. Handy: 414 × 896 (15,7 %), 375 × 812 (13,1 %), 390 × 844 (7,7 %). Daher Prüfbreiten 1440 @2x, 1920 @1x und 390 @3x.
  https://gs.statcounter.com/screen-resolution-stats/desktop/germany , https://gs.statcounter.com/screen-resolution-stats/mobile-tablet/germany
- **Formate:** Jake Archibald, "AVIF has landed" (2020): bei annehmbarer Qualität WebP etwa halb so groß wie JPEG, AVIF deutlich unter WebP. ctrl.blog (gleiche DSSIM): AVIF im Mittel etwa 50 % kleiner als JPEG, WebP etwa 31 %. Qualitätsregler sind zwischen Formaten nicht vergleichbar.
  https://jakearchibald.com/2020/avif-has-landed/ , https://www.ctrl.blog/entry/webp-avif-comparison/
- **Web Almanac 2024, Kapitel Media und Performance (HTTP Archive):** JPEG 32,4 % aller Bilder (2022 noch etwa 40 %), AVIF-Anteil +386 % in zwei Jahren (absolut noch klein, etwa 1 %). LCP-Bild auf dem Desktop zu 61 % JPEG, 7 % WebP. Ein Bild ist auf etwa 68 % der Handy-Seiten das LCP-Element.
  https://almanac.httparchive.org/en/2024/media , https://almanac.httparchive.org/en/2024/performance
- **`sizes="auto"`:** seit Chrome/Edge 126 (Juni 2024) für lazy Bilder; Safari unterstützt es laut caniuse noch nicht. Browser ohne Unterstützung ignorieren `auto` und nehmen den Rest der Liste (so macht es WordPress seit 6.7).
  https://caniuse.com/wf-sizes-auto
- **Lazy Loading und LCP:** web.dev rät, Bilder im ersten Bildschirm nicht lazy zu laden. https://web.dev/articles/lazy-loading-images
- **Core Web Vitals:** LCP gut bis 2,5 s, INP bis 200 ms, CLS bis 0,1 (web.dev).
- **Display P3:** WebKit "Wide Gamut Color in CSS with Display-P3"; iPhone-Kameras speichern Fotos in P3, darum vor dem Web nach sRGB umrechnen oder das Profil behalten. `bilder.py` rechnet um und entfernt danach alle Metadaten.
- **Messenger-Komprimierung:** WhatsApp verkleinert Fotos beim normalen Senden deutlich (Standardeinstellung, seit 2023 wahlweise "HD"); darum Originale per Mail, Cloud oder als Dokument anfordern.
