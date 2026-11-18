#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec2 uRes;
uniform vec2 uOffset;
uniform float uPitch;   // camera pitch, negative looks down
uniform float uFov;     // vertical field of view (rad)
uniform float uSunAz;   // sun azimuth (rad), negative = left
uniform float uSunEl;   // sun elevation (rad)
uniform float uCamH;    // camera height above cloud base level
uniform float uExpo;    // exposure
uniform vec3 uShift;    // noise domain shift (variation)
uniform float uSteps;   // quality multiplier
uniform float uA1; uniform float uA2; uniform float uA3; uniform float uBig; uniform float uSunI; uniform float uAmb; uniform float uDen; uniform float uGlow; uniform float uHigh; uniform float uOd; uniform float uG; uniform vec3 uHaze; uniform float uA4; uniform float uFogD; uniform float uBase; uniform float uAmbLo; uniform vec3 uSunCol;
out vec4 fragColor;

const float Y_TOP = 0.55;
const float Y_BOT = -3.2;
vec3 SUN;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

float n3(vec3 p, int ch){ vec4 t = texture(uNoise, p); return ch==0?t.r:ch==1?t.g:ch==2?t.b:t.a; }

float surfaceH(vec3 p, bool hi){
  vec3 q = p + uShift;
  float big = texture(uNoise, vec3(q.x*0.0060, 0.37, q.z*0.0060)).r;
  float b1 = texture(uNoise, q*vec3(0.028, 0.040, 0.028)).g;
  float b2 = texture(uNoise, q*0.070 + 0.31).g;
  float b3 = texture(uNoise, q*0.150 + 0.17).b;
  float h = uA1*(b1 - 0.5) + uA2*(b2 - 0.5) + uA3*(b3 - 0.5);
  if(hi){
    h += uA4*(texture(uNoise, q*0.34 + 0.53).a - 0.5) + uA4*0.5*(texture(uNoise, q*0.75 + 0.71).a - 0.5) + uA4*0.25*(texture(uNoise, q*1.6 + 0.29).b - 0.5);
  }
  return uBase + h + uBig*(big - 0.6);
}
float mapD(vec3 p, bool hi){
  float s = surfaceH(p, hi);
  return clamp((s - p.y) * uDen, 0.0, 1.0);
}

float hg(float c, float g){ float g2 = g*g; return (1.0 - g2) / pow(1.0 + g2 - 2.0*g*c, 1.5); }

vec3 hazeCol(vec3 rd){
  float az = atan(rd.x, rd.z) - atan(SUN.x, SUN.z);
  float core = exp(-az*az/0.006);
  float wide = exp(-az*az/0.12);
  return uHaze + vec3(1.0, 0.50, 0.17) * (0.55*uGlow*core + 0.30*wide);
}
vec3 skyCol(vec3 rd){
  float sun = max(dot(rd, SUN), 0.0);
  float h = rd.y;
  vec3 zen = vec3(0.017, 0.016, 0.016);
  vec3 mid = vec3(0.050, 0.040, 0.031);
  vec3 hor = vec3(0.36, 0.19, 0.065);
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.05, h));
  col = mix(col, zen, smoothstep(0.04, 0.42, h));
  float az = atan(rd.x, rd.z) - atan(SUN.x, SUN.z);
  float dh = max(h, 0.0);
  float core = exp(-az*az/0.014) * exp(-dh*170.0) + 0.55*exp(-az*az/0.0018) * exp(-dh*80.0) + 0.30*exp(-az*az/0.03) * exp(-dh*35.0);
  float wide = exp(-az*az/0.16) * exp(-dh*12.0);
  float band = exp(-dh*75.0);
  col += vec3(1.0, 0.50, 0.16) * (uGlow*core + 0.32*wide) + vec3(0.95, 0.48, 0.14) * 0.38 * band;
  
  return col;
}

// thin high cloud streaks in the upper sky
vec3 highClouds(vec3 ro, vec3 rd, vec3 col){
  if(rd.y <= 0.002) return col;
  float t = (7.0 - ro.y) / rd.y;
  vec3 p = ro + rd * t;
  vec2 q = p.xz * vec2(0.010, 0.030) + uShift.xz*0.01;
  float n = texture(uNoise, vec3(q.x, 0.61, q.y)).g * 0.6 + texture(uNoise, vec3(q.x*2.3, 0.21, q.y*2.3)).b * 0.4;
  n = smoothstep(0.42, 0.85, n);
  float fade = smoothstep(0.004, 0.05, rd.y) * (1.0 - smoothstep(0.25, 0.6, rd.y));
  float sun = max(dot(rd, SUN), 0.0);
  vec3 lit = vec3(0.95, 0.58, 0.28) * (0.25 + 1.6 * pow(sun, 8.0));
  vec3 dark = col * 0.55;
  vec3 cc = mix(dark, lit, 0.35 + 0.65*pow(sun, 4.0));
  return mix(col, cc, n * fade * uHigh);
}

vec4 march(vec3 ro, vec3 rd, vec3 fogCol){
  if(rd.y >= -0.0004) return vec4(0.0, 0.0, 0.0, 1.0);
  float tIn = max((ro.y - Y_TOP) / (-rd.y), 0.0);
  float tOut = min((ro.y - Y_BOT) / (-rd.y), 220.0);
  vec3 sum = vec3(0.0); float T = 1.0;
  float cosT = dot(rd, SUN);
  float phase = mix(hg(cosT, uG), hg(cosT, -0.15), 0.3);
  vec3 sunC = uSunCol * uSunI;
  float t = tIn;
  float dt0 = max(0.035, 0.018 * t) / uSteps;
  t += hash12(gl_FragCoord.xy + uOffset) * dt0;
  for(int i = 0; i < 700; i++){
    if(t > tOut || T < 0.004) break;
    float dt = max(0.035, 0.018 * t) / uSteps;
    vec3 pos = ro + rd * t;
    float den = mapD(pos, t < 60.0);
    if(den > 0.0005){
      float od = mapD(pos + SUN * 0.15, false) * 0.15
               + mapD(pos + SUN * 0.45, false) * 0.30
               + mapD(pos + SUN * 1.00, false) * 0.55
               + mapD(pos + SUN * 2.00, false) * 1.00
               + mapD(pos + SUN * 4.00, false) * 2.00
               + mapD(pos + SUN * 8.00, false) * 4.00;
      float Tl = exp(-od * uOd);
      float hf = clamp((pos.y - (surfaceH(pos, false) - 1.6)) / 1.6, 0.0, 1.0); // depth below local top
      float topness = clamp(1.0 - (surfaceH(pos,false) - pos.y) * 1.1, 0.0, 1.0);
      vec3 amb = vec3(1.0, 0.86, 0.72) * uAmb * mix(uAmbLo, 1.0, topness*topness);
      float powder = 1.0 - exp(-den * 6.0);
      vec3 L = sunC * Tl * phase * (0.35 + 0.65 * powder) + amb;
      float fogA = 1.0 - exp(-pow(t / uFogD, 1.8));
      L = mix(L, fogCol, fogA);
      float sigma = den * 3.4;
      float a = 1.0 - exp(-sigma * dt);
      sum += T * a * L;
      T *= 1.0 - a;
    }
    t += dt;
  }
  return vec4(sum, T);
}

vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }

void main(){
  vec2 frag = gl_FragCoord.xy + uOffset;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  float foc = 0.5 / tan(uFov * 0.5);
  vec3 rd = normalize(vec3(uv.x, uv.y, foc));
  float cp = cos(uPitch), sp = sin(uPitch);
  rd = vec3(rd.x, rd.y * cp + rd.z * sp, -rd.y * sp + rd.z * cp);
  SUN = normalize(vec3(sin(uSunAz) * cos(uSunEl), sin(uSunEl), cos(uSunAz) * cos(uSunEl)));
  vec3 ro = vec3(0.0, uCamH, 0.0);

  vec3 horizonRd = normalize(vec3(rd.x, 0.004, rd.z));
  vec3 fogCol = mix(uHaze, skyCol(normalize(vec3(rd.x, 0.0, rd.z))), 0.9 * exp(-max(-rd.y, 0.0) * 14.0));
  vec3 col;
  if(rd.y > 0.0){
    col = skyCol(rd);
    col = highClouds(ro, rd, col);
  } else {
    vec4 cl = march(ro, rd, fogCol);
    // what lies beyond: far haze near horizon, dark depths below
    float tBot = (ro.y - Y_BOT) / max(-rd.y, 1e-4);
    vec3 depth = mix(vec3(0.006, 0.005, 0.004), fogCol, 1.0 - exp(-pow(tBot / (uFogD*1.6), 2.4)));
    vec3 beyond = tBot > 220.0 ? fogCol : depth;
    col = cl.rgb + cl.a * beyond;
  }
  col *= uExpo;
  col = aces(col);
  col = pow(col, vec3(1.0/2.2));
  // grade: lift blacks slightly toward warm grey, soften saturation
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.86);
  col = col * 0.96 + vec3(0.030, 0.025, 0.021);
  // dither
  col += (hash12(frag * 1.37) - 0.5) / 255.0;
  fragColor = vec4(col, 1.0);
}
