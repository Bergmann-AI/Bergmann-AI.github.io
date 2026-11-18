# Tileable 3D noise texture (128^3, RGBA8):
# R = Perlin-Worley (billowy base), G/B/A = Worley at 3 frequencies (detail erosion)
import numpy as np
N = 128
rng = np.random.default_rng(7)
g = np.arange(N) / N
X, Y, Z = np.meshgrid(g, g, g, indexing='ij')

def perlin(period, seed):
    r = np.random.default_rng(seed)
    grads = r.normal(size=(period, period, period, 3))
    grads /= np.linalg.norm(grads, axis=-1, keepdims=True)
    px, py, pz = X * period, Y * period, Z * period
    ix, iy, iz = np.floor(px).astype(int), np.floor(py).astype(int), np.floor(pz).astype(int)
    fx, fy, fz = px - ix, py - iy, pz - iz
    fade = lambda t: t * t * t * (t * (t * 6 - 15) + 10)
    u, v, w = fade(fx), fade(fy), fade(fz)
    out = 0
    acc = {}
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                gv = grads[(ix + dx) % period, (iy + dy) % period, (iz + dz) % period]
                d = gv[..., 0] * (fx - dx) + gv[..., 1] * (fy - dy) + gv[..., 2] * (fz - dz)
                acc[(dx, dy, dz)] = d
    lerp = lambda a, b, t: a + (b - a) * t
    x00 = lerp(acc[(0,0,0)], acc[(1,0,0)], u); x10 = lerp(acc[(0,1,0)], acc[(1,1,0)], u)
    x01 = lerp(acc[(0,0,1)], acc[(1,0,1)], u); x11 = lerp(acc[(0,1,1)], acc[(1,1,1)], u)
    y0 = lerp(x00, x10, v); y1 = lerp(x01, x11, v)
    return lerp(y0, y1, w)  # roughly [-0.9, 0.9]

def worley(period, seed):
    r = np.random.default_rng(seed)
    pts = r.random((period, period, period, 3))
    px, py, pz = X * period, Y * period, Z * period
    ix, iy, iz = np.floor(px).astype(int), np.floor(py).astype(int), np.floor(pz).astype(int)
    best = np.full(X.shape, 10.0)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx, cy, cz = ix + dx, iy + dy, iz + dz
                fp = pts[cx % period, cy % period, cz % period]
                ddx = cx + fp[..., 0] - px; ddy = cy + fp[..., 1] - py; ddz = cz + fp[..., 2] - pz
                best = np.minimum(best, ddx * ddx + ddy * ddy + ddz * ddz)
    return 1.0 - np.clip(np.sqrt(best), 0, 1)  # inverted: 1 at feature points

def remap(v, a, b, c, d):
    return c + (v - a) / (b - a) * (d - c)

# Perlin fbm, 4 octaves
pf = perlin(4, 1) * 0.5 + perlin(8, 2) * 0.25 + perlin(16, 3) * 0.125 + perlin(32, 4) * 0.0625
pf = pf / 0.9375 * 0.5 + 0.5
pf = np.clip((pf - 0.15) / 0.7, 0, 1)
# Worley fbm for billows
w1 = worley(4, 11) * 0.625 + worley(8, 12) * 0.25 + worley(16, 13) * 0.125
pw = remap(pf, 0.0, 1.0, w1, 1.0)  # perlin-worley
pw = np.clip(pw, 0, 1)
wa = worley(8, 21) * 0.625 + worley(16, 22) * 0.25 + worley(32, 23) * 0.125
wb = worley(16, 31) * 0.625 + worley(32, 32) * 0.25 + worley(64, 33) * 0.125
wc = worley(32, 41) * 0.625 + worley(64, 42) * 0.25 + worley(64, 43) * 0.125
def norm(a):
    a = (a - a.min()) / (a.max() - a.min()); return a
tex = np.stack([norm(pw), norm(wa), norm(wb), norm(wc)], axis=-1)
# layout for WebGL texImage3D: z slowest, then y, then x  -> array [z][y][x][c]
tex = np.transpose(tex, (2, 1, 0, 3))
(tex * 255 + 0.5).astype(np.uint8).tofile('noise128.bin')
print('ok', tex.shape, [float(tex[..., i].mean()) for i in range(4)])
