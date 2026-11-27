#!/usr/bin/env python3
"""Farben prüfen, bauen und aus Kundenmaterial ableiten (Skill website-farben).

Rechnet in OKLab/OKLCH (Ottosson 2020), Kontrast nach WCAG 2.x und APCA (0.0.98G-4g),
Farbfehlsichtigkeit nach Machado et al. 2009. Keine Abhängigkeiten außer der Standardbibliothek;
für `aus-bild` und `anteil` zusätzlich Pillow und numpy.

Befehle (immer mit python3 -I aufrufen):
  kontrast  <vordergrund> <hintergrund>          ein Paar prüfen (WCAG + APCA)
  pruefen   --css datei.css | --design DESIGN.md | --farben "bg=#..,ink=#..,accent=#.."
            [--rollen "bg=night,ink=ivory,..."] [--violett-ok] [--matrix]
  bauen     --marke "#hex" [--akzent "#hex"] [--neutral marke|warm|kalt|rein] [--art place|service|product|tech]
            [--zweit analog|ton-in-ton|komplementaer] [--css out.css] [--json out.json] [--vorschau out.html]
  aus-bild  <logo-oder-foto> [--n 6] [--logo]     Farben aus echtem Kundenmaterial ziehen
  inventur  <datei.css|.html> [...]               alle Farbwerte zählen, Fast-Dubletten finden
  anteil    <screenshot.png> --akzent "#hex"      wie viel Fläche Akzent und Buntes auf dem Bildschirm haben

Ausgabe: FAIL (muss behoben werden), WARN (begründen oder beheben), OK, INFO.
Exit-Code 1, wenn ein FAIL dabei ist.
"""
import json
import math
import re
import sys

# ------------------------------------------------------------------ Farbräume

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def hex_to_rgb(h):
    h = h.strip().lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(ch * 2 for ch in h)
    if len(h) not in (6, 8):
        raise ValueError('kein Hex-Wert: #' + h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return (r, g, b, a)


def rgb_to_hex(rgb):
    return '#' + ''.join('%02x' % max(0, min(255, round(c * 255))) for c in rgb[:3])


def lin_rgb_to_oklab(r, g, b):
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_)


def oklab_to_lin_rgb(L, a, b):
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)


def rgb_to_oklab(rgb):
    return lin_rgb_to_oklab(*(srgb_to_lin(c) for c in rgb[:3]))


def oklab_to_oklch(lab):
    L, a, b = lab
    C = math.hypot(a, b)
    h = math.degrees(math.atan2(b, a)) % 360
    return (L, C, h)


def oklch_to_oklab(L, C, h):
    return (L, C * math.cos(math.radians(h)), C * math.sin(math.radians(h)))


def rgb_to_oklch(rgb):
    return oklab_to_oklch(rgb_to_oklab(rgb))


def in_gamut(lin, eps=1e-4):
    return all(-eps <= c <= 1 + eps for c in lin)


def oklch_to_rgb(L, C, h):
    """OKLCH nach sRGB; liegt die Farbe außerhalb, sinkt die Buntheit (Chroma) bei gleichem L und h."""
    L = max(0.0, min(1.0, L))
    lin = oklab_to_lin_rgb(*oklch_to_oklab(L, C, h))
    if not in_gamut(lin):
        lo, hi = 0.0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            if in_gamut(oklab_to_lin_rgb(*oklch_to_oklab(L, mid, h))):
                lo = mid
            else:
                hi = mid
        lin = oklab_to_lin_rgb(*oklch_to_oklab(L, lo, h))
    return tuple(lin_to_srgb(max(0.0, min(1.0, c))) for c in lin)


def max_chroma(L, h):
    lo, hi = 0.0, 0.5
    for _ in range(30):
        mid = (lo + hi) / 2
        if in_gamut(oklab_to_lin_rgb(*oklch_to_oklab(L, mid, h))):
            lo = mid
        else:
            hi = mid
    return lo


def delta_e_ok(rgb1, rgb2):
    a, b = rgb_to_oklab(rgb1), rgb_to_oklab(rgb2)
    return math.dist(a, b)


def hue_diff(h1, h2):
    d = abs(h1 - h2) % 360
    return min(d, 360 - d)


# ------------------------------------------------------------------ Farben lesen

NAMED = {'white': '#ffffff', 'black': '#000000', 'transparent': '#00000000'}


def parse_color(text, bg_for_alpha=None):
    """Hex, rgb(), hsl(), oklch(), oklab(). Gibt (r,g,b) in 0..1 zurück oder None."""
    t = text.strip().lower()
    if t in NAMED:
        t = NAMED[t]
    if t.startswith('#'):
        r, g, b, a = hex_to_rgb(t)
        return blend((r, g, b), a, bg_for_alpha)
    m = re.match(r'(rgba?|hsla?|oklch|oklab)\(([^)]*)\)', t)
    if not m:
        return None
    fn, args = m.group(1), m.group(2)
    parts = [p for p in re.split(r'[\s,/]+', args.strip()) if p]
    if any(p.startswith('var') or p == 'from' for p in parts):
        return None

    def num(p, scale=1.0, pct_scale=None):
        if p == 'none':
            return 0.0
        if p.endswith('%'):
            return float(p[:-1]) / 100 * (pct_scale if pct_scale is not None else scale)
        if p.endswith('deg'):
            return float(p[:-3])
        return float(p)
    alpha = num(parts[3], 1.0, 1.0) if len(parts) > 3 else 1.0
    if fn.startswith('rgb'):
        r, g, b = (num(p, 1.0, 255.0) / 255 if not p.endswith('%') else num(p, 1.0, 1.0) for p in parts[:3])
        return blend((r, g, b), alpha, bg_for_alpha)
    if fn.startswith('hsl'):
        h = num(parts[0]); s = num(parts[1], 1, 1); l = num(parts[2], 1, 1)
        if s > 1: s /= 100
        if l > 1: l /= 100
        k = lambda n: (n + h / 30) % 12
        a = s * min(l, 1 - l)
        f = lambda n: l - a * max(-1, min(k(n) - 3, 9 - k(n), 1))
        return blend((f(0), f(8), f(4)), alpha, bg_for_alpha)
    if fn == 'oklch':
        L = num(parts[0], 1.0, 1.0); C = num(parts[1], 1.0, 0.4); h = num(parts[2])
        return blend(oklch_to_rgb(L, C, h), alpha, bg_for_alpha)
    if fn == 'oklab':
        L = num(parts[0], 1.0, 1.0); a_ = num(parts[1], 1.0, 0.4); b_ = num(parts[2], 1.0, 0.4)
        L_, C_, h_ = oklab_to_oklch((L, a_, b_))
        return blend(oklch_to_rgb(L_, C_, h_), alpha, bg_for_alpha)
    return None


def blend(rgb, alpha, bg):
    """Halbtransparente Farbe über einen Grund legen. Ohne Grund zählt die deckende Farbe."""
    if alpha >= 0.999 or bg is None:
        return tuple(rgb[:3])
    return tuple(alpha * c + (1 - alpha) * b for c, b in zip(rgb, bg))


def is_transparent(text):
    t = text.strip().lower()
    if t == 'transparent':
        return True
    if t.startswith('#') and len(t.lstrip('#')) in (4, 8):
        return hex_to_rgb(t)[3] < 0.999
    m = re.match(r'(rgba?|hsla?|oklch|oklab)\(([^)]*)\)', t)
    if m:
        parts = [p for p in re.split(r'[\s,/]+', m.group(2).strip()) if p]
        if len(parts) > 3:
            p = parts[3]
            v = float(p[:-1]) / 100 if p.endswith('%') else float(p)
            return v < 0.999
    return False


COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab)\([^)]*\)')


def read_css_tokens(path):
    src = open(path, encoding='utf-8').read()
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    tokens = {}
    for block in re.findall(r':root[^{]*\{([^}]*)\}', src):
        for name, val in re.findall(r'--([\w-]+)\s*:\s*([^;]+);', block):
            tokens.setdefault(name, val.strip())
    # var()-Verweise auflösen
    for _ in range(5):
        for k, v in list(tokens.items()):
            m = re.fullmatch(r'var\(--([\w-]+)\)', v)
            if m and m.group(1) in tokens:
                tokens[k] = tokens[m.group(1)]
    out = {}
    for k, v in tokens.items():
        if COLOR_RE.fullmatch(v.strip()) or v.strip().lower() in NAMED:
            out[k] = v.strip()
    return out


def read_design_md(path):
    out, inside = {}, False
    for line in open(path, encoding='utf-8'):
        if re.match(r'^colors:\s*$', line):
            inside = True
            continue
        if inside:
            m = re.match(r'^\s+([\w-]+):\s*"?([^"\n]+)"?\s*$', line)
            if m:
                out[m.group(1)] = m.group(2).strip()
            elif re.match(r'^\S', line):
                break
    return out


def read_pairs_arg(s):
    out = {}
    for part in s.split(','):
        if '=' in part:
            k, v = part.split('=', 1)
            out[k.strip()] = v.strip()
    return out


# ------------------------------------------------------------------ Kontrast

def wcag_lum(rgb):
    r, g, b = (srgb_to_lin(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def wcag_ratio(fg, bg):
    a, b = wcag_lum(fg), wcag_lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def apca_lc(txt, bg):
    """APCA-W3 0.0.98G-4g. Positiv: dunkle Schrift auf hell, negativ: helle Schrift auf dunkel."""
    def y(rgb):
        r, g, b = (round(c * 255) / 255 for c in rgb[:3])
        Y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.0721750 * b ** 2.4
        return Y + (0.022 - Y) ** 1.414 if Y < 0.022 else Y
    yt, yb = y(txt), y(bg)
    if abs(yb - yt) < 0.0005:
        return 0.0
    if yb > yt:
        s = (yb ** 0.56 - yt ** 0.57) * 1.14
        out = 0.0 if s < 0.1 else s - 0.027
    else:
        s = (yb ** 0.65 - yt ** 0.62) * 1.14
        out = 0.0 if s > -0.1 else s + 0.027
    return out * 100


# ------------------------------------------------------------------ Farbfehlsichtigkeit

MACHADO = {
    'Protanopie': ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
    'Deuteranopie': ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
    'Tritanopie': ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900)),
}


def simulate(rgb, kind):
    lin = [srgb_to_lin(c) for c in rgb[:3]]
    M = MACHADO[kind]
    out = [max(0.0, min(1.0, sum(M[i][j] * lin[j] for j in range(3)))) for i in range(3)]
    return tuple(lin_to_srgb(c) for c in out)


# ------------------------------------------------------------------ Rollen

ROLE_PATTERNS = [
    ('accentInk', r'(accent|action|primary|brand|cta)[-_]?(ink|text|fg|on|contrast|foreground)|on[-_]?(accent|action|primary|brand)'),
    ('bg', r'^(bg|background|ground|g-main|canvas|page|paper|base|night|surface-0)$|(^|-)bg$|^color-bg|^bg-'),
    ('surface', r'surface|^g-alt$|card|panel|sheet|raised|elevated|tile'),
    ('muted', r'muted|secondary|soft|subtle|ink-2|text-2|grey|gray|dim|quiet'),
    ('ink', r'^(ink|text|fg|foreground|body|copy|heading)$|^ink$|^color-text|text-1|ink-1|(^|-)ink$'),
    ('link', r'^link$|link[-_]?(color|text)|^text[-_]link|^a$'),
    ('focus', r'focus|ring'),
    ('accent', r'accent|action|primary|brand|cta'),
    ('line', r'line|border|hairline|rule|divider|stroke|outline'),
    ('error', r'error|danger|negative|alert|destructive'),
    ('success', r'success|positive|ok$|valid'),
    ('warning', r'warn|caution|attention'),
    ('info', r'^info|notice'),
]


def guess_roles(tokens):
    roles = {}
    for role, pat in ROLE_PATTERNS:
        for name in tokens:
            if role in roles:
                break
            if name in roles.values():
                continue
            if re.search(pat, name, re.I):
                roles[role] = name
    return roles


# ------------------------------------------------------------------ Ausgabe

class Report:
    def __init__(self):
        self.rows = []

    def add(self, level, text):
        self.rows.append((level, text))

    def print(self):
        order = {'FAIL': 0, 'WARN': 1, 'OK': 2, 'INFO': 3}
        for level, text in sorted(self.rows, key=lambda r: order[r[0]]):
            print(f'{level:4}  {text}')
        n_fail = sum(1 for l, _ in self.rows if l == 'FAIL')
        n_warn = sum(1 for l, _ in self.rows if l == 'WARN')
        print(f'\nErgebnis: {n_fail} FAIL, {n_warn} WARN')
        return n_fail


def fmt_oklch(rgb):
    L, C, h = rgb_to_oklch(rgb)
    return f'oklch({L:.3f} {C:.3f} {h:.1f})'


def pair_line(name_fg, fg, name_bg, bg):
    r = wcag_ratio(fg, bg)
    lc = apca_lc(fg, bg)
    return r, lc, f'{name_fg} {rgb_to_hex(fg)} auf {name_bg} {rgb_to_hex(bg)}: WCAG {r:.2f}:1, APCA Lc {lc:+.0f}'


# ------------------------------------------------------------------ pruefen

def check_palette(raw, roles=None, violett_ok=False, matrix=False):
    rep = Report()
    colors = {}
    for name, val in raw.items():
        if is_transparent(val):
            rep.add('INFO', f'{name} = {val}: halbtransparent, nur im Zusammenhang prüfbar (lieber feste Farben für Text)')
            continue
        rgb = parse_color(val)
        if rgb is None:
            rep.add('INFO', f'{name} = {val}: nicht lesbar, übersprungen')
            continue
        colors[name] = rgb
    if not colors:
        rep.add('FAIL', 'keine Farben gefunden')
        return rep
    roles = dict(roles or {})
    roles_given = set(roles)
    auto = guess_roles(colors)
    for k, v in auto.items():
        roles.setdefault(k, v)
    roles = {k: v for k, v in roles.items() if v in colors}
    rep.add('INFO', 'Rollen: ' + ', '.join(f'{k}={v}' for k, v in roles.items()) +
            '  (falsch erkannt? mit --rollen "bg=..,ink=.." festlegen)')

    def c(role):
        return colors[roles[role]] if role in roles else None
    given = set(roles_given)

    def level(lvl, fg_role, bg_role, ratio):
        """Ein FAIL aus erratenen Rollen, die gar nicht zusammengehören (Text hell, Grund hell), wird zum Hinweis."""
        if lvl == 'FAIL' and ratio < 2.0 and not ({fg_role, bg_role} <= given):
            return 'WARN'
        return lvl

    bg, surface, ink, muted, accent, accent_ink, line, link = (c(r) for r in ('bg', 'surface', 'ink', 'muted', 'accent', 'accentInk', 'line', 'link'))
    grounds = [(roles[r], c(r)) for r in ('bg', 'surface') if c(r) is not None]

    # 1. Text
    for gname, g in grounds:
        if ink is not None:
            r, lc, s = pair_line(roles['ink'], ink, gname, g)
            grole = 'bg' if g is bg else 'surface'
            if r < 4.5:
                lv = level('FAIL', 'ink', grole, r)
                rep.add(lv, s + (' – Fließtext braucht 4,5:1' if lv == 'FAIL' else
                                 ' – gehören diese Rollen zusammen? Seiten mit hellen und dunklen Abschnitten je Abschnittsart mit --rollen prüfen'))
            elif abs(lc) < 75:
                rep.add('WARN', s + ' – APCA unter Lc 75: für Fließtext ab 18px knapp, Lc 90 ist das Ziel')
            else:
                rep.add('OK', s)
            if abs(lc) > 104 and g == bg and wcag_lum(g) < 0.05:
                rep.add('WARN', f'{roles["ink"]} auf {gname}: fast reines Weiß auf fast Schwarz flimmert, Schrift auf L 0,92–0,95 und Grund auf L 0,16–0,22 setzen')
        if muted is not None:
            r, lc, s = pair_line(roles['muted'], muted, gname, g)
            if r < 4.5:
                lv = level('FAIL', 'muted', 'bg' if g is bg else 'surface', r)
                rep.add(lv, s + (' – auch Nebentext braucht 4,5:1 (ab 24px oder 19px fett: 3:1)' if lv == 'FAIL' else
                                 ' – gehören diese Rollen zusammen? Je Abschnittsart mit --rollen prüfen'))
            elif abs(lc) < 60:
                rep.add('WARN', s + ' – APCA unter Lc 60: nur für große oder fette Schrift')
            else:
                rep.add('OK', s)
    # 2. Akzent
    if accent is not None:
        for gname, g in grounds:
            r, lc, s = pair_line(roles['accent'], accent, gname, g)
            if r < 3 and accent_ink is not None and wcag_ratio(accent_ink, accent) >= 4.5 and c('focus') is not None \
                    and c('focus') != accent:
                rep.add('WARN', s + ' – helle Markenfläche: erlaubt, weil die Beschriftung den Button erkennbar macht '
                        '(WCAG 1.4.11) und der Fokusring eine eigene Farbe hat; taste verlangt 3:1, also im Bericht begründen')
            elif r < 3:
                rep.add('FAIL', s + ' – Button, Fokusring und Symbole brauchen 3:1 zum Grund')
            elif link is not None:
                rep.add('OK', s + ' (Fläche; Textlinks nutzen ' + roles['link'] + ')')
            elif abs(lc) < 45:
                rep.add('WARN', s + ' – WCAG ok, aber APCA unter Lc 45: als Textlink zu schwach (typisch für helle Schrift auf Dunkel)')
            elif r < 4.5:
                rep.add('WARN', s + ' – reicht für Flächen und Fokus, für Textlinks in dieser Farbe nicht (4,5:1)')
            else:
                rep.add('OK', s)
        if accent_ink is not None:
            r, lc, s = pair_line(roles['accentInk'], accent_ink, roles['accent'], accent)
            rep.add('FAIL' if r < 4.5 else 'OK', s + (' – Button-Beschriftung braucht 4,5:1' if r < 4.5 else ''))
        else:
            best = max(((n, col) for n, col in (('Weiß', (1, 1, 1)), ('ink', ink)) if col is not None),
                       key=lambda x: wcag_ratio(x[1], accent))
            r = wcag_ratio(best[1], accent)
            rep.add('INFO' if r >= 4.5 else 'WARN',
                    f'keine Button-Schriftfarbe angegeben; am besten {best[0]} ({r:.2f}:1)')
    if link is not None:
        for gname, g in grounds:
            r, lc, s = pair_line(roles['link'], link, gname, g)
            rep.add('FAIL' if r < 4.5 else 'WARN' if abs(lc) < 60 else 'OK',
                    s + (' – Textlinks brauchen 4,5:1' if r < 4.5 else ' – APCA unter Lc 60: Links im Fließtext zu schwach' if abs(lc) < 60 else ''))
    # 3. Linien
    if line is not None and bg is not None:
        r = wcag_ratio(line, bg)
        rep.add('INFO' if r >= 3 else 'WARN' if r < 1.3 else 'INFO',
                f'{roles["line"]} auf {roles["bg"]}: {r:.2f}:1 ' +
                ('(Eingabefelder und Bedienelemente brauchen 3:1, reine Trennlinien nicht)' if r < 3 else ''))
    # 4. Signalfarben
    for role in ('error', 'success', 'warning', 'info'):
        col = c(role)
        if col is not None and bg is not None:
            r, lc, s = pair_line(roles[role], col, roles['bg'], bg)
            weak = abs(lc) < 45
            rep.add('FAIL' if r < 3 else 'WARN' if r < 4.5 or weak else 'OK',
                    s + (' – als Text 4,5:1, als Symbol 3:1; immer mit Wort oder Symbol, nie nur Farbe' if r < 4.5 else
                         ' – APCA unter Lc 45: als Text zu schwach, heller (dunkel) bzw. dunkler (hell) setzen' if weak else ''))
    # 5. Grund und Fläche
    if bg is not None and surface is not None:
        dL = abs(rgb_to_oklch(bg)[0] - rgb_to_oklch(surface)[0])
        if dL < 0.012:
            rep.add('WARN', f'{roles["bg"]} und {roles["surface"]} fast gleich hell (ΔL {dL:.3f}): Flächen verschwimmen, 0,02–0,06 ist ruhig und sichtbar')
        elif dL > 0.12:
            rep.add('WARN', f'{roles["bg"]} und {roles["surface"]} springen hart (ΔL {dL:.3f}): wirkt wie ein Kasten, 0,02–0,06 ist ruhiger')
        else:
            rep.add('OK', f'Stufe Grund → Fläche ΔL {dL:.3f}')

    # 6. Farbtöne, Violett, Grelles, reines Schwarz
    chroma = {n: rgb_to_oklch(col) for n, col in colors.items()}
    semantic = {roles.get(r) for r in ('error', 'success', 'warning', 'info')}
    for n, (L, C, h) in chroma.items():
        if C >= 0.04 and 270 <= h <= 330 and not violett_ok:
            rep.add('FAIL', f'{n} {rgb_to_hex(colors[n])} ist Violett/Lavendel (h {h:.0f}°): nur, wenn bewusst gewählt (--violett-ok)')
        if n in (roles.get('bg'), roles.get('surface')) and C > 0.12:
            rep.add('WARN', f'{n} als großer Grund sehr bunt (C {C:.3f}): große Flächen ruhig halten, Farbe kommt aus Fotos und einem Akzent')
        if C > 0.29 and L > 0.45:
            rep.add('WARN', f'{n} {rgb_to_hex(colors[n])} sehr grell (C {C:.3f}): wirkt billig und flimmert, Chroma unter 0,25')
        if rgb_to_hex(colors[n]) == '#000000' and n == roles.get('ink'):
            rep.add('WARN', f'{n} ist reines Schwarz: ein fast schwarzer, leicht getönter Ton wirkt hochwertiger (z. B. L 0,20–0,25)')
    families = []
    for n, (L, C, h) in chroma.items():
        if C < 0.04 or n in semantic or L < 0.12 or L > 0.97:
            continue
        for fam in families:
            if hue_diff(fam[0], h) <= 30:
                fam[1].append(n)
                break
        else:
            families.append([h, [n]])
    if len(families) > 2:
        rep.add('WARN', f'{len(families)} Farbtonfamilien außerhalb der Signalfarben (' +
                '; '.join('/'.join(f[1]) for f in families) + '): eine Marke plus höchstens eine verwandte Zweitfarbe')
    elif families:
        rep.add('OK', f'{len(families)} Farbtonfamilie(n): ' + '; '.join('/'.join(f[1]) + f' ~{f[0]:.0f}°' for f in families))
    if accent is not None:
        ah = rgb_to_oklch(accent)[2]
        for n, (L, C, h) in chroma.items():
            if 0.006 < C < 0.04 and hue_diff(h, ah) > 100 and n not in semantic:
                rep.add('INFO', f'{n} ist zur Gegenrichtung des Akzents getönt ({h:.0f}° gegen {ah:.0f}°): gewollt? Neutrale Töne leicht zur Marke oder zum Licht der Fotos tönen')
    # 7. Fast-Dubletten
    names = [n for n in colors if n != roles.get('accentInk')]
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            d = delta_e_ok(colors[names[i]], colors[names[j]])
            if 0 < d < 0.02:
                if names[i] in semantic or names[j] in semantic:
                    rep.add('WARN', f'{names[i]} und {names[j]} sehen gleich aus (ΔE {d:.3f}): Bedeutung über Symbol, Wort '
                            'oder Unterstreichung tragen (typisch bei roten Marken: Links unterstreichen, Fehler mit Symbol)')
                else:
                    rep.add('WARN', f'{names[i]} und {names[j]} fast gleich (ΔE {d:.3f}): zu einem Token zusammenlegen')
    # 8. Farbfehlsichtigkeit (8 % der Männer, 0,4 % der Frauen)
    pairs = []
    if c('error') is not None and c('success') is not None:
        pairs.append(('error', 'success'))
    if accent is not None and c('error') is not None:
        pairs.append(('accent', 'error'))
    if accent is not None and bg is not None:
        pairs.append(('accent', 'bg'))
    for a_, b_ in pairs:
        ca, cb = c(a_), c(b_)
        worst = min((delta_e_ok(simulate(ca, k), simulate(cb, k)), k) for k in MACHADO)
        if (a_, b_) == ('error', 'success'):
            lvl = 'WARN' if worst[0] < 0.04 else 'INFO' if worst[0] < 0.10 else 'OK'
            note = (' – Rot und Grün trennen etwa 8 % der Männer schlecht: Fehler und Erfolg immer mit Symbol und Wort'
                    if lvl != 'OK' else '')
        else:
            lvl = 'WARN' if worst[0] < 0.06 else 'OK'
            note = ' – kaum zu unterscheiden: Unterschied über Helligkeit, Symbol oder Wort tragen' if lvl == 'WARN' else ''
        rep.add(lvl, f'{roles[a_]} gegen {roles[b_]} bei {worst[1]}: ΔE {worst[0]:.3f}' + note)
    # 9. Matrix
    if matrix:
        rep.add('INFO', 'Matrix (Vordergrund auf Hintergrund, WCAG / APCA):')
        for fn, f in colors.items():
            for gn, g in colors.items():
                if fn != gn and wcag_ratio(f, g) >= 3:
                    rep.add('INFO', f'   {fn} auf {gn}: {wcag_ratio(f, g):.2f}:1, Lc {apca_lc(f, g):+.0f}')
    return rep


# ------------------------------------------------------------------ bauen

def find_L(target_fn, C, h, lo, hi, want='first', steps=60):
    """Sucht von lo nach hi das erste L, bei dem target_fn(rgb) wahr wird."""
    for i in range(steps + 1):
        L = lo + (hi - lo) * i / steps
        rgb = oklch_to_rgb(L, C, h)
        if target_fn(rgb):
            return L, rgb
    return hi, oklch_to_rgb(hi, C, h)


def text_ok(c, t):
    """Farbe trägt Text auf Grund und Fläche: WCAG 4,6:1 und APCA |Lc| 60 (WCAG überschätzt helle Schrift auf Dunkel)."""
    grounds = [t[k] for k in ('bg', 'surface') if k in t]
    return all(wcag_ratio(c, g) >= 4.6 and abs(apca_lc(c, g)) >= 60 for g in grounds)


def fill_ok(c, t):
    """Fläche (Button, Fokusring, Symbol) hebt sich mit 3:1 von Grund und Fläche ab."""
    return all(wcag_ratio(c, t[k]) >= 3.0 for k in ('bg', 'surface') if k in t)


def build(marke, akzent=None, neutral='marke', art='service', zweit=None, dunkel=True):
    brand = parse_color(marke)
    bL, bC, bh = rgb_to_oklch(brand)
    acc_src = parse_color(akzent) if akzent else brand
    aL, aC, ah = rgb_to_oklch(acc_src)
    if bC < 0.03:   # Marke ist selbst grau/schwarz
        nh, nC = (75, 0.008) if neutral != 'kalt' else (250, 0.008)
    else:
        nh = {'marke': bh, 'warm': 75.0, 'kalt': 250.0, 'rein': bh}[neutral]
        nC = 0.0 if neutral == 'rein' else 0.010
    warm_paper = art == 'place'

    def neutral_c(base):
        return 0.0 if neutral == 'rein' else base

    themes = {}
    for mode in (('hell', 'dunkel') if dunkel else ('hell',)):
        t = {}
        if mode == 'hell':
            t['bg'] = oklch_to_rgb(0.975 if warm_paper else 0.985, neutral_c(nC * (1.2 if warm_paper else 0.8)), nh)
            t['surface'] = oklch_to_rgb(0.945 if warm_paper else 0.955, neutral_c(nC * 1.2), nh)
            t['line'] = oklch_to_rgb(0.875, neutral_c(nC * 1.3), nh)
            t['ink'] = oklch_to_rgb(0.22, neutral_c(0.016), nh)
            _, t['muted'] = find_L(lambda c: wcag_ratio(c, t['surface']) >= 4.8 and abs(apca_lc(c, t['surface'])) >= 62,
                                   neutral_c(0.02), nh, 0.62, 0.25)
            # Textlinks: Markenfarbe, so lange sie als Schrift trägt, sonst dunkler
            link = acc_src
            if not text_ok(link, t):
                _, link = find_L(lambda c: text_ok(c, t), min(aC, max_chroma(0.5, ah)), ah, min(aL, 0.7), 0.2)
            t['link'] = link
            t['accent'] = acc_src
        else:
            t['bg'] = oklch_to_rgb(0.185, neutral_c(nC * 1.4), nh)
            t['surface'] = oklch_to_rgb(0.225, neutral_c(nC * 1.6), nh)
            t['line'] = oklch_to_rgb(0.32, neutral_c(nC * 1.6), nh)
            t['ink'] = oklch_to_rgb(0.94, neutral_c(0.010), nh)
            _, t['muted'] = find_L(lambda c: wcag_ratio(c, t['surface']) >= 4.8 and abs(apca_lc(c, t['surface'])) >= 62,
                                   neutral_c(0.018), nh, 0.6, 0.9)
            # Textlinks im Dunkeln heller und etwas weniger bunt (Material: entsättigte Akzente)
            _, t['link'] = find_L(lambda c: text_ok(c, t), aC * 0.85, ah, max(aL, 0.62), 0.95)
            t['accent'] = acc_src
        # Button-Fläche: die echte Markenfarbe, solange sie sich mit 3:1 vom Grund abhebt.
        # Helle Marken (Gelb, Hellgrün) bleiben im Hellen echt: Die Beschriftung macht den Button erkennbar
        # (WCAG 1.4.11), der Fokusring nimmt dann eine andere Farbe.
        light_brand = mode == 'hell' and aL >= 0.72
        if not fill_ok(t['accent'], t) and not light_brand:
            direction = 0.2 if mode == 'hell' else 0.95
            _, t['accent'] = find_L(lambda c: fill_ok(c, t), aC * (1 if mode == 'hell' else 0.9), ah, aL, direction)
        # Schrift auf dem Button: Weiß, wenn die Fläche dafür höchstens 0,1 dunkler werden muss, sonst dunkel
        white, dark = (1.0, 1.0, 1.0), oklch_to_rgb(0.2, neutral_c(0.016), nh)
        L0, C0, h0 = rgb_to_oklch(t['accent'])
        if wcag_ratio(white, t['accent']) >= 4.5:
            t['accentInk'] = white
        else:
            Lw, cand = find_L(lambda c: wcag_ratio(white, c) >= 4.6, C0, h0, L0, 0.2)
            if L0 - Lw <= 0.10 and wcag_ratio(white, cand) >= 4.5:
                t['accent'], t['accentInk'] = cand, white
            else:
                t['accentInk'] = dark
                if wcag_ratio(dark, t['accent']) < 4.5:
                    _, t['accent'] = find_L(lambda c: wcag_ratio(dark, c) >= 4.6, C0, h0, L0, 0.95)
        t['focus'] = t['accent'] if fill_ok(t['accent'], t) else t['link']
        # Signalfarben: gleiche Helligkeit, gemäßigte Buntheit, Abstand zur Marke
        sem_h = {'error': 27.0, 'success': 150.0, 'warning': 70.0, 'info': 245.0}
        for role, h in sem_h.items():
            if role != 'error' and hue_diff(h, ah) < 15 and aC > 0.06:
                h = h + (15 - hue_diff(h, ah)) * (1 if (h - ah) % 360 < 180 else -1)
            C = min(0.16, max_chroma(0.55, h) * 0.9)
            if mode == 'hell':
                _, t[role] = find_L(lambda c: text_ok(c, t), C, h, 0.62, 0.3)
            else:
                _, t[role] = find_L(lambda c: text_ok(c, t), C * 0.85, h, 0.6, 0.95)
        # Fehler und Erfolg auch für Menschen mit Rot-Grün-Schwäche trennen: über die Helligkeit
        # Hell: Rot höchstens 0,1 dunkler. Dunkel: Grün höchstens 0,1 heller. Sonst kippen die Farben.
        moving = 'error' if mode == 'hell' else 'success'
        for _ in range(8):
            worst = min(delta_e_ok(simulate(t['error'], k), simulate(t['success'], k)) for k in MACHADO)
            if worst >= 0.10:
                break
            L0, C0, h0 = rgb_to_oklch(t[moving])
            t[moving] = oklch_to_rgb(L0 - 0.012 if mode == 'hell' else L0 + 0.012, C0, h0)
        if zweit:
            L0, C0, h0 = rgb_to_oklch(t['accent'])
            if zweit == 'analog':
                h2, L2, C2 = (h0 + 30) % 360, L0, C0 * 0.8
            elif zweit == 'ton-in-ton':
                h2, L2, C2 = h0, (L0 + 0.25 if mode == 'hell' else L0 - 0.3), C0 * 0.5
            else:
                h2, L2, C2 = (h0 + 180) % 360, L0, C0 * 0.6
            if 270 <= h2 <= 330:
                h2 = 268 if h2 < 300 else 332
            t['accent2'] = oklch_to_rgb(max(0.05, min(0.97, L2)), C2, h2)
        themes[mode] = t
    # Markenleiter 50–950
    ramp = {}
    steps = [(50, 0.975), (100, 0.945), (200, 0.89), (300, 0.81), (400, 0.71), (500, 0.62),
             (600, 0.53), (700, 0.45), (800, 0.37), (900, 0.29), (950, 0.22)]
    for name, L in steps:
        edge = min(1.0, (1 - abs(L - 0.6) / 0.42) * 1.15)
        ramp[name] = oklch_to_rgb(L, max(0.012, bC * max(0.18, edge)), bh)
    return {'marke': brand, 'themes': themes, 'ramp': ramp, 'neutral_hue': nh}


def css_block(result, art):
    lines = ['/* Farben, erzeugt mit website-farben (farben.py bauen). Rollen statt Einzelfarben. */', ':root {',
             '  color-scheme: light;' if 'dunkel' not in result['themes'] else '  color-scheme: light dark;']
    order = ['bg', 'surface', 'line', 'ink', 'muted', 'link', 'accent', 'accentInk', 'focus', 'accent2', 'error', 'success', 'warning', 'info']
    t = result['themes']['hell']
    for k in order:
        if k in t:
            lines.append(f'  --{css_name(k)}: {rgb_to_hex(t[k])};  /* {fmt_oklch(t[k])} */')
    lines.append(f'  --marke: {rgb_to_hex(result["marke"])};  /* Original der Marke, für Logo-Umfeld und Markenband */')
    for k, v in result['ramp'].items():
        lines.append(f'  --marke-{k}: {rgb_to_hex(v)};')
    lines.append('}')
    if 'dunkel' in result['themes']:
        d = result['themes']['dunkel']
        body = [f'    --{css_name(k)}: {rgb_to_hex(d[k])};  /* {fmt_oklch(d[k])} */' for k in order if k in d]
        lines += ['', '/* Dunkel nur, wenn die Seite es anbietet (Art tech oder vom Kunden gewollt). */',
                  '@media (prefers-color-scheme: dark) {', '  :root:not([data-theme="light"]) {'] + body + ['  }', '}',
                  ':root[data-theme="dark"] {'] + [b[2:] for b in body] + ['}']
    lines += ['', '::selection { background: color-mix(in oklab, var(--accent) 22%, transparent); color: var(--ink); }',
              ':focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }',
              'html { accent-color: var(--accent); caret-color: var(--accent); }']
    return '\n'.join(lines)


def css_name(k):
    return {'accentInk': 'accent-ink', 'accent2': 'accent-2'}.get(k, k)


def preview_html(result, path):
    def swatch_set(t, title):
        rows = []
        for k in ('bg', 'surface', 'line', 'ink', 'muted', 'link', 'accent', 'accentInk', 'accent2', 'error', 'success', 'warning', 'info'):
            if k in t:
                rows.append(f'<div class="sw"><i style="background:{rgb_to_hex(t[k])}"></i><b>{css_name(k)}</b><code>{rgb_to_hex(t[k])}</code></div>')
        sims = ''.join(
            f'<div class="sim"><span>{kind}</span>' + ''.join(
                f'<i style="background:{rgb_to_hex(simulate(t[k], kind))}"></i>' for k in ('accent', 'error', 'success', 'warning') if k in t) + '</div>'
            for kind in MACHADO)
        return f'''<section style="background:{rgb_to_hex(t['bg'])};color:{rgb_to_hex(t['ink'])}">
<h2>{title}</h2>
<p class="lead">Fließtext auf dem Grund. So liest sich ein Absatz mit echter Länge, damit man Kontrast und Ruhe beurteilen kann.</p>
<p style="color:{rgb_to_hex(t['muted'])}">Nebentext in der gedämpften Farbe, etwa für Hinweise unter einem Formularfeld.</p>
<div class="card" style="background:{rgb_to_hex(t['surface'])};border-color:{rgb_to_hex(t['line'])}">
<p>Fläche mit Linie. <a href="#" style="color:{rgb_to_hex(t.get('link', t['accent']))}">Ein Textlink</a> im Satz.</p>
<button style="background:{rgb_to_hex(t['accent'])};color:{rgb_to_hex(t['accentInk'])}">Termin buchen</button>
<p><span style="color:{rgb_to_hex(t['error'])}">✕ Fehler: Bitte E-Mail prüfen</span> · <span style="color:{rgb_to_hex(t['success'])}">✓ Gesendet</span> · <span style="color:{rgb_to_hex(t['warning'])}">! Hinweis</span></p>
</div>
<div class="grid">{''.join(rows)}</div>
<p class="small" style="color:{rgb_to_hex(t['muted'])}">Akzent und Signalfarben, wie Menschen mit Farbfehlsichtigkeit sie ungefähr sehen:</p>{sims}
</section>'''
    ramp = ''.join(f'<div class="sw"><i style="background:{rgb_to_hex(v)}"></i><b>{k}</b><code>{rgb_to_hex(v)}</code></div>'
                   for k, v in result['ramp'].items())
    html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farbvorschau</title><style>
body{{margin:0;font:16px/1.55 system-ui,sans-serif}} section{{padding:32px 16px}} h2{{margin:0 0 12px;font-size:22px}}
.card{{border:1px solid;border-radius:12px;padding:16px;margin:16px 0}} button{{border:0;border-radius:8px;padding:12px 18px;font:600 16px system-ui}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:16px 0}}
.sw{{display:flex;align-items:center;gap:8px;font-size:13px}} .sw i{{width:28px;height:28px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}}
.sw code{{opacity:.7}} .sim{{display:flex;align-items:center;gap:6px;font-size:12px;margin:4px 0}} .sim span{{width:110px}} .sim i{{width:40px;height:18px;border-radius:4px}}
.small{{font-size:13px}} .lead{{max-width:62ch}}
</style></head><body>
{swatch_set(result['themes']['hell'], 'Hell')}
{swatch_set(result['themes']['dunkel'], 'Dunkel') if 'dunkel' in result['themes'] else ''}
<section style="background:#fff;color:#222"><h2>Markenleiter</h2><div class="grid">{ramp}</div></section>
</body></html>'''
    open(path, 'w', encoding='utf-8').write(html)


# ------------------------------------------------------------------ aus Bild

def from_image(path, n=6, logo=False):
    from PIL import Image
    import numpy as np
    im = Image.open(path)
    im.thumbnail((256, 256))
    im = im.convert('RGBA')
    a = np.asarray(im).reshape(-1, 4).astype(np.float64) / 255
    a = a[a[:, 3] > 0.5][:, :3]
    if len(a) == 0:
        print('Bild ist leer oder ganz transparent')
        return 1
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    lab = np.cbrt(lin @ M1.T) @ M2.T
    if logo:   # Logos: Weiß/Hintergrund weglassen
        keep = ~((lab[:, 0] > 0.96) & (np.hypot(lab[:, 1], lab[:, 2]) < 0.02))
        lab = lab[keep] if keep.sum() > 50 else lab
    rng = np.random.default_rng(1)
    k = min(n, len(lab))
    cent = lab[rng.choice(len(lab), k, replace=False)]
    for _ in range(25):
        d = ((lab[:, None, :] - cent[None, :, :]) ** 2).sum(2)
        lbl = d.argmin(1)
        for i in range(k):
            if (lbl == i).any():
                cent[i] = lab[lbl == i].mean(0)
    share = np.bincount(lbl, minlength=k) / len(lab)
    res = []
    for i in np.argsort(-share):
        L, a_, b_ = cent[i]
        C, h = math.hypot(a_, b_), math.degrees(math.atan2(b_, a_)) % 360
        rgb = oklch_to_rgb(L, C, h)
        res.append((share[i], rgb, L, C, h))
    print(f'Farben in {path} (Anteil, Hex, OKLCH):')
    for s, rgb, L, C, h in res:
        tag = 'bunt' if C >= 0.05 else 'neutral'
        print(f'  {s * 100:5.1f} %  {rgb_to_hex(rgb)}  oklch({L:.3f} {C:.3f} {h:.0f})  {tag}')
    chroma = [r for r in res if r[3] >= 0.05 and 0.25 < r[2] < 0.9]
    neutrals = [r for r in res if r[3] < 0.05]
    if chroma:
        best = max(chroma, key=lambda r: r[0] * (0.5 + r[3] * 4))
        print(f'\nVorschlag Marke: {rgb_to_hex(best[1])} (häufigste kräftige Farbe)')
        if 270 <= best[4] <= 330:
            print('  Achtung: Violett. Nur nehmen, wenn es wirklich die Markenfarbe ist (Logo, Schild), dann --violett-ok beim Prüfen.')
    if neutrals:
        w = sum(r[0] for r in neutrals)
        hx = sum(r[0] * math.cos(math.radians(r[4])) * r[3] for r in neutrals)
        hy = sum(r[0] * math.sin(math.radians(r[4])) * r[3] for r in neutrals)
        if math.hypot(hx, hy) / max(w, 1e-6) > 0.006:
            hn = math.degrees(math.atan2(hy, hx)) % 360
            kind = 'warm' if 20 <= hn <= 110 else 'kalt' if 180 <= hn <= 280 else 'marke'
            print(f'Licht der neutralen Töne: {hn:.0f}° → --neutral {kind}')
    if chroma:
        print(f'\nWeiter: python3 -I farben.py bauen --marke "{rgb_to_hex(best[1])}" --vorschau farben.html --css farben.css')
    return 0


def inventory(paths):
    found = {}
    for p in paths:
        src = open(p, encoding='utf-8', errors='replace').read()
        src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        for m in COLOR_RE.findall(src):
            if m.startswith('#') and len(m) not in (4, 5, 7, 9):
                continue
            rgb = parse_color(m) if not is_transparent(m) else None
            if rgb is None:
                continue
            hx = rgb_to_hex(rgb)
            found.setdefault(hx, []).append(m)
    print(f'{len(found)} verschiedene feste Farben gefunden (ohne Transparenzen):')
    items = sorted(found.items(), key=lambda kv: -len(kv[1]))
    for hx, uses in items:
        L, C, h = rgb_to_oklch(hex_to_rgb(hx))
        print(f'  {len(uses):4}×  {hx}  oklch({L:.3f} {C:.3f} {h:.0f})')
    rgbs = [(hx, hex_to_rgb(hx)) for hx, _ in items]
    dup = 0
    for i in range(len(rgbs)):
        for j in range(i + 1, len(rgbs)):
            d = delta_e_ok(rgbs[i][1], rgbs[j][1])
            if d < 0.02:
                dup += 1
                print(f'WARN  {rgbs[i][0]} und {rgbs[j][0]} fast gleich (ΔE {d:.3f}): ein Token daraus machen')
    chroma = [hx for hx, rgb in rgbs if rgb_to_oklch(rgb)[1] >= 0.04]
    if len(chroma) > 8:
        print(f'WARN  {len(chroma)} bunte Farben im Code: Rollen-Tokens statt fester Werte (website-farben, Abschnitt Rollen)')
    print(f'\nErgebnis: {dup} Fast-Dubletten')
    return 0


def share(path, accent_hex):
    from PIL import Image
    import numpy as np
    im = Image.open(path).convert('RGB')
    im.thumbnail((480, 480))
    a = np.asarray(im).reshape(-1, 3).astype(np.float64) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    lab = np.cbrt(lin @ M1.T) @ M2.T
    acc = np.array(rgb_to_oklab(parse_color(accent_hex)))
    d = np.sqrt(((lab - acc) ** 2).sum(1))
    acc_share = (d < 0.06).mean()
    chroma = (np.hypot(lab[:, 1], lab[:, 2]) >= 0.05).mean()
    print(f'Akzent-Fläche: {acc_share * 100:.1f} %   bunte Fläche gesamt: {chroma * 100:.1f} % (Fotos zählen mit)')
    if acc_share > 0.10:
        print('WARN  Akzent über 10 % des Bildschirms: er verliert seine Signalwirkung (Ausnahme: ein bewusstes Markenband)')
    else:
        print('OK    Akzent bleibt selten genug, um zu führen')
    return 0


# ------------------------------------------------------------------ Kommandozeile

def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'hilfe'):
        print(__doc__)
        return 0
    cmd = sys.argv[1]
    if cmd == 'kontrast':
        fg, bg = parse_color(sys.argv[2]), parse_color(sys.argv[3])
        r, lc = wcag_ratio(fg, bg), apca_lc(fg, bg)
        print(f'{rgb_to_hex(fg)} auf {rgb_to_hex(bg)}: WCAG {r:.2f}:1, APCA Lc {lc:+.1f}')
        print('  WCAG AA: Fließtext 4,5:1 ' + ('✓' if r >= 4.5 else '✗') + ' · groß/Symbole 3:1 ' + ('✓' if r >= 3 else '✗') +
              ' · AAA 7:1 ' + ('✓' if r >= 7 else '✗'))
        a = abs(lc)
        use = ('Fließtext bevorzugt (Lc 90)' if a >= 90 else 'Fließtext ab 18px (Lc 75)' if a >= 75 else
               'Inhaltstext ab 24px oder 16px fett (Lc 60)' if a >= 60 else 'Überschriften ab 36px oder 24px fett (Lc 45)' if a >= 45 else
               'Platzhalter, deaktiviert (Lc 30)' if a >= 30 else 'nur Dekor, keine Schrift' if a >= 15 else 'unsichtbar')
        print('  APCA reicht für: ' + use)
        for k in MACHADO:
            print(f'  {k}: {rgb_to_hex(simulate(fg, k))} auf {rgb_to_hex(simulate(bg, k))}')
        return 0
    if cmd == 'pruefen':
        if arg('--css'):
            raw = read_css_tokens(arg('--css'))
        elif arg('--design'):
            raw = read_design_md(arg('--design'))
        elif arg('--farben'):
            raw = read_pairs_arg(arg('--farben'))
        else:
            print('pruefen braucht --css, --design oder --farben')
            return 2
        roles = read_pairs_arg(arg('--rollen', ''))
        rep = check_palette(raw, roles, '--violett-ok' in sys.argv, '--matrix' in sys.argv)
        return 1 if rep.print() else 0
    if cmd == 'bauen':
        if not arg('--marke'):
            print('bauen braucht --marke "#hex" (aus Logo, Schild, Corporate Design oder aus-bild)')
            return 2
        res = build(arg('--marke'), arg('--akzent'), arg('--neutral', 'marke'), arg('--art', 'service'),
                    arg('--zweit'), dunkel='--nur-hell' not in sys.argv)
        css = css_block(res, arg('--art', 'service'))
        print(css)
        if arg('--css'):
            open(arg('--css'), 'w', encoding='utf-8').write(css + '\n')
        t = res['themes']['hell']
        print('\n/* taste-skill: node <skill>/scripts/start.mjs brand --page <kind> '
              f'--bg "{rgb_to_hex(t["bg"])}" --ink "{rgb_to_hex(t["ink"])}" --accent "{rgb_to_hex(t["accent"])}" '
              f'--surface "{rgb_to_hex(t["surface"])}" --muted "{rgb_to_hex(t["muted"])}" --type <id> --radius soft */')
        if arg('--json'):
            out = {m: {k: rgb_to_hex(v) for k, v in th.items()} for m, th in res['themes'].items()}
            out['ramp'] = {k: rgb_to_hex(v) for k, v in res['ramp'].items()}
            out['marke'] = rgb_to_hex(res['marke'])
            json.dump(out, open(arg('--json'), 'w'), indent=2)
        if arg('--vorschau'):
            preview_html(res, arg('--vorschau'))
            print(f'\nVorschau: {arg("--vorschau")}')
        fails = 0
        for mode, th in res['themes'].items():
            print(f'\n--- Prüfung {mode} ---')
            raw = {css_name(k): rgb_to_hex(v) for k, v in th.items()}
            rep = check_palette(raw, {'accentInk': 'accent-ink'}, violett_ok='--violett-ok' in sys.argv)
            fails += rep.print()
        return 1 if fails else 0
    if cmd == 'aus-bild':
        return from_image(sys.argv[2], int(arg('--n', 6)), '--logo' in sys.argv)
    if cmd == 'inventur':
        return inventory([p for p in sys.argv[2:] if not p.startswith('--')])
    if cmd == 'anteil':
        return share(sys.argv[2], arg('--akzent'))
    print('unbekannter Befehl: ' + cmd)
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main())
