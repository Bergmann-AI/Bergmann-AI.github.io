#version 300 es
// Business-Jet in Draufsicht (orthografisch, Kamera schaut senkrecht nach unten).
// Alles in Rumpflängen L: Bugspitze z = 0, Heck z = 1, x nach rechts, y zur Kamera.
// Jede Fläche ist ein Höhenfeld y(x, z); sichtbar ist die höchste. Ausgabe mit Alpha.
precision highp float;
uniform vec2 uRes;
uniform vec2 uOffset;
uniform float uBoxW;   // Bildbreite in L
uniform float uBoxH;   // Bildhöhe in L
uniform float uZ0;     // z am oberen Bildrand
uniform float uExpo;
uniform float uSBL;    // Softbox links
uniform float uSBR;    // Softbox rechts
uniform float uStrip;  // Lichtleiste oben (Rückenlinie)
uniform float uHorW;   // Horizont warm (links)
uniform float uHorC;   // Horizont kühl (rechts)
uniform float uGround; // Boden (beige)
uniform float uMode;   // 0 Farbe, 1 nur Maske
uniform float uSky;    // weicher Himmel
uniform float uNacHi;  // Glanzstreifen Gondel
uniform float uRing;   // Helligkeit Chromringe
uniform float uFrontW; // Licht vorne links
uniform float uFrontC; // Licht vorne rechts
uniform float uRim;    // Lichtkante Vorderkanten
out vec4 fragColor;

const float RF = 0.0545;           // Rumpfradius
const float NO_HIT = -1e9;

// ---------------- Rumpf ----------------
float fusR(float z) {
  if (z < 0.0 || z > 0.995) return -1.0;
  if (z < 0.26) { float t = z / 0.26; return RF * (1.0 - pow(1.0 - t, 2.33)); }
  if (z < 0.76) return RF;
  if (z < 0.875) { float t = (z - 0.76) / 0.115; float s = t * t * (3.0 - 2.0 * t); return RF - (RF - 0.020) * s; }
  return mix(0.020, 0.004, (z - 0.875) / 0.12);
}
float hFus(float x, float z) {
  float r = fusR(z);
  if (r <= 0.0 || abs(x) >= r) return NO_HIT;
  return sqrt(r * r - x * x);
}

// ---------------- Triebwerke ----------------
const float NX = 0.0870;   // Mitte der Gondel
const float NY = 0.012;    // Höhe der Gondelachse
float nacR(float z) {
  if (z < 0.607 || z > 0.784) return -1.0;
  if (z < 0.628) { float q = (0.628 - z) / 0.021; return 0.0310 * sqrt(max(1.0 - q * q * q * q, 0.0)); }
  if (z < 0.70) return 0.0310;
  if (z < 0.762) return mix(0.0310, 0.0262, smoothstep(0.70, 0.762, z));
  float q = (z - 0.762) / 0.022; return mix(0.0262, 0.0236, q) * sqrt(max(1.0 - pow(q, 6.0), 0.0));
}
float hNac(float x, float z) {
  float r = nacR(z);
  float dx = abs(x) - NX;
  if (r <= 0.0 || abs(dx) >= r) return NO_HIT;
  return NY + sqrt(r * r - dx * dx);
}
// Pylon zwischen Rumpf und Gondel
float hPyl(float x, float z) {
  float ax = abs(x);
  if (ax < 0.035 || ax > 0.066 || z < 0.655 || z > 0.742) return NO_HIT;
  float e = min(smoothstep(0.655, 0.67, z), 1.0 - smoothstep(0.725, 0.742, z));
  return 0.012 + 0.008 * e;
}

// ---------------- Tragflächen ----------------
float wingLE(float ax) {
  float le = 0.4235 + max(ax - 0.053, 0.0) * 0.59;
  le -= 0.014 * (1.0 - smoothstep(0.053, 0.085, ax));   // Übergang zum Rumpf
  return le;
}
float wingTE(float ax) {
  if (ax < 0.113) return 0.578;
  return 0.600 + (ax - 0.113) * 0.17;
}
float naca(float c) {   // Dickenverteilung, Maximum 1 bei c ~ 0,3
  c = clamp(c, 0.0, 1.0);
  return 2.0 * 5.0 * (0.2969 * sqrt(c) - 0.1260 * c - 0.3516 * c * c + 0.2843 * c * c * c - 0.1036 * c * c * c * c);
}
float hWing(float x, float z, out float chord) {
  float ax = abs(x);
  chord = 0.0;
  if (ax > 0.392) return NO_HIT;
  float le = wingLE(ax), te = wingTE(ax);
  if (z < le || z > te) return NO_HIT;
  float c = (z - le) / (te - le);
  chord = c;
  // Flügelspitze leicht gerundet
  float tip = 1.0 - smoothstep(0.383, 0.392, ax) * smoothstep(0.0, 0.25, 0.25 - abs(c - 0.5) + 0.25);
  if (ax > 0.383 && (ax - 0.383) > 0.009 * sqrt(max(1.0 - pow(abs(c - 0.5) * 2.0, 2.0), 0.0))) return NO_HIT;
  float th = mix(0.0078, 0.0028, clamp((ax - 0.053) / 0.34, 0.0, 1.0));
  float yc = -0.022 + 0.06 * max(ax - 0.053, 0.0);
  return yc + th * naca(c);
}
// Winglet: schmale, nach oben-hinten gebogene Spitze
float hWinglet(float x, float z) {
  float ax = abs(x);
  if (ax < 0.384 || ax > 0.399) return NO_HIT;
  float s = (ax - 0.384) / 0.015;               // 0 innen .. 1 außen
  float le = mix(0.611, 0.656, s * s);
  float te = mix(0.645, 0.684, s);
  if (z < le || z > te) return NO_HIT;
  float c = (z - le) / (te - le);
  float base = -0.022 + 0.06 * (0.384 - 0.053) + 0.0028;
  return base + 0.03 * s + 0.0016 * naca(c);
}

// ---------------- Leitwerk ----------------
float finTop(float z) {
  if (z < 0.80 || z > 1.0) return NO_HIT;
  float r0 = max(fusR(z), 0.0);
  if (z < 0.905) return mix(fusR(0.80), 0.112, smoothstep(0.80, 0.905, z));
  return 0.112;
}
float hFin(float x, float z) {
  float t = finTop(z);
  if (t == NO_HIT) return NO_HIT;
  float hw = mix(0.0048, 0.0028, smoothstep(0.80, 1.0, z));
  if (abs(x) >= hw) return NO_HIT;
  return t + sqrt(hw * hw - x * x) * 0.6;
}
float hStab(float x, float z, out float chord) {
  float ax = abs(x);
  chord = 0.0;
  if (ax > 0.212) return NO_HIT;
  float le = 0.872 + ax * (0.097 / 0.203);
  float te = 0.950 + ax * (0.056 / 0.206);
  if (z < le || z > te) return NO_HIT;
  float c = (z - le) / (te - le);
  chord = c;
  if (ax > 0.203 && (ax - 0.203) > 0.009 * sqrt(max(1.0 - pow(abs(c - 0.5) * 2.0, 2.0), 0.0))) return NO_HIT;
  float th = mix(0.0042, 0.0018, ax / 0.212);
  return 0.114 - 0.05 * ax + th * naca(c);
}

// ---------------- Szene ----------------
// id: 0 nichts, 1 Rumpf, 2 Gondel, 3 Pylon, 4 Flügel, 5 Winglet, 6 Seitenleitwerk, 7 Höhenleitwerk
float sceneH(float x, float z, out float id, out float chord) {
  float h = NO_HIT; id = 0.0; chord = 0.0; float c;
  float v;
  v = hWing(x, z, c);   if (v > h) { h = v; id = 4.0; chord = c; }
  v = hWinglet(x, z);   if (v > h) { h = v; id = 5.0; }
  v = hPyl(x, z);       if (v > h) { h = v; id = 3.0; }
  v = hNac(x, z);       if (v > h) { h = v; id = 2.0; }
  v = hFus(x, z);       if (v > h) { h = v; id = 1.0; }
  v = hFin(x, z);       if (v > h) { h = v; id = 6.0; }
  v = hStab(x, z, c);   if (v > h) { h = v; id = 7.0; chord = c; }
  return h;
}
float compH(float id, float x, float z) {
  float c;
  if (id < 1.5) return hFus(x, z);
  if (id < 2.5) return hNac(x, z);
  if (id < 3.5) return hPyl(x, z);
  if (id < 4.5) return hWing(x, z, c);
  if (id < 5.5) return hWinglet(x, z);
  if (id < 6.5) return hFin(x, z);
  return hStab(x, z, c);
}
vec3 normalOf(float id, float x, float z, float h, float e) {
  float hx1 = compH(id, x + e, z), hx0 = compH(id, x - e, z);
  float hz1 = compH(id, x, z + e), hz0 = compH(id, x, z - e);
  float dx, dz;
  if (hx1 == NO_HIT && hx0 == NO_HIT) dx = 0.0;
  else if (hx1 == NO_HIT) dx = (h - hx0) / e * 4.0;      // Kante: steil abfallend
  else if (hx0 == NO_HIT) dx = (hx1 - h) / e * 4.0;
  else dx = (hx1 - hx0) / (2.0 * e);
  if (hz1 == NO_HIT && hz0 == NO_HIT) dz = 0.0;
  else if (hz1 == NO_HIT) dz = (h - hz0) / e * 4.0;
  else if (hz0 == NO_HIT) dz = (hz1 - h) / e * 4.0;
  else dz = (hz1 - hz0) / (2.0 * e);
  // Höhenfeld y = f(x, z): Normale (-df/dx, 1, -df/dz)
  return normalize(vec3(-dx, 1.0, -dz));
}

// ---------------- Umgebung (Studio im Abendlicht) ----------------
vec3 env(vec3 r) {
  float up = r.y;
  float hl = max(length(r.xz), 1e-4);
  float side = r.x / hl;                 // -1 links .. +1 rechts
  vec3 warm = vec3(1.0, 0.70, 0.40);
  vec3 cool = vec3(0.86, 0.87, 0.90);
  vec3 tint = mix(warm * uHorW, cool * uHorC, smoothstep(-0.3, 0.45, side)) * (0.35 + 0.65 * abs(side));
  vec3 c = vec3(0.010, 0.0095, 0.009);
  // weicher Horizont
  c += tint * 0.16 * smoothstep(0.40, 0.05, up) * smoothstep(-0.30, -0.02, up);
  // heller Ring unter dem Horizont: dünne Lichtkante an Rumpf, Gondeln und Vorderkanten
  c += tint * smoothstep(-0.50, -0.56, up) * smoothstep(-0.74, -0.66, up);
  // Boden darunter dunkel
  c += vec3(0.06, 0.05, 0.04) * uGround * smoothstep(-0.70, -0.95, up);
  // weicher Himmel, links heller
  c += vec3(0.95, 0.84, 0.68) * uSky * smoothstep(0.15, 0.85, up) * (0.25 + 0.75 * smoothstep(0.4, -0.6, side));
  // zwei lange Softboxen über dem Flugzeug
  float along = smoothstep(0.85, 0.55, abs(r.z));
  float sbl = smoothstep(0.30, 0.10, abs(r.x + 0.52)) * along * smoothstep(0.25, 0.45, up);
  float sbr = smoothstep(0.20, 0.08, abs(r.x - 0.50)) * along * smoothstep(0.25, 0.45, up);
  c += vec3(1.0, 0.90, 0.78) * sbl * uSBL + vec3(0.92, 0.93, 0.96) * sbr * uSBR;
  // schmale Lichtleiste genau darüber
  float st = smoothstep(0.025, 0.008, abs(r.x)) * smoothstep(0.95, 0.75, abs(r.z)) * smoothstep(0.6, 0.8, up);
  c += vec3(1.0, 0.96, 0.9) * st * uStrip;
  // warmes Fensterlicht vorne links, kühles vorne rechts (Glanz an Nase, Vorderkanten, Gondeln)
  vec3 fl = normalize(vec3(-0.62, 0.42, -0.66)), fr = normalize(vec3(0.62, 0.42, -0.66));
  c += vec3(1.0, 0.74, 0.46) * uFrontW * pow(max(dot(r, fl), 0.0), 10.0);
  c += vec3(0.88, 0.89, 0.92) * uFrontC * pow(max(dot(r, fr), 0.0), 14.0);
  // Sonne vorne links (kleiner Glanzpunkt)
  vec3 sun = normalize(vec3(-0.62, 0.58, -0.52));
  c += vec3(1.0, 0.84, 0.62) * pow(max(dot(r, sun), 0.0), 1400.0) * 60.0;
  return c;
}

vec3 aces(vec3 x) { const float a = 2.51, b = 0.03, cc = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (cc * x + d) + e), 0.0, 1.0); }

struct Mat { vec3 base; float f0; float metal; float rough; };

vec3 shade(vec3 N, Mat m) {
  vec3 V = vec3(0.0, 1.0, 0.0);
  float nv = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  vec3 refl = env(R);
  if (m.rough > 0.0) {   // matter: Umgebung leicht verwischt
    vec3 t1 = normalize(cross(N, vec3(0.0, 0.0, 1.0)));
    vec3 t2 = cross(N, t1);
    refl = (refl + env(normalize(R + t1 * m.rough)) + env(normalize(R - t1 * m.rough)) + env(normalize(R + t2 * m.rough)) + env(normalize(R - t2 * m.rough))) / 5.0;
  }
  vec3 Lk = normalize(vec3(-0.55, 0.65, -0.5));
  float diff = max(dot(N, Lk), 0.0);
  if (m.metal > 0.5) {
    vec3 F = m.base + (1.0 - m.base) * pow(1.0 - nv, 5.0);
    return refl * F + m.base * 0.04 * diff;
  }
  float F = m.f0 + (1.0 - m.f0) * pow(1.0 - nv, 5.0);
  return m.base * (0.18 + 1.4 * diff) + refl * F;
}

float ellipse(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return length(q); }

void main() {
  vec2 frag = gl_FragCoord.xy + uOffset;
  float px = uBoxW / uRes.x;                 // L je Pixel
  float x = (frag.x / uRes.x - 0.5) * uBoxW;
  float z = uZ0 + (1.0 - frag.y / uRes.y) * uBoxH;
  float id, chord;
  float h = sceneH(x, z, id, chord);
  if (h == NO_HIT) { fragColor = vec4(0.0); return; }
  if (uMode > 0.5) { fragColor = vec4(1.0); return; }
  vec3 N = normalOf(id, x, z, h, px * 0.5);
  float ax = abs(x);

  Mat paint = Mat(vec3(0.0065, 0.006, 0.0058), 0.05, 0.0, 0.0);
  Mat chrome = Mat(vec3(0.86, 0.85, 0.82), 1.0, 1.0, 0.0);
  Mat glass = Mat(vec3(0.030, 0.036, 0.044), 0.12, 0.0, 0.0);
  vec3 col;

  if (id < 1.5) {
    // ---------- Rumpf ----------
    col = shade(N, paint);
    // Cockpitscheibe: Bogen aus zwei Scheiben (wie im Original), darunter lange, schmale Seitenfenster
    float rr = fusR(z);
    float u = ax / max(rr, 0.001);
    float zTop = 0.116 + 28.0 * ax * ax;
    float zBot = 0.156 + 16.0 * ax * ax;
    float ex = 0.0405;
    bool pane = z > zTop && z < zBot && ax < ex;
    float sw = clamp((z - 0.165) / 0.095, 0.0, 1.0);
    float uIn = 0.835 + 0.085 * sw, uOut = 0.975 - 0.035 * sw;
    bool sidew = z > 0.165 && z < 0.26 && u > uIn && u < uOut;
    if (pane) {
      float g = ax / ex;
      col = shade(N, glass) * 0.4 + mix(vec3(0.008, 0.014, 0.018), vec3(0.050, 0.068, 0.078), g * g) * (1.0 - 0.6 * (z - zTop) / max(zBot - zTop, 0.001));
    }
    if (sidew) col = shade(N, glass) * 0.4 + vec3(0.006, 0.009, 0.011);
    float fw = 0.0016;
    float fu = fw / max(rr, 0.001);
    float frame = 0.0;
    float dTop = abs(z - zTop) / sqrt(1.0 + pow(56.0 * ax, 2.0));
    float dBot = abs(z - zBot) / sqrt(1.0 + pow(32.0 * ax, 2.0));
    if (dTop < fw && ax < ex + fw) frame = 1.0;                                           // Bogen oben
    if (dBot < fw && ax < ex + fw) frame = 1.0;                                           // Bogen unten
    if (ax < fw * 0.9 && z > zTop && z < zBot) frame = 1.0;                              // Mittelpfosten
    if (abs(ax - ex) < fw && z > zTop - fw && z < zBot + fw) frame = 1.0;               // äußere Kante
    if ((abs(u - uIn) < fu || abs(u - uOut) < fu) && z > 0.163 && z < 0.262) frame = 1.0;  // Seitenfenster
    // kleine Antenne über dem Mittelpfosten
    if (z > 0.097 && z < 0.116 && ax < 0.0011 * (z - 0.097) / 0.019 + 0.0003) frame = 1.0;
    if (frame > 0.0) col = shade(N, chrome) * 0.95 + vec3(0.05);
    // Kabinenfenster: 7 je Seite
    for (int i = 0; i < 7; i++) {
      float zc = 0.292 + float(i) * 0.0352;
      float e = ellipse(vec2(ax, z), vec2(0.0452, zc), vec2(0.0033, 0.0064));
      if (e < 1.0) {
        vec3 wc = vec3(0.44, 0.39, 0.30) * (0.7 + 0.3 * N.y) + env(reflect(vec3(0.0, -1.0, 0.0), N)) * 0.05;
        col = e > 0.80 ? shade(N, chrome) * 0.55 : wc;
      }
    }
    // feine Antennen/Lichter auf der Rückenlinie
    if (ax < 0.0008 && ((z > 0.066 && z < 0.073) || (z > 0.36 && z < 0.368) || (z > 0.515 && z < 0.523))) col += vec3(0.22);
  } else if (id < 2.5) {
    // ---------- Triebwerksgondel ----------
    col = shade(N, paint);
    float u = (x - sign(x) * NX) / max(nacR(z), 0.001);   // -1 linker Rand .. +1 rechter Rand der Gondel
    col += vec3(0.30, 0.27, 0.24) * uNacHi * exp(-pow((u + 0.42) / 0.16, 2.0)) * smoothstep(0.62, 0.66, z) * (1.0 - smoothstep(0.73, 0.76, z));
    col += vec3(0.02, 0.02, 0.022) * uNacHi * exp(-pow((u - 0.45) / 0.12, 2.0)) * smoothstep(0.62, 0.66, z) * (1.0 - smoothstep(0.73, 0.76, z));
    bool ringF = z < 0.636;
    bool ringR = z > 0.750 && z < 0.772;
    bool nozzle = z >= 0.772;
    if (ringF) col = shade(N, chrome) * uRing * 0.75;
    if (ringR) col = shade(N, chrome) * uRing * 1.25;
    if (nozzle) col = shade(N, Mat(vec3(0.02, 0.02, 0.02), 0.08, 0.0, 0.0)) * 0.7;
    // feine Linie in der Mitte des Chromrings
    if ((ringF && abs(z - 0.6285) < 0.0008) || (ringR && abs(z - 0.7615) < 0.0007)) col *= 0.7;
  } else if (id < 3.5) {
    col = shade(N, paint) * 0.6;
  } else if (id < 4.5) {
    // ---------- Flügel ----------
    col = shade(N, paint);
    // Lichtkante an der Vorderkante: links golden, rechts silbern
    vec3 rimC = x < 0.0 ? vec3(1.0, 0.76, 0.46) : vec3(0.92, 0.92, 0.94);
    col += rimC * uRim * pow(clamp(-N.z, 0.0, 1.0), 2.2) * (1.0 - smoothstep(0.0, 0.06, chord));
    // Klappen- und Querruderlinien, Klappenschienen
    float hinge = 0.73;
    bool flapZone = ax > 0.07 && ax < 0.30;
    bool ailZone = ax > 0.305 && ax < 0.372;
    float lw = 0.0011 / max(wingTE(ax) - wingLE(ax), 0.02);
    if ((flapZone || ailZone) && abs(chord - hinge) < lw) col += vec3(0.055, 0.052, 0.05);
    if (abs(ax - 0.30) < 0.0009 && chord > hinge) col += vec3(0.05);
    if (abs(ax - 0.372) < 0.0009 && chord > hinge) col += vec3(0.05);
    for (int k = 0; k < 3; k++) {
      float xs = 0.12 + float(k) * 0.065;
      if (abs(ax - xs) < 0.0018 && chord > 0.70) col = mix(col, shade(N, paint) + vec3(0.035), 0.8);
    }
    // Spoiler-Linie
    if (ax > 0.09 && ax < 0.27 && abs(chord - 0.6) < lw * 0.8) col += vec3(0.03);
  } else if (id < 5.5) {
    col = shade(N, paint) * 0.45 + vec3(0.012);
  } else if (id < 6.5) {
    col = shade(N, paint) + vec3(0.06);
  } else {
    // ---------- Höhenleitwerk ----------
    col = shade(N, paint);
    vec3 rimS = x < 0.0 ? vec3(1.0, 0.76, 0.46) : vec3(0.92, 0.92, 0.94);
    col += rimS * uRim * 0.8 * pow(clamp(-N.z, 0.0, 1.0), 2.2) * (1.0 - smoothstep(0.0, 0.08, chord));
    float lw = 0.001 / 0.06;
    if (abs(chord - 0.70) < lw && ax > 0.02 && ax < 0.19) col += vec3(0.04);
  }

  col *= uExpo;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
