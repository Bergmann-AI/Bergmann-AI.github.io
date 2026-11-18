#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform sampler2D uSky;
uniform vec2 uRes;
uniform vec2 uOffset;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
uniform float uFov;
uniform float uExpo;
uniform vec3 uSun;      // Richtung zur Sonne
uniform float uSunI;
uniform float uCove;
uniform float uAmb;
uniform float uWin;
uniform float uSkyI;
out vec4 fragColor;

const vec2 CAB_C = vec2(0.0, 0.95);
const vec2 CAB_H = vec2(1.18, 0.95);
const float CAB_R = 0.55;
const float WIN_P = 0.95;
const float PAIR_P = 2.9;
vec3 SUN;

float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdRR2(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

float winHole(vec3 p){
  float z = mod(p.z + 0.3, WIN_P) - WIN_P * 0.5;
  vec3 q = vec3(abs(p.x) - 1.22, p.y - 1.10, z);
  return sdRoundBox(q, vec3(0.32, 0.215, 0.158), 0.135);
}
float shell(vec3 p){
  float inner = sdRR2(p.xy - CAB_C, CAB_H, CAB_R);
  float outer = sdRR2(p.xy - CAB_C, CAB_H + 0.16, CAB_R + 0.16);
  float d = max(-inner, outer);
  d = max(d, -winHole(p));
  d = min(d, 15.5 - p.z);
  d = min(d, p.z + 3.0);
  return d;
}
float chair(vec3 c){
  // Clubsessel: weiches Sitzkissen, breite Armlehnen, geneigte Lehne mit Kopfteil
  float seat = sdRoundBox(c - vec3(0.0, 0.44, -0.02), vec3(0.25, 0.075, 0.27), 0.07);
  float base = sdRoundBox(c - vec3(0.0, 0.2, 0.03), vec3(0.29, 0.2, 0.27), 0.06);
  vec3 b = c - vec3(0.0, 0.84, 0.29);
  float ang = 0.18; float cs = cos(ang), sn = sin(ang);
  b.yz = vec2(b.y * cs + b.z * sn, -b.y * sn + b.z * cs);
  float back = sdRoundBox(b, vec3(0.29, 0.40, 0.10), 0.10);
  float cush = sdRoundBox(b - vec3(0.0, -0.02, -0.075), vec3(0.22, 0.32, 0.04), 0.05);
  vec3 a = c - vec3(0.0, 0.53, 0.02); a.x = abs(a.x) - 0.255;
  float arm = sdRoundBox(a, vec3(0.06, 0.13, 0.30), 0.06);
  float d = smin(base, arm, 0.05);
  d = smin(d, seat, 0.04);
  d = smin(d, back, 0.06);
  d = smin(d, cush, 0.03);
  return d;
}
// .x Abstand, .y Material
vec2 map(vec3 p){
  vec2 res = vec2(shell(p), 1.0);
  vec3 q = p; q.x = abs(q.x);
  float zc = mod(q.z - 0.6, PAIR_P) - PAIR_P * 0.5;
  float zz = abs(zc);
  float ch = chair(vec3(q.x - 0.62, q.y, zz - 0.68));
  if (ch < res.x) res = vec2(ch, 4.0);
  // Tisch zwischen den Sesseln
  vec3 tb = vec3(q.x - 0.70, q.y - 0.70, zc);
  float table = sdRoundBox(tb, vec3(0.27, 0.016, 0.31), 0.012);
  table = min(table, sdRoundBox(tb - vec3(0.12, -0.36, 0.0), vec3(0.035, 0.35, 0.035), 0.01));
  if (table < res.x) res = vec2(table, 6.0);
  // Sideboard unter den Fenstern
  float ledge = sdRoundBox(vec3(q.x - 1.09, q.y - 0.33, p.z - 6.0), vec3(0.15, 0.33, 9.5), 0.03);
  if (ledge < res.x) res = vec2(ledge, 5.0);
  float trim = sdRoundBox(vec3(q.x - 0.944, q.y - 0.664, p.z - 6.0), vec3(0.007, 0.007, 9.5), 0.004);
  if (trim < res.x) res = vec2(trim, 9.0);
  // Lichtvouten an der Decke
  float cove = sdRoundBox(vec3(q.x - 0.52, q.y - 1.835, p.z - 6.0), vec3(0.025, 0.01, 9.5), 0.008);
  if (cove < res.x) res = vec2(cove, 10.0);
  float panel = sdRoundBox(vec3(p.x, p.y - 1.86, p.z - 6.0), vec3(0.58, 0.05, 9.5), 0.015);
  if (panel < res.x) res = vec2(panel, 3.0);
  return res;
}
vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0007, 0.0);
  return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
}
vec3 srgb2lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 skyLook(vec3 rd){
  float side = sign(rd.x);
  float ax = abs(rd.x) + 1e-3;
  float u = clamp(0.5 + side * rd.z / ax * 0.30, 0.0, 1.0);
  float v = clamp(0.62 + rd.y / ax * 0.55, 0.0, 1.0);
  return srgb2lin(texture(uSky, vec2(u, v)).rgb) * uSkyI;
}
float trace(vec3 ro, vec3 rd, out float mat, float tmax){
  float t = 0.0; mat = -1.0;
  for (int i = 0; i < 260; i++){
    vec3 p = ro + rd * t;
    if (abs(p.x) > 1.45) { mat = 0.0; return t; } // durchs Fenster nach draußen
    vec2 h = map(p);
    if (h.x < 0.0004 * max(t, 1.0)) { mat = h.y; return t; }
    t += h.x * 0.9;
    if (t > tmax) break;
  }
  return t;
}
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.015;
  for (int i = 0; i < 90; i++){
    vec3 p = ro + rd * t;
    if (abs(p.x) > 1.42) return res;
    float h = map(p).x;
    res = min(res, 7.0 * h / t);
    if (res < 0.002) return 0.0;
    t += clamp(h, 0.006, 0.15);
    if (t > 5.0) break;
  }
  return 0.0;
}
float calcAO(vec3 p, vec3 n){
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 6; i++){
    float h = 0.015 + 0.07 * float(i);
    o += (h - map(p + n * h).x) * s; s *= 0.72;
  }
  return clamp(1.0 - 1.9 * o, 0.0, 1.0);
}
void material(vec3 p, float m, out vec3 alb, out float spec, out float gloss, out vec3 emi){
  emi = vec3(0.0); spec = 0.04; gloss = 8.0;
  if (m < 1.5) {
    if (p.y < 0.03) { // Boden
      float ax = abs(p.x);
      alb = ax < 0.33 ? vec3(0.085, 0.07, 0.055) : vec3(0.05, 0.042, 0.035);
      if (abs(ax - 0.335) < 0.008) { alb = vec3(0.5, 0.36, 0.18); spec = 0.5; gloss = 60.0; }
      float n = hash12(floor(p.xz * 300.0));
      alb *= 0.9 + 0.2 * n;
    } else if (p.y > 1.78) { alb = vec3(0.34, 0.29, 0.23); }
    else if (winHole(p) < 0.012) { alb = vec3(0.72, 0.60, 0.46); spec = 0.08; gloss = 20.0; emi = vec3(1.0, 0.62, 0.32) * 0.12 * uWin; } // Fensterlaibung
    else if (p.z > 15.4) { alb = vec3(0.10, 0.065, 0.04); spec = 0.25; gloss = 40.0; } // Holzwand hinten
    else {
      alb = vec3(0.075, 0.066, 0.058); // Wandverkleidung
      float seam = abs(mod(p.z + 0.3 + WIN_P * 0.5, WIN_P) - WIN_P * 0.5);
      if (seam > 0.46) alb *= 0.6;
      if (p.y < 0.72 && abs(p.x) > 1.0) alb = vec3(0.05, 0.043, 0.037);
    }
  } else if (m < 3.5) { alb = vec3(0.30, 0.26, 0.21); }
  else if (m < 4.5) { // Leder
    alb = vec3(0.030, 0.024, 0.020); spec = 0.12; gloss = 18.0;
    float st = abs(fract(p.y * 9.0) - 0.5);
    alb *= 0.92 + 0.08 * smoothstep(0.0, 0.06, st);
  }
  else if (m < 5.5) { alb = vec3(0.012, 0.011, 0.010); spec = 0.6; gloss = 110.0; } // Klavierlack
  else if (m < 6.5) { alb = vec3(0.016, 0.013, 0.011); spec = 0.7; gloss = 140.0; } // Tisch
  else if (m < 9.5) { alb = vec3(0.62, 0.44, 0.20); spec = 0.9; gloss = 80.0; } // Goldleiste
  else { alb = vec3(0.0); emi = vec3(1.0, 0.70, 0.40) * 3.0 * uCove; }
}
vec3 lightAt(vec3 p, vec3 n, vec3 rd, vec3 alb, float spec, float gloss, float ao){
  vec3 col = vec3(0.0);
  vec3 sunC = vec3(1.0, 0.66, 0.36) * uSunI * (spec > 0.11 && spec < 0.13 ? 0.35 : 1.0);
  float dif = max(dot(n, SUN), 0.0);
  float sh = dif > 0.0 ? softShadow(p + n * 0.003, SUN) : 0.0;
  col += alb * sunC * dif * sh * 0.55;
  vec3 h = normalize(SUN - rd);
  col += sunC * spec * pow(max(dot(n, h), 0.0), gloss) * sh * dif;
  // Vouten (Linienlicht)
  for (int s = -1; s <= 1; s += 2){
    vec3 lp = vec3(float(s) * 0.40, 1.70, p.z);
    vec3 l = lp - p; float d2 = dot(l, l); l /= sqrt(d2);
    float nl = max(dot(n, l), 0.0);
    vec3 cc = vec3(1.0, 0.72, 0.45) * uCove;
    col += alb * cc * nl * 0.55 / (0.35 + 1.2 * d2) * (0.3 + 0.7 * ao);
    vec3 hh = normalize(l - rd);
    col += cc * spec * pow(max(dot(n, hh), 0.0), gloss) * 0.5 / (0.6 + 4.0 * d2);
  }
  // Fensterlicht (nächstes Fenster links und rechts)
  float wz = (floor((p.z + 0.3) / WIN_P) + 0.5) * WIN_P - 0.3;
  for (int s = -1; s <= 1; s += 2){
    for (int k = -1; k <= 1; k++){
      vec3 wp = vec3(float(s) * 1.16, 1.10, wz + float(k) * WIN_P);
      vec3 l = wp - p; float d2 = dot(l, l); l /= sqrt(d2);
      float facing = max(dot(-l, vec3(-float(s), 0.0, 0.0)), 0.0);
      col += alb * vec3(1.0, 0.72, 0.48) * uWin * max(dot(n, l), 0.0) * facing / (0.25 + 6.0 * d2) * (0.35 + 0.65 * ao);
    }
  }
  col += alb * vec3(0.9, 0.75, 0.6) * uAmb * ao * (0.55 + 0.45 * n.y);
  return col;
}
vec3 render(vec3 ro, vec3 rd){
  float m;
  float t = trace(ro, rd, m, 30.0);
  if (m < 0.0) return vec3(0.0);
  if (m < 0.5) return skyLook(rd);
  vec3 p = ro + rd * t;
  vec3 n = calcNormal(p);
  vec3 alb, emi; float spec, gloss;
  material(p, m, alb, spec, gloss, emi);
  if (m > 9.5) return emi;
  float ao = calcAO(p, n);
  vec3 col = lightAt(p, n, rd, alb, spec, gloss, ao) + emi;
  // Spiegelung für glänzende Flächen
  if (spec > 0.15) {
    vec3 r = reflect(rd, n);
    float fres = spec + (1.0 - spec) * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    float m2; float t2 = trace(p + n * 0.004, r, m2, 8.0);
    vec3 rc = vec3(0.0);
    if (m2 > -0.5 && m2 < 0.5) rc = skyLook(r);
    else if (m2 > 9.5) rc = vec3(1.0, 0.70, 0.40) * 6.0 * uCove;
    else if (m2 > 0.5) {
      vec3 p2 = p + r * t2; vec3 n2 = calcNormal(p2);
      vec3 a2, e2; float s2, g2; material(p2, m2, a2, s2, g2, e2);
      rc = a2 * (vec3(0.9, 0.75, 0.6) * uAmb * 2.0 + vec3(1.0, 0.7, 0.45) * 0.4 * uCove);
      if (winHole(p2) < 0.02 && m2 < 1.5) rc = a2 * vec3(1.0, 0.7, 0.45) * uWin * 0.6;
    }
    float rough = clamp(40.0 / gloss, 0.0, 1.0);
    col += rc * fres * (1.0 - 0.6 * rough);
  }
  // leichter Dunst
  col = mix(col, vec3(0.05, 0.035, 0.025), 1.0 - exp(-t * 0.02));
  return col;
}
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
void main(){
  SUN = normalize(uSun);
  vec2 frag = gl_FragCoord.xy + uOffset;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  float foc = 0.5 / tan(uFov * 0.5);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + foc * ww);
  vec3 col = render(uCamPos, rd);
  col *= uExpo;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash12(frag * 1.37) - 0.5) / 255.0;
  fragColor = vec4(col, 1.0);
}
