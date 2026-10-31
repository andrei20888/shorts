// GLSL building blocks shared by the procedural materials (all deterministic in `time`).
export const NOISE = /* glsl */`
  float hash1(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash1(i+vec3(0,0,0)),hash1(i+vec3(1,0,0)),f.x),
                   mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),f.x),
                   mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
  float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.11+vec3(3.1,1.7,5.2); a*=0.5; } return s; }
`;

export const SPHERE_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vView;
  void main(){
    vUv = uv; vN = normalize(normalMatrix * normal); vP = position;
    vec4 mv = modelViewMatrix * vec4(position,1.0); vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Gas giant: banded, domain-warped, lambert-lit with limb darkening. Palette uniforms allow Saturn/Jupiter variants.
export const GAS_GIANT_FRAG = /* glsl */`
  precision highp float; ${''}
  uniform float time; uniform vec3 lightDir; uniform vec3 c0,c1,c2,c3,c4; uniform float spot;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vView;
  ${NOISE}
  void main(){
    vec3 p = normalize(vP);
    float lat = p.y; float lon = atan(p.z,p.x);
    float warp = fbm(vec3(lon*2.0 + time*0.03, lat*6.0, 2.0))*0.35 + fbm(vec3(lon*7.0, lat*22.0 + time*0.02, 5.0))*0.08;
    float band = lat*11.0 + warp*3.0;
    float s = sin(band*3.14159) * 0.5 + 0.5;
    float s2 = sin(band*7.3 + 1.3) * 0.5 + 0.5;
    vec3 col = mix(c0, c1, smoothstep(0.2,0.8,s));
    col = mix(col, c2, smoothstep(0.55,0.95,s2) * 0.6);
    col = mix(col, c3, smoothstep(0.75,1.0, fbm3(vec3(lon*9.0, lat*30.0, 9.0+time*0.01)))*0.35);
    // great red spot (optional)
    if (spot > 0.5) {
      vec2 q = vec2(mod(lon + 0.9 + time*0.004, 6.28318) - 3.14159, lat + 0.22);
      q.x /= 1.9; float d = length(q*vec2(1.0,2.4));
      float sw = fbm3(vec3(q*10.0, 3.0))*0.25;
      col = mix(col, c4, smoothstep(0.32+sw, 0.08, d));
    }
    float NdL = clamp(dot(normalize(vN), normalize(lightDir)), 0.0, 1.0);
    float NdV = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
    float limb = pow(NdV, 0.35);
    float light = pow(NdL, 0.9) * limb;
    vec3 out_c = col * (0.035 + 1.25*light);
    out_c += vec3(0.35,0.55,1.0) * pow(1.0-NdV, 5.0) * NdL * 0.25; // thin atmosphere rim
    gl_FragColor = vec4(out_c, 1.0);
  }
`;

// Star surface: granulation / convection cells, emissive HDR output, limb darkening, soft edge.
export const STAR_FRAG = /* glsl */`
  precision highp float;
  uniform float time; uniform float cellScale; uniform float speed; uniform float brightness; uniform float limbPow;
  uniform vec3 hot, mid, cool; uniform float laneAmt;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vView;
  ${NOISE}
  void main(){
    vec3 p = normalize(vP);
    float n1 = fbm(p*cellScale + vec3(0.0, time*speed, time*speed*0.4));
    float n2 = fbm(p*cellScale*3.1 + vec3(time*speed*0.7, 0.0, 5.0));
    float n = n1*0.65 + n2*0.35;
    float lanes = smoothstep(0.36, 0.54, n1);
    vec3 col = mix(cool, mid, smoothstep(0.30, 0.62, n));
    col = mix(col, hot, pow(smoothstep(0.50, 0.80, n), 1.5));
    col *= (1.0 - laneAmt) + laneAmt*lanes;
    float NdV = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
    float limb = pow(NdV, limbPow);
    col *= (0.25 + 0.75*limb) * brightness;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Atmosphere rim (front side, additive): fresnel glow in blue.
export const ATMO_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 color; uniform float power; uniform float intensity; uniform vec3 lightDir;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vView;
  void main(){
    float NdV = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
    float NdL = clamp(dot(normalize(vN), normalize(lightDir))*0.6+0.4, 0.0, 1.0);
    float f = pow(1.0 - NdV, power);
    gl_FragColor = vec4(color * f * intensity * NdL, f * NdL);
  }
`;

// Outer halo (back side, additive) for stars / glow bodies.
export const HALO_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 color; uniform float power; uniform float intensity;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vView;
  void main(){
    float NdV = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
    float f = pow(NdV, power);
    gl_FragColor = vec4(color * f * intensity, f);
  }
`;

// Deep space background: gradient + nebula + two procedural star layers with zoom parallax.
export const BG_FRAG = /* glsl */`
  precision highp float;
  uniform vec2 res; uniform float time; uniform float zoom; uniform float nebulaAmt; uniform float dim;
  varying vec2 vUv;
  ${NOISE}
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  vec3 stars(vec2 uv, float scale, float density, float size, float bright){
    vec2 g = uv*scale; vec2 id = floor(g); vec2 f = fract(g);
    vec3 acc = vec3(0.0);
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
      vec2 o = vec2(float(x),float(y)); vec2 cid = id+o;
      float h = hash2(cid);
      if (h > density) continue;
      vec2 pos = o + vec2(hash2(cid+1.3), hash2(cid+7.7));
      float d = length(f-pos);
      float tw = 0.75 + 0.25*sin(time*(1.5+h*3.0) + h*40.0);
      float s = size*(0.5+h*1.2);
      float core = smoothstep(s, 0.0, d);
      float glow = exp(-d*d/(s*s*30.0))*0.18;
      float temp = hash2(cid+3.3);
      vec3 col = mix(vec3(0.75,0.85,1.0), vec3(1.0,0.92,0.8), temp);
      acc += col * (core*bright + glow*bright) * tw;
    }
    return acc;
  }
  void main(){
    vec2 uv = (vUv - 0.5) * vec2(res.x/res.y, 1.0);
    float r = length(uv);
    vec3 col = mix(vec3(0.0016,0.0024,0.0045), vec3(0.0034,0.0060,0.0160), 1.0 - smoothstep(0.0, 0.9, r));
    // nebula
    float n = fbm(vec3(uv*1.6 + vec2(0.3, -0.1), time*0.01 + 3.0));
    float n2 = fbm(vec3(uv*3.2 + vec2(-1.3, 0.8), time*0.013 + 11.0));
    vec3 neb = vec3(0.010,0.018,0.060)*smoothstep(0.42,0.78,n)*0.9 + vec3(0.03,0.10,0.30)*smoothstep(0.6,0.9,n2)*0.25;
    col += neb * nebulaAmt;
    // stars (zoom parallax: deeper layers move less)
    float z1 = exp(-zoom*0.055), z2 = exp(-zoom*0.03), z3 = exp(-zoom*0.012);
    col += stars(uv*z1 + vec2(0.0, 0.0), 22.0, 0.10, 0.030, 1.15);
    col += stars(uv*z2 + vec2(3.1, 1.7), 40.0, 0.14, 0.022, 0.75);
    col += stars(uv*z3 + vec2(9.3, 5.4), 80.0, 0.18, 0.016, 0.45);
    // milky dust band
    float band = exp(-pow((uv.y*0.8 + uv.x*0.5 + 0.35)*2.2, 2.0));
    col += vec3(0.2,0.35,1.0) * band * 0.004 * nebulaAmt;
    col *= 1.0 - 0.55*smoothstep(0.45, 1.05, r);
    gl_FragColor = vec4(col * dim, 1.0);
  }
`;

export const BG_VERT = /* glsl */`
  varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;

// Black hole: geodesic ray-marcher (Schwarzschild, r_s = 1) with a thin accretion disk and lensed starfield.
export const BH_FRAG = /* glsl */`
  precision highp float;
  uniform vec2 res; uniform float time; uniform vec3 camPos; uniform mat3 camRot; uniform float focal;
  uniform float diskIn, diskOut, diskBright, starAmt; uniform vec2 shift;
  varying vec2 vUv;
  ${NOISE}
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  vec3 starsDir(vec3 d){
    // equirect-ish star hash on direction
    vec2 uv = vec2(atan(d.z, d.x)/6.28318 + 0.5, asin(clamp(d.y,-1.0,1.0))/3.14159 + 0.5);
    vec3 acc = vec3(0.0);
    for (int L=0; L<2; L++){
      float scale = L==0 ? 140.0 : 260.0;
      vec2 g = uv*vec2(scale*2.0, scale); vec2 id = floor(g); vec2 f = fract(g);
      for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
        vec2 o = vec2(float(x),float(y)); vec2 cid = id+o; float h = hash2(cid + float(L)*17.0);
        if (h > 0.18) continue;
        vec2 pos = o + vec2(hash2(cid+1.3), hash2(cid+7.7));
        float dd = length((f-pos)*vec2(1.0, 1.0));
        float s = 0.07*(0.5+h*1.5);
        acc += mix(vec3(0.75,0.85,1.0), vec3(1.0,0.92,0.8), hash2(cid+3.3)) * (smoothstep(s,0.0,dd)*1.2 + exp(-dd*dd/(s*s*14.0))*0.2);
      }
    }
    return acc * starAmt;
  }
  void main(){
    vec2 uv = (vUv - 0.5 + shift) * vec2(res.x/res.y, 1.0);
    vec3 p = camPos;
    vec3 v = normalize(camRot * normalize(vec3(uv, -focal)));
    vec3 h = cross(p, v); float h2 = dot(h,h);
    vec3 col = vec3(0.0); float trans = 1.0; bool captured = false;
    for (int i=0; i<230; i++){
      float r2 = dot(p,p); float r = sqrt(r2);
      if (r < 1.0) { captured = true; break; }
      if (r > 60.0 && dot(p,v) > 0.0) break;
      float st = clamp((r-0.9)*0.07, 0.02, 0.6);
      vec3 a = -1.5 * h2 * p / (r2*r2*r);
      vec3 pn = p + v*st;
      if (p.y * pn.y < 0.0) {
        float f = p.y / (p.y - pn.y); vec3 hit = mix(p, pn, f); float rr = length(hit.xz);
        if (rr > diskIn && rr < diskOut) {
          float phi = atan(hit.z, hit.x);
          float n = fbm(vec3(phi*2.5 - time*0.35 + rr*0.9, rr*1.6 - time*0.25, 1.0));
          float n2 = fbm3(vec3(phi*9.0 - time*1.1 + rr*3.0, rr*5.0, 7.0));
          float temp = pow(diskIn/rr, 1.15);
          vec3 c = mix(vec3(1.0,0.16,0.02), vec3(0.45,0.72,1.0), smoothstep(0.15,0.95,temp));
          c = mix(c, vec3(1.0,0.95,0.85), smoothstep(0.8,1.0,temp)*0.5);
          c *= 0.55 + 0.75*n + 0.25*n2;
          vec3 tang = normalize(vec3(-hit.z, 0.0, hit.x));
          float beam = dot(tang, -v);
          c *= pow(max(0.0, 1.0 + 0.6*beam), 1.8) * 0.7 + 0.12;
          float alpha = smoothstep(diskOut, diskOut*0.55, rr) * smoothstep(diskIn, diskIn*1.25, rr) * (0.5 + 0.5*n);
          col += trans * c * alpha * diskBright;
          trans *= (1.0 - alpha*0.9);
        }
      }
      v = normalize(v + a*st); p = pn;
      if (trans < 0.02) break;
    }
    if (!captured && trans > 0.0) col += trans * starsDir(v);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Final grade: vignette + fine grain (dither against banding).
export const GRADE_FRAG = /* glsl */`
  uniform sampler2D tDiffuse; uniform float seed; uniform float vignette; uniform float grain; uniform float fade;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p + seed*0.731, vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec4 c = texture2D(tDiffuse, vUv);
    vec2 q = vUv - 0.5; float r = dot(q,q)*1.6;
    c.rgb *= 1.0 - vignette * smoothstep(0.25, 1.1, r);
    float g = (hash(gl_FragCoord.xy) - 0.5) * grain;
    c.rgb += g;
    c.rgb *= fade;
    gl_FragColor = c;
  }
`;
