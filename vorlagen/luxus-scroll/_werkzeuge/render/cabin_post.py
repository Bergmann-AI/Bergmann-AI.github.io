from PIL import Image, ImageFilter
import numpy as np, os  # Aufruf im Ordner mit cabin_1.png ... cabin_4.png
T = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'img')
prev = []
for i in range(1, 5):
    im = Image.open(f'cabin_{i}.png').convert('RGB').resize((1600, 1200), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a.mean(2, keepdims=True)
    bright = np.clip((lum - 0.62) / 0.38, 0, 1) * a
    bimg = Image.fromarray((bright * 255).astype(np.uint8))
    b1 = np.asarray(bimg.filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255.0
    b2 = np.asarray(bimg.filter(ImageFilter.GaussianBlur(48))).astype(np.float32) / 255.0
    a = a + b1 * 0.45 + b2 * 0.35
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2
    a *= (1 - 0.28 * np.clip(r2, 0, 1.6))[..., None]
    a = np.clip(a, 0, 1) ** 1.06
    a[..., 2] *= 0.96
    rng = np.random.default_rng(10 + i)
    g = rng.normal(0, 1, a.shape[:2]).astype(np.float32)
    l = a.mean(2, keepdims=True)
    a = a + g[..., None] * (3.0 / 255.0) * (0.4 + l * (1 - l) * 2.4)
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    out.save(f'{T}/kabine-{i}.webp', quality=80, method=6)
    prev.append(out.resize((640, 480), Image.LANCZOS))
c = Image.new('RGB', (1290, 970), (255, 255, 255))
for k, im in enumerate(prev): c.paste(im, ((k % 2) * 650, (k // 2) * 490))
c.save('cabin_final_sheet.png')
for i in range(1, 5): print(i, os.path.getsize(f'{T}/kabine-{i}.webp') // 1024, 'KB')
