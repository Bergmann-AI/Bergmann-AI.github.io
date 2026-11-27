# Rezepte

Stand November 2026. Versionen aus npm geprüft: three 0.187.0, @google/model-viewer 4.4.0, @gltf-transform/cli 4.5.1, gsap 3.15.1, @sparkjsdev/spark 2.4.0. Alles lokal ablegen, kein CDN.

## A. Produkt drehbar, mit AR am Handy (`<model-viewer>`)

Für Art product: ein echtes Modell, frei drehbar, am Handy "In meinem Raum ansehen" (Android: Scene Viewer oder WebXR, braucht ARCore; iPhone: Quick Look mit USDZ, das model-viewer selbst erzeugt, wenn `ios-src` fehlt).

```html
<script type="module" src="assets/vendor/model-viewer.min.js"></script>  <!-- aus @google/model-viewer/dist -->
<model-viewer src="assets/3d/stuhl.glb" poster="assets/img/stuhl-poster-1280.webp"
  alt="Der Stuhl Modell Anna in Eiche, frei drehbar"
  camera-controls touch-action="pan-y" interaction-prompt="none"
  tone-mapping="neutral" environment-image="neutral" exposure="1"
  shadow-intensity="1" shadow-softness="0.9"
  ar ar-modes="webxr scene-viewer quick-look"
  loading="lazy" reveal="auto"
  style="width:100%; aspect-ratio: 4 / 3; background: var(--surface)">
</model-viewer>
```

- `poster` ist ein echtes Standbild des Modells (Rezept C), damit vor dem Laden nichts leer ist und die Seite nicht springt.
- `touch-action="pan-y"`: Senkrechtes Wischen scrollt die Seite weiter, nur waagerecht dreht das Modell.
- Kein automatisches Drehen ohne Pause-Möglichkeit; wenn, dann langsam und nur bis zur ersten Berührung.
- Gewicht: das Modell nach Rezept B unter etwa 3 bis 5 MB, Texturen 2048.

## B. glTF fürs Web vorbereiten

```bash
npx @gltf-transform/cli@4.5.1 inspect modell.glb                     # Dreiecke, Texturen, Größe ansehen
npx @gltf-transform/cli@4.5.1 optimize modell.glb modell-web.glb \
    --compress meshopt --texture-compress webp --texture-size 2048 \
    --simplify true --simplify-error 0.0005 --join true --instance true
```

- `--texture-compress ktx2` statt `webp` spart Grafikspeicher (etwa 75 % gegenüber PNG/JPEG) und lädt ruckelfreier, braucht aber das Programm `ktx` (KTX-Software) im Pfad. ETC1S für Farbe, UASTC für Normalen.
- Im Code dazu die Decoder lokal ablegen (`examples/jsm/libs/basis/` aus dem three-Paket nach `assets/3d/basis/` kopieren, `meshopt_decoder.module.js` nach `assets/3d/addons/libs/`):

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const ktx2 = new KTX2Loader().setTranscoderPath('assets/3d/basis/').detectSupport(renderer);   // ab r181 detectSupport nach dem Renderer-Start
const gltf = await new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder).loadAsync('assets/3d/modell-web.glb');
```

- Richtwerte Handy: unter etwa 100 Draw Calls, Dreiecke so wenig, dass die Silhouette rund bleibt (oft 50 000 bis 300 000 reichen), Texturen 2048.
- Herkunft des Modells im Bericht nennen (Hersteller-CAD, Scan, selbst gebaut).

## C. Vorgerenderte Standbilder (schärfste und leichteste Lösung)

Wenn niemand das Objekt drehen muss: rendern statt live zeichnen.

- Mit den Werkzeugen im Repo Bergmann AI (`vorlagen/luxus-scroll/_werkzeuge/render/`: Shader rendern per Playwright in Kacheln, `post_4k.py` verkleinert in Web-Größen) oder in Blender (Cycles, Ansicht "AgX", Entrauschen an).
- **1,5-fach größer rendern** als die größte Ausgabe, dann verkleinern: saubere Kanten ohne Kantenglättung.
- In 16 Bit speichern, erst beim Ausliefern komprimieren: `bilder.py machen render.png --slot hero` (website-bilder).
- Leichtes Filmkorn (1 bis 2 %), wenn Renders neben Fotos stehen, damit sie nicht "zu glatt" wirken.

## D. Scroll-Film ohne Live-3D

- **Bildfolge auf Canvas:** 60 bis 120 Bilder (AVIF/WebP, Handy 1080 breit, Desktop 1920), Bild je nach Scroll-Wert zeichnen. Erst jedes vierte Bild laden, dann auffüllen; `createImageBitmap` zum Dekodieren. Gewicht vorher rechnen: 100 Bilder × 60 KB = 6 MB.
- **Video:** nur mit Schlüsselbild in jedem Bild (`ffmpeg … -g 1`), sonst ruckelt das Zurückspulen. Größer als normales Video, dafür ein einziger Download.
- Unter `prefers-reduced-motion` ein Standbild statt Film.

## E. Echter 3D-Scan eines Raums (Gaussian Splatting), nur auf Wunsch

- Für Hotel, Ferienwohnung, Studio, Showroom, wenn der Kunde einen "virtuellen Rundgang" möchte. Echte Aufnahme statt Fotomontage.
- Aufnahme mit einer Scan-App am Handy, Export als `.spz` (kompaktes Format). Anzeige mit Spark (`@sparkjsdev/spark`, Version 2.x, auf three.js, liest SPZ bis Version 4, lädt große Szenen stufenweise).
- Eigener Abschnitt mit Standbild und Knopf "Rundgang starten"; erst dann laden (oft 5 bis 30 MB). Nie als Hintergrund hinter Text, nie auf dem ersten Bildschirm.
- Vorher mit dem Kunden klären, dass im Scan keine Personen, Dokumente oder Kennzeichen zu sehen sind (Datenschutz).

## F. Gerät mit echtem Bildschirm: lieber HTML als 3D

Ein Handy oder Laptop, auf dem eine Website läuft, wirkt als HTML-Rahmen mit echtem Inhalt schärfer und leichter als eine 3D-Textur (Beispiel `websites/assets/js/handy.js` im Repo Bergmann AI). 3D lohnt sich erst, wenn das Gerät sich wirklich dreht oder zerlegt.
