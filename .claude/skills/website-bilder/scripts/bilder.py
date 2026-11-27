#!/usr/bin/env python3
"""Bilder für Websites prüfen und in allen Größen erzeugen (Skill website-bilder).

Braucht Pillow (mit AVIF und WebP) und numpy. Immer mit python3 -I aufrufen.

Befehle:
  pruefen <bild|ordner> [--slot hero|breit|halb|karte|portrait|logo]
      Kundenfotos vor dem Einbau prüfen: Pixel, Schärfe, Farbprofil, GPS-Daten, Drehung, ob sie für den Platz reichen.
  machen <bild> --slot <slot> --name <name> --ziel <ordner> [--format 16:9] [--fokus 0.5,0.4]
         [--alt "Text"] [--sizes "..."] [--max 2880] [--qualitaet normal|hoch]
      Erzeugt AVIF und WebP in allen nötigen Breiten (nie größer als das Original), sRGB, ohne Metadaten,
      leicht nachgeschärft, und druckt den fertigen <picture>-Baustein mit sizes, width/height und Ladeverhalten.
  seite <index.html>
      Liest das HTML ohne Browser: fehlende width/height, srcset, sizes, alt, lazy am ersten Bild, schwere Dateien.
      Die Messung im Browser (was wirklich geladen wird, Unschärfe, Überdimensionierung) macht messen.mjs.

Plätze (Slots) und ihre größte Anzeigebreite in CSS-Pixeln bei 1440 Breite:
  hero     volle Breite (100vw)         Breiten 640 … 2880
  breit    Inhaltsbreite (bis ~1200px)   Breiten 640 … 2400
  halb     halbe Spalte (bis ~720px)     Breiten 400 … 1440
  karte    Drittel/Viertel (bis ~460px)  Breiten 320 … 960
  portrait Team, Kopf (bis ~400px)       Breiten 300 … 800
  logo     lieber SVG; Raster in 1x/2x der Anzeigehöhe
Ziel ist höchstens 2-fache Pixeldichte: mehr sieht man nicht, es kostet nur Daten (Twitter-Messung 2019).
"""
import json
import math
import os
import re
import sys
from html.parser import HTMLParser

SLOTS = {
    'hero':     {'css': 1440, 'widths': [640, 960, 1280, 1600, 1920, 2560, 2880], 'sizes': '100vw'},
    'breit':    {'css': 1200, 'widths': [640, 960, 1280, 1600, 2000, 2400], 'sizes': '(min-width: 1280px) 1200px, calc(100vw - 32px)'},
    'halb':     {'css': 720,  'widths': [400, 640, 960, 1200, 1440], 'sizes': '(min-width: 1280px) 600px, (min-width: 820px) 50vw, calc(100vw - 32px)'},
    'karte':    {'css': 460,  'widths': [320, 480, 640, 960], 'sizes': '(min-width: 1280px) 400px, (min-width: 820px) 33vw, calc(100vw - 32px)'},
    'portrait': {'css': 400,  'widths': [300, 450, 600, 800], 'sizes': '(min-width: 820px) 300px, 50vw'},
    'logo':     {'css': 240,  'widths': [240, 480], 'sizes': '240px'},
}
# Qualität: AVIF und WebP sind nicht vergleichbar skaliert. Werte so gewählt, dass Fotos bei 2x ohne sichtbare Artefakte bleiben.
QUALITY = {'normal': {'avif': 55, 'webp': 80}, 'hoch': {'avif': 68, 'webp': 88}}


def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def load(path):
    from PIL import Image, ImageOps
    im = Image.open(path)
    info = {'format': im.format, 'mode': im.mode, 'size_raw': im.size}
    exif = im.getexif()
    info['orientation'] = exif.get(0x0112, 1) if exif else 1
    gps = exif.get_ifd(0x8825) if exif else {}
    info['gps'] = bool(gps)
    info['icc'] = im.info.get('icc_profile')
    im = ImageOps.exif_transpose(im)
    return im, info


def to_srgb(im, icc):
    """Bild ins sRGB bringen. Fotos aus iPhones sind oft Display P3: ohne Umrechnung wirken sie im Browser blass oder falsch."""
    from PIL import ImageCms
    import io
    has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if has_alpha else 'RGB')
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = ImageCms.getProfileDescription(src).strip()
            if 'srgb' not in desc.lower():
                dst = ImageCms.createProfile('sRGB')
                if has_alpha:
                    rgb, a = im.convert('RGB'), im.getchannel('A')
                    rgb = ImageCms.profileToProfile(rgb, src, dst, renderingIntent=0, outputMode='RGB')
                    rgb.putalpha(a)
                    return rgb, desc
                return ImageCms.profileToProfile(im, src, dst, renderingIntent=0, outputMode='RGB'), desc
            return im, desc
        except Exception as e:  # kaputtes Profil: lieber weiter als abbrechen
            return im, f'unlesbar ({e.__class__.__name__})'
    return im, None


def sharpness(im):
    """Schärfe als Varianz des Laplace-Filters auf einer 1000px-Fassung (größer = schärfer)."""
    import numpy as np
    g = im.convert('L')
    g.thumbnail((1000, 1000))
    a = np.asarray(g, dtype=np.float32)
    lap = (-4 * a[1:-1, 1:-1] + a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:])
    return float(lap.var())


def exposure(im):
    import numpy as np
    g = np.asarray(im.convert('L').resize((256, 256)), dtype=np.float32) / 255
    return float((g < 0.02).mean()), float((g > 0.98).mean()), float(g.mean())


def check_file(path, slot=None):
    rows = []
    try:
        im, info = load(path)
    except Exception as e:
        return [('FAIL', f'{path}: nicht lesbar ({e})')]
    w, h = im.size
    mp = w * h / 1e6
    rows.append(('INFO', f'{os.path.basename(path)}: {w} x {h} px ({mp:.1f} MP), {info["format"]}, {os.path.getsize(path) // 1024} KB'))
    if info['gps']:
        rows.append(('WARN', 'GPS-Daten im Bild: beim Verkleinern werden sie entfernt (machen), Original nie direkt hochladen'))
    if info['orientation'] not in (1, None):
        rows.append(('INFO', f'EXIF-Drehung {info["orientation"]}: wird beim Verarbeiten angewandt'))
    _, desc = to_srgb(im, info['icc'])
    if desc and 'srgb' not in desc.lower():
        rows.append(('INFO', f'Farbprofil "{desc}": wird nach sRGB umgerechnet'))
    s = sharpness(im)
    lvl = 'WARN' if s < 60 else 'OK'
    rows.append((lvl, f'Schärfe {s:.0f}' + (' – weich oder verwackelt: nicht für große Plätze, besser ein anderes Foto' if s < 60 else '')))
    dark, bright, mean = exposure(im)
    if dark > 0.25:
        rows.append(('WARN', f'{dark * 100:.0f} % fast schwarz: zu dunkel oder bewusst dunkles Motiv? prüfen'))
    if bright > 0.20:
        rows.append(('WARN', f'{bright * 100:.0f} % ausgefressen weiß: Lichter fehlen'))
    slots = [slot] if slot else ['hero', 'breit', 'halb', 'karte']
    fits = []
    for sl in slots:
        need2 = SLOTS[sl]['css'] * 2
        need1 = SLOTS[sl]['css'] * 1.25
        if w >= need2:
            fits.append(f'{sl} (scharf bis 2x)')
        elif w >= need1:
            fits.append(f'{sl} (scharf bis {w / SLOTS[sl]["css"]:.1f}x)')
        elif slot:
            rows.append(('FAIL', f'zu klein für {sl}: braucht mindestens {int(need1)} px Breite, besser {need2} px'))
    if fits:
        rows.append(('OK', 'reicht für: ' + ', '.join(fits)))
    if slot == 'hero' and w < 1920:
        rows.append(('WARN', 'Hero unter 1920 px: auf großen Bildschirmen weich. Hochskalieren nur als Notlösung (references/hochskalieren.md)'))
    return rows


def cmd_pruefen():
    target = sys.argv[2]
    slot = arg('--slot')
    files = []
    if os.path.isdir(target):
        for root, _, names in os.walk(target):
            for n in sorted(names):
                if n.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.tif', '.tiff')):
                    files.append(os.path.join(root, n))
    else:
        files = [target]
    fails = 0
    for f in files:
        for lvl, text in check_file(f, slot):
            print(f'{lvl:4}  {text}')
            fails += lvl == 'FAIL'
        print()
    print(f'Ergebnis: {len(files)} Bilder, {fails} FAIL')
    return 1 if fails else 0


def crop_to(im, ratio, focus):
    if not ratio:
        return im
    a, b = (float(x) for x in re.split('[:/x]', ratio))
    want = a / b
    w, h = im.size
    fx, fy = focus
    if w / h > want:   # zu breit
        nw = round(h * want)
        x0 = min(max(0, round(fx * w - nw / 2)), w - nw)
        return im.crop((x0, 0, x0 + nw, h))
    nh = round(w / want)
    y0 = min(max(0, round(fy * h - nh / 2)), h - nh)
    return im.crop((0, y0, w, y0 + nh))


def resize_sharp(im, width):
    from PIL import Image, ImageFilter
    w, h = im.size
    if width >= w:
        return im.copy()
    height = round(h * width / w)
    out = im.resize((width, height), Image.LANCZOS, reducing_gap=3.0)
    factor = w / width
    # Nach starkem Verkleinern wirkt ein Foto weich: leicht nachschärfen, Rauschen nicht verstärken
    amount = 35 if factor < 1.5 else 55 if factor < 3 else 70
    if out.mode == 'RGBA':
        rgb, a = out.convert('RGB'), out.getchannel('A')
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.7, percent=amount, threshold=2))
        rgb.putalpha(a)
        return rgb
    return out.filter(ImageFilter.UnsharpMask(radius=0.7, percent=amount, threshold=2))


def avg_color(im):
    import numpy as np
    a = np.asarray(im.convert('RGB').resize((32, 32)), dtype=np.float64) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).mean((0, 1))
    srgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return '#' + ''.join('%02x' % int(round(c * 255)) for c in srgb)


def cmd_machen():
    src = sys.argv[2]
    slot = arg('--slot', 'breit')
    name = arg('--name') or os.path.splitext(os.path.basename(src))[0]
    out = arg('--ziel', '.')
    ratio = arg('--format')
    focus = tuple(float(x) for x in arg('--fokus', '0.5,0.5').split(','))
    q = QUALITY[arg('--qualitaet', 'normal')]
    alt = arg('--alt', '')
    os.makedirs(out, exist_ok=True)
    im, info = load(src)
    im, desc = to_srgb(im, info['icc'])
    im = crop_to(im, ratio, focus)
    w, h = im.size
    cap = int(arg('--max', SLOTS[slot]['widths'][-1]))
    widths = [x for x in SLOTS[slot]['widths'] if x <= min(w, cap)]
    if not widths or (widths[-1] < min(w, cap) and min(w, cap) - widths[-1] > 160):
        widths.append(min(w, cap))   # das Original als größte Stufe, wenn es zwischen zwei Stufen liegt
    widths = sorted(set(widths))
    need = SLOTS[slot]['css'] * 2
    if w < need:
        print(f'WARN  Original {w} px ist schmaler als 2x des Platzes ({need} px): auf scharfen Bildschirmen etwas weich. '
              'Nicht hochskalieren, außer als bewusste Notlösung.')
    total = {'avif': 0, 'webp': 0}
    files = []
    for width in widths:
        r = resize_sharp(im, width)
        hh = r.size[1]
        for fmt, ext in (('AVIF', 'avif'), ('WEBP', 'webp')):
            fn = f'{name}-{width}.{ext}'
            path = os.path.join(out, fn)
            if fmt == 'AVIF':
                r.save(path, 'AVIF', quality=q['avif'], speed=5)
            else:
                r.save(path, 'WEBP', quality=q['webp'], method=6)
            size = os.path.getsize(path)
            total[ext] += size
            files.append((fn, width, hh, size))
    W, H = w if w <= cap else cap, round(h * min(w, cap) / w)
    rel = arg('--pfad', out.rstrip('/'))
    sizes = arg('--sizes', SLOTS[slot]['sizes'])
    av = ', '.join(f'{rel}/{name}-{x}.avif {x}w' for x in widths)
    wb = ', '.join(f'{rel}/{name}-{x}.webp {x}w' for x in widths)
    mid = min(widths, key=lambda x: abs(x - SLOTS[slot]['css']))
    load_attr = 'fetchpriority="high"' if slot == 'hero' else 'loading="lazy" decoding="async"'
    color = avg_color(im)
    snippet = f'''<picture>
  <source type="image/avif" srcset="{av}" sizes="{sizes}">
  <source type="image/webp" srcset="{wb}" sizes="{sizes}">
  <img src="{rel}/{name}-{mid}.webp" width="{W}" height="{H}" alt="{alt}" {load_attr}
       style="background:{color}">
</picture>'''
    print('Dateien:')
    for fn, ww, hh, size in files:
        print(f'  {fn:40} {ww} x {hh}  {size // 1024} KB')
    print(f'Summe AVIF {total["avif"] // 1024} KB, WebP {total["webp"] // 1024} KB')
    big = [f for f in files if f[0].endswith('.avif') and f[1] <= 1600 and f[3] > 350 * 1024]
    if big:
        print('WARN  AVIF bis 1600 px über 350 KB: sehr detailreich oder verrauscht; --qualitaet normal lassen, ggf. entrauschen')
    print('\nBaustein:\n' + snippet)
    if slot == 'hero':
        print('\nHero: nie lazy laden. Liegt das Bild im CSS (background-image), zusätzlich vorladen:\n'
              f'<link rel="preload" as="image" type="image/avif" imagesrcset="{av}" imagesizes="{sizes}" fetchpriority="high">')
    if not alt:
        print('\nHinweis: alt-Text fehlt. Beschreibt, was zu sehen ist und warum es dort steht (website-texte); '
              'rein schmückende Bilder bekommen alt="".')
    meta = {'name': name, 'slot': slot, 'widths': widths, 'width': W, 'height': H, 'color': color, 'sizes': sizes,
            'source': os.path.basename(src), 'profile': desc}
    with open(os.path.join(out, f'{name}.bild.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    return 0


class ImgParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.imgs, self.sources, self.in_picture, self.preloads = [], [], 0, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'picture':
            self.in_picture += 1
            self.sources = []
        elif tag == 'source' and self.in_picture:
            self.sources.append(a)
        elif tag == 'img':
            a['_sources'] = list(self.sources) if self.in_picture else []
            a['_line'] = self.getpos()[0]
            self.imgs.append(a)
        elif tag == 'link' and a.get('rel') == 'preload' and a.get('as') == 'image':
            self.preloads.append(a)

    def handle_endtag(self, tag):
        if tag == 'picture':
            self.in_picture = max(0, self.in_picture - 1)


def cmd_seite():
    path = sys.argv[2]
    base = os.path.dirname(os.path.abspath(path))
    p = ImgParser()
    p.feed(open(path, encoding='utf-8').read())
    fails = warns = 0

    def out(lvl, text):
        nonlocal fails, warns
        fails += lvl == 'FAIL'
        warns += lvl == 'WARN'
        print(f'{lvl:4}  {text}')
    if not p.imgs:
        print('keine <img> gefunden')
        return 0
    for i, a in enumerate(p.imgs):
        src = a.get('src', '')
        where = f'Zeile {a["_line"]} {src[:60]}'
        if src.startswith('data:'):
            continue
        if 'alt' not in a:
            out('FAIL', f'{where}: alt fehlt (Pflicht; schmückende Bilder alt="")')
        if not (a.get('width') and a.get('height')) and not src.endswith('.svg'):
            out('FAIL', f'{where}: width/height fehlen: die Seite springt beim Laden (CLS)')
        has_srcset = a.get('srcset') or any(s.get('srcset') for s in a['_sources'])
        file = os.path.join(base, src.split('?')[0]) if src and not src.startswith(('http', '//')) else None
        size = os.path.getsize(file) if file and os.path.exists(file) else None
        if not has_srcset and not src.endswith('.svg'):
            lvl = 'WARN' if (size or 0) > 60 * 1024 else 'INFO'
            out(lvl, f'{where}: kein srcset; jedes Gerät lädt dieselbe Größe' + (f' ({size // 1024} KB)' if size else ''))
        if has_srcset and 'w' in (a.get('srcset') or a['_sources'][0].get('srcset', '')) and \
                not (a.get('sizes') or any(s.get('sizes') for s in a['_sources'])):
            out('FAIL', f'{where}: srcset mit Breiten, aber ohne sizes: der Browser nimmt 100vw und lädt zu groß')
        if i == 0 and a.get('loading') == 'lazy':
            out('WARN', f'{where}: das erste Bild ist lazy; ist es im ersten Bildschirm (LCP), verzögert das die Seite')
        if a.get('fetchpriority') == 'high' and a.get('loading') == 'lazy':
            out('FAIL', f'{where}: fetchpriority="high" und lazy widersprechen sich')
        if size and size > 400 * 1024:
            out('WARN', f'{where}: {size // 1024} KB groß')
        if src.lower().endswith(('.jpg', '.jpeg', '.png')) and not a['_sources']:
            out('INFO', f'{where}: altes Format ohne AVIF/WebP-Quelle (machen erzeugt beide)')
    highs = [a for a in p.imgs if a.get('fetchpriority') == 'high']
    if len(highs) > 1:
        out('WARN', f'{len(highs)} Bilder mit fetchpriority="high": nur das eine Hauptbild im ersten Bildschirm')
    print(f'\nErgebnis: {len(p.imgs)} Bilder, {fails} FAIL, {warns} WARN. Im Browser messen: node messen.mjs {path}')
    return 1 if fails else 0


def main():
    if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
        print(__doc__)
        return 0
    return {'pruefen': cmd_pruefen, 'machen': cmd_machen, 'seite': cmd_seite}.get(sys.argv[1], lambda: (print(__doc__), 2)[1])()


if __name__ == '__main__':
    sys.exit(main())
