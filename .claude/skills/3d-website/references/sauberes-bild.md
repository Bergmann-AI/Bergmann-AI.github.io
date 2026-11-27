# Sauberes Bild: Code zu den Regeln aus SKILL.md, Abschnitt 3 und 4

Gilt für three.js mit `WebGLRenderer` (Stand r170 bis r187). Für `WebGPURenderer` gelten dieselben Ziele, die Namen der Nachbearbeitung heißen dort anders (`RenderPipeline`, früher `PostProcessing`).

## Grundeinstellung

```js
import * as THREE from './three.module.min.js';

const canvas = document.querySelector('canvas[data-big-scene]');
const small = matchMedia('(max-width: 760px)').matches;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: Math.min(devicePixelRatio, 2) < 1.5,   // ab 2x reicht die Auflösung, darunter MSAA
  alpha: true,                                      // Seite scheint durch: keine Farbnaht am Rand
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);   // Größe aus CSS (100lvh), nie aus innerHeight
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;   // Produkt, Markenfarben. Atmosphäre: THREE.AgXToneMapping
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
renderer.debug.checkShaderErrors = /[?&]debug\b/.test(location.search);
```

## Texturen richtig einlesen

```js
const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const size = small ? '2k' : '4k';

const farbe = await loader.loadAsync(`assets/3d/holz-${size}.webp`);
farbe.colorSpace = THREE.SRGBColorSpace;      // alles, was man als Farbe sieht
const normalen = await loader.loadAsync(`assets/3d/holz-normal-${size}.webp`);
normalen.colorSpace = THREE.NoColorSpace;     // Daten: Normalen, Rauheit, Metall, Masken, Höhen
for (const t of [farbe, normalen]) {
  t.anisotropy = Math.min(8, maxAniso);       // schräge Flächen bleiben scharf
  t.generateMipmaps = true;                   // kein Flimmern in der Ferne
}
```

Große Bilder ruckelfrei hochladen: `decode` und `stripUploader` aus `vorlage/gpu-upload.js`.

## Licht aus der Umgebung

```js
// Studio-Licht ohne Datei (Addon three/addons/environments/RoomEnvironment.js)
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Oder eine echte HDRI (Poly Haven, CC0, 1k bis 2k). Ab r180 heißt der Loader HDRLoader, davor RGBELoader.
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
const hdr = await new HDRLoader().loadAsync('assets/3d/studio-1k.hdr');
scene.environment = pmrem.fromEquirectangular(hdr).texture;
hdr.dispose();
```

**Addons und `'three'`:** Die Dateien aus `three/examples/jsm` (Addons) importieren `'three'`. Auf statischen Seiten ohne Build-Schritt dafür eine Import-Map vor das erste Modul-Skript setzen und die Addons lokal ablegen:

```html
<script type="importmap">
{ "imports": { "three": "./assets/3d/three.module.min.js", "three/addons/": "./assets/3d/addons/" } }
</script>
```

Hinweise zu Versionen: Ab r181 wirken raue PBR-Materialien heller, ab r183 sitzt `RoomEnvironment` anders, ab r187 rechnet PMREM mit Cube-Render-Targets, ab r188 geben `AmbientLight` und `HemisphereLight` auch Spiegelungen. Nach jedem Update Helligkeit und Reflexionen mit Screenshots vergleichen (`three-update.md`).

## Weiche Schatten ohne Kosten

- Unter ein Produkt eine Fläche mit vorberechnetem, weichem Schatten (Graustufen-PNG oder WebP mit Alpha, `transparent: true`, `depthWrite: false`). Kostet nichts, sieht besser aus als ein harter Echtzeit-Schatten.
- Echtzeit-Schatten nur, wenn sich Licht oder Objekt wirklich bewegen; dann `PCFShadowMap` (ist seit r182 selbst weich; `PCFSoftShadowMap` ist veraltet), kleine Shadow-Map (1024), enge Schattenkamera.
- Ambient Occlusion in die Textur backen (Blender), nicht live rechnen.

## Nachbearbeitung mit HalfFloat und Tone Mapping am Ende

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const dpr = Math.min(devicePixelRatio, 2);
const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: dpr < 1.5 ? 4 : 0 });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.4, 0.9));   // Stärke, Radius, Schwelle hoch
composer.addPass(new OutputPass());          // Tone Mapping und sRGB passieren hier, nur einmal
if (dpr < 1.5) composer.addPass(new SMAAPass());
```

Die Erde-Vorlage nutzt statt `UnrealBloomPass` den eigenen leichten `vorlage/bloom.js` (Float-Ziel, weiche Lichterschulter, 3 bis 4 Stufen, am Handy weniger).

## Banding wegbekommen

```glsl
// am Ende jedes eigenen Fragment-Shaders, der Verläufe oder dunkle Flächen zeichnet
float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));   // Interleaved Gradient Noise
gl_FragColor.rgb += (n - 0.5) / 255.0;
```

Für Standard-Materialien reicht `material.dithering = true`. Render-Ziele für Glow, Nebel und Himmel immer `HalfFloatType`.

## Hintergrund ohne Naht

- Bester Weg: `alpha: true` und `setClearColor(0x000000, 0)`, die Seite liefert die Farbe. Glow mit additivem Blending wirkt auf transparentem Grund wie Licht auf der Seite.
- Muss die Szene einen eigenen Hintergrund haben: Die Farbe wird vom Tone Mapping mit verändert. Hintergrund dann als letzten Schritt nach `OutputPass` zeichnen oder Tone Mapping auf `NoToneMapping` und das Bild selbst tonen. Kontrolle: Pixel am Leinwandrand gegen die CSS-Farbe der Seite (`farben.py kontrast` zeigt die Werte).

## Kanten und feine Linien

- Linien, Gitter, Bahnen als dünne Geometrie (Röhre, Band) oder als Distanzfeld im Shader mit `fwidth()` für weiche, gleichmäßige Kanten:

```glsl
float d = abs(fract(vUv.x * 40.0) - 0.5);
float w = fwidth(vUv.x * 40.0);
float line = 1.0 - smoothstep(0.0, w * 1.5, d);
```

- Glänzende Kleinteile flimmern, wenn sie kleiner als ein Pixel werden: Rauheit in der Ferne leicht anheben oder Detail weglassen.

## Auflösung der Szene getrennt vom Text

Text und Bedienelemente liegen als HTML über der Leinwand und sind immer gestochen scharf. Die Szene darf intern niedriger rendern (Desktop 1,75, Handy 1,5, Regler bis etwa 0,55) und wird hochskaliert, ohne dass es auffällt, solange Kanten weich sind und kein Text in der Szene steht. Schrift, die in der Szene stehen muss: als Distanzfeld (Vorlage `film.js`).

## Kontrolle im Bild

Nach `szene-pruefen.mjs` je Screenshot: Kanten ohne Treppen? Dunkle Verläufe ohne Stufen? Farben des Produkts wie auf dem Foto? Lichter nicht ausgebrannt (Tone Mapping)? Rand der Leinwand ohne Farbsprung zur Seite?
