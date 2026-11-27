# three.js aktualisieren (r170 → r187)

Stand: 27.11.2026. Neueste Version r187 (npm `three@0.187.0`, 30.10.2026). Im Migrations-Wiki steht schon ein Abschnitt 187 → 188 (noch nicht veröffentlicht). Quelle: github.com/mrdoob/three.js/releases und Wiki "Migration Guide".

## Geprüft

Die Erde-Vorlage (`vorlage/scene.js`, eigene Shader, eigener Bloom, kein PBR) läuft mit r187 ohne Codeänderung: keine Konsolenfehler, Screenshots bei Scroll 0, 0,1 und 1 praktisch gleich wie mit r170 (mittlere Pixelabweichung unter 0,5 von 255), no-3d-Gegenprobe und Layout-Shift unverändert. Gemessen mit `scripts/szene-pruefen.mjs` am 27.11.2026.

## Neue Dateistruktur

- Ab r171 besteht three.js aus `build/three.module.js` + `build/three.core.js` (plus `three.webgpu.js`, `three.tsl.js` für WebGPU).
- r187 liefert **keine `.min.js`** mehr. Für statische Seiten einmal zu einer Datei bündeln, damit alle Importe `./three.module.min.js` bleiben:

```bash
npm pack three@0.187.0 && tar xzf three-0.187.0.tgz
npx esbuild@0.25.0 package/build/three.module.js --bundle --format=esm --minify --outfile=assets/3d/three.module.min.js
cp package/LICENSE assets/3d/three-LICENSE.txt
```

Ergebnis: 731 KB, gzip 185 KB (r170: gzip 167 KB).
- Addons (`examples/jsm`) importieren `'three'`: Import-Map setzen (`sauberes-bild.md`).

## Was bricht, wenn man es benutzt

| Ab | Änderung |
|---|---|
| r171 | Importe für WebGPU: `three/webgpu`, `three/tsl`; TSL-Blend-Funktionen umbenannt (`blendScreen` usw.) |
| r174 | `Timer` nutzt die Page Visibility API nicht mehr selbst: `timer.connect(document)` |
| r175 | `Controls.connect()` erwartet ein DOM-Element; `SMAAPass` ohne `width`/`height` im Konstruktor |
| r176 | `CapsuleGeometry`: `length` heißt `height`; GLTFLoader erkennt WebP/AVIF nicht mehr selbst |
| r177 | `ColorManagement.fromWorkingColorSpace()` → `workingToColorSpace()`, `toWorkingColorSpace()` → `colorSpaceToWorking()` |
| r178 | `MultiplyBlending` und `SubtractiveBlending` brauchen `premultipliedAlpha = true` |
| r179 | `reverseDepthBuffer` → `reversedDepthBuffer` |
| r180 | `RGBELoader` → `HDRLoader`, `RGBMLoader` entfernt; Shader-Defines `USE_LOGDEPTHBUF` → `USE_LOGARITHMIC_DEPTH_BUFFER` |
| r181 | `KTX2Loader.detectSupportAsync()` veraltet: `detectSupport()` nach `await renderer.init()` |
| r182 | `PCFSoftShadowMap` (WebGL) veraltet, `PCFShadowMap` ist jetzt weich |
| r183 | WebGPU: `PostProcessing` → `RenderPipeline` |
| r184 | `FileLoader.load()` und `ImageBitmapLoader.load()` geben nichts mehr zurück: `onLoad` nutzen |
| r185 | `DRACOExporter.parse()` → `parseAsync()` |
| r186 | `Source` → `TextureSource`; neues `Object3D.dispose()` (eigene Unterklassen rufen `super.dispose()`); `Sky`-Uniform `up` entfernt |
| r187 | `CubeUVReflectionMapping` entfernt; `setViewport()`/`setScissor()` skalieren mit gebundenem Render-Target nicht mehr mit pixelRatio |
| r188 (angekündigt) | `LightProbe` veraltet und ohne Wirkung, `iblIrradiance` entfernt |

## Was anders aussieht (kein Fehler, aber Bild prüfen)

- r181: raue PBR-Materialien (Rauheit über 0,5) werden heller, bessere indirekte Spiegelung.
- r183: `RoomEnvironment` anders positioniert; alter Gamma-Pfad bei `Sky` entfernt; WebGPU-Schatten: Bias eventuell verringern.
- r184: Hintergrund und Environment-Map drehen mit der Objektdrehung.
- r185: `GTAONode` dunkler (Radius, Stärke senken).
- r187: PMREM auf Cube-Render-Targets, Reflexionen ändern sich leicht.
- r188 (angekündigt): `AmbientLight` und `HemisphereLight` geben auch Spiegelungen, Fülllichter neben einer Environment-Map eventuell schwächer stellen.

## Vorgehen

1. In Schritten von etwa 10 Versionen aktualisieren (Empfehlung des Wikis), z. B. r170 → r180 → r187.
2. Vorher und nachher `szene-pruefen.mjs` mit denselben Punkten laufen lassen und die Screenshots vergleichen (Pixel-Differenz mit PIL oder nebeneinander ansehen).
3. WebGPU (`WebGPURenderer`) nur, wenn ein Effekt es wirklich braucht (Compute, sehr viele Partikel). WebGPU läuft in Chrome/Edge seit 113, Safari seit 26, Firefox unter Windows seit 141 und auf Apple-Silicon-Macs seit 145; Linux und Android in Firefox noch in Arbeit. `WebGLRenderer` bleibt gepflegt und ist für reine WebGL-2-Szenen weiter die Empfehlung des Handbuchs; der Rückfall auf WebGL muss immer da sein.
