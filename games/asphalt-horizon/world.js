'use strict';
// Asphalt Horizon — track + city builder (roads, buildings, landmarks).

AH.ROAD_HALF = 12;      // 4 lanes of 6 m
AH.SIDEWALK = 7;
AH.LANES = [-9, -3, 3, 9];

// ---------- track sampling ----------
AH.buildTrack = (city) => {
  const n = city.points.length;
  const pts = city.points.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
  curve.arcLengthDivisions = 4000;
  const L = curve.getLength();
  const N = Math.round(L / 2);
  const ds = L / N;
  const P = new Float32Array(N * 3), T = new Float32Array(N * 3), R = new Float32Array(N * 3), K = new Float32Array(N), SEG = new Float32Array(N);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const u = i / N;
    curve.getPointAt(u, tmp); P[i * 3] = tmp.x; P[i * 3 + 1] = tmp.y; P[i * 3 + 2] = tmp.z;
    curve.getTangentAt(u, tmp); T[i * 3] = tmp.x; T[i * 3 + 1] = tmp.y; T[i * 3 + 2] = tmp.z;
    const hl = Math.hypot(tmp.x, tmp.z) || 1;
    R[i * 3] = -tmp.z / hl; R[i * 3 + 1] = 0; R[i * 3 + 2] = tmp.x / hl;
    SEG[i] = curve.getUtoTmapping(u) * n;
  }
  // smooth elevation a little
  const Y = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += P[((i + k + N) % N) * 3 + 1]; Y[i] = s / 13; }
  for (let i = 0; i < N; i++) P[i * 3 + 1] = Y[i];
  // signed curvature (projection of dT/ds on the right vector)
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = ((i - 2 + N) % N) * 3, b = ((i + 2) % N) * 3;
    const dx = (T[b] - T[a]) / (4 * ds), dz = (T[b + 2] - T[a + 2]) / (4 * ds);
    raw[i] = dx * R[i * 3] + dz * R[i * 3 + 2];
  }
  for (let i = 0; i < N; i++) { let s = 0; for (let k = -5; k <= 5; k++) s += raw[(i + k + N) % N]; K[i] = s / 11; }
  // which side is the inside of the loop
  let area = 0;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; area += P[i * 3] * P[j * 3 + 2] - P[j * 3] * P[i * 3 + 2]; }
  const track = { curve, L, N, ds, P, T, R, K, SEG, n };
  // test: is point right of the start inside the polygon?
  const px = P[0] + R[0] * 30, pz = P[2] + R[2] * 30;
  track.inSign = AH.pointInTrack(track, px, pz) ? 1 : -1;
  return track;
};

AH.pointInTrack = (tr, x, z) => {
  let inside = false;
  for (let i = 0, j = tr.N - 1; i < tr.N; j = i++) {
    const xi = tr.P[i * 3], zi = tr.P[i * 3 + 2], xj = tr.P[j * 3], zj = tr.P[j * 3 + 2];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
};

// sample track at distance s → fills out {x,y,z,tx,ty,tz,rx,rz,k,i}
AH.sample = (tr, s, o) => {
  s = ((s % tr.L) + tr.L) % tr.L;
  const f = s / tr.ds, i0 = Math.floor(f) % tr.N, i1 = (i0 + 1) % tr.N, a = f - Math.floor(f);
  const A = i0 * 3, B = i1 * 3, P = tr.P, T = tr.T, R = tr.R;
  o.x = P[A] + (P[B] - P[A]) * a; o.y = P[A + 1] + (P[B + 1] - P[A + 1]) * a; o.z = P[A + 2] + (P[B + 2] - P[A + 2]) * a;
  o.tx = T[A] + (T[B] - T[A]) * a; o.ty = T[A + 1] + (T[B + 1] - T[A + 1]) * a; o.tz = T[A + 2] + (T[B + 2] - T[A + 2]) * a;
  o.rx = R[A] + (R[B] - R[A]) * a; o.rz = R[A + 2] + (R[B + 2] - R[A + 2]) * a;
  const rl = Math.hypot(o.rx, o.rz) || 1; o.rx /= rl; o.rz /= rl;
  o.k = tr.K[i0] + (tr.K[i1] - tr.K[i0]) * a;
  o.i = i0;
  return o;
};
AH.segToS = (tr, seg) => {
  // first sample whose SEG >= seg (monotonic except wrap)
  seg = ((seg % tr.n) + tr.n) % tr.n;
  let best = 0, bd = 1e9;
  for (let i = 0; i < tr.N; i++) { const d = Math.abs(tr.SEG[i] - seg); if (d < bd) { bd = d; best = i; } }
  return best * tr.ds;
};
AH.minDistToTrack = (tr, x, z, step = 3) => {
  let m = 1e9;
  for (let i = 0; i < tr.N; i += step) { const dx = tr.P[i * 3] - x, dz = tr.P[i * 3 + 2] - z; const d = dx * dx + dz * dz; if (d < m) m = d; }
  return Math.sqrt(m);
};

// ---------- geometry helpers ----------
function ribbon(tr, fn, opts = {}) {
  // fn(i) → array of [lateral, dy] cross-section points; builds strips between consecutive points
  const pos = [], uv = [], col = [], idx = [];
  const N = tr.N, cs0 = fn(0), m = cs0.length;
  for (let i = 0; i <= N; i++) {
    const ii = i % N, A = ii * 3;
    const cs = fn(ii);
    for (let j = 0; j < m; j++) {
      const [lat, dy, u, c] = cs[j];
      pos.push(tr.P[A] + tr.R[A] * lat, tr.P[A + 1] + dy, tr.P[A + 2] + tr.R[A + 2] * lat);
      uv.push(u !== undefined ? u : j / (m - 1), i * tr.ds / (opts.vScale || 20));
      if (opts.colors) { const cc = c || opts.defColor; col.push(cc[0], cc[1], cc[2]); }
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < m - 1; j++) {
    if (opts.skip && opts.skip(i, j)) continue;
    const a = i * m + j, b = (i + 1) * m + j;
    if (opts.flip) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (opts.colors) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function skewBox(b0, b1, y0, y1, c0 = [0, 0], c1 = [0, 0]) {
  // frustum with square cross-sections: half-size b0 at y0 centred c0, b1 at y1 centred c1
  const v = [], uv = [], idx = [];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
    const base = v.length / 3;
    v.push(c0[0] + ax * b0, y0, c0[1] + az * b0, c0[0] + bx * b0, y0, c0[1] + bz * b0, c1[0] + bx * b1, y1, c1[1] + bz * b1, c1[0] + ax * b1, y1, c1[1] + az * b1);
    const rep = Math.max(1, Math.round((y1 - y0) / (b0 + b1)));
    uv.push(0, 0, 1, 0, 1, rep, 0, rep);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function std(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.8, metalness: 0.05 }, o)); }
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) { m.castShadow = true; m.receiveShadow = true; } return m; }

// ---------- building material with world-scaled windows ----------
AH.buildingMat = (night) => {
  const t = AH.tex.windows();
  const m = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: new THREE.Color(0xffd9a0).multiplyScalar(night), roughness: 0.75, metalness: 0.1, envMapIntensity: 0.45 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
    #ifdef USE_INSTANCING
      vec3 scl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      vec3 pp = position * scl;
      float uu = abs(normal.x) > 0.5 ? pp.z : pp.x;
      vec2 off = floor(fract(instanceMatrix[3].xz * vec2(0.0123, 0.0171)) * 8.0) / 8.0;
      vUv = vec2(uu / 32.0, pp.y / 28.0) + off;
      if (abs(normal.y) > 0.5) vUv = vec2(0.01, 0.01);
    #endif`);
  };
  return m;
};

// ---------- landmarks (local space: base at y=0, front faces +z) ----------
AH.LM = {
  liberty(ctx) {
    const g = new THREE.Group();
    const patina = std(0x7cc4a6, { roughness: 0.55, metalness: 0.2 });
    const stone = std(0xbba98a), rock = std(0x5f6e4f);
    g.add(mesh(new THREE.CylinderGeometry(44, 50, 4, 28), rock, 0, 1, 0));
    g.add(mesh(new THREE.CylinderGeometry(28, 30, 7, 11), std(0x9a8e76), 0, 6.5, 0));
    g.add(mesh(new THREE.BoxGeometry(17, 22, 17), stone, 0, 21, 0));
    g.add(mesh(new THREE.BoxGeometry(13, 7, 13), stone, 0, 35.5, 0));
    const b = 39;
    g.add(mesh(new THREE.CylinderGeometry(3.4, 6, 30, 14), patina, 0, b + 15, 0));
    g.add(mesh(new THREE.CylinderGeometry(2.8, 3.4, 8, 14), patina, 0, b + 34, 0));
    g.add(mesh(new THREE.SphereGeometry(2.3, 14, 12), patina, 0, b + 40, 0.3));
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4, sp = mesh(new THREE.ConeGeometry(0.35, 3.2, 6), patina, Math.sin(a) * 2.6, b + 42.2 + Math.cos(a) * 1.2, -0.2);
      sp.rotation.z = -a * 0.9; g.add(sp);
    }
    const arm = mesh(new THREE.CylinderGeometry(0.9, 1.15, 13, 8), patina, 3.6, b + 42.5, 0); arm.rotation.z = -0.28; g.add(arm);
    g.add(mesh(new THREE.CylinderGeometry(1.5, 0.8, 2.6, 10), std(0xc9a24a, { metalness: 0.8, roughness: 0.3 }), 5.4, b + 49.5, 0));
    const fl = mesh(new THREE.ConeGeometry(1.3, 3.6, 10), new THREE.MeshStandardMaterial({ color: 0xffb830, emissive: 0xffa020, emissiveIntensity: 2.5 }), 5.4, b + 52.4, 0, false); g.add(fl);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: AH.tex.glow(), color: 0xffb040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.set(5.4, b + 52.5, 0); glow.scale.set(22, 22, 1); g.add(glow);
    const tab = mesh(new THREE.BoxGeometry(2.6, 4.2, 0.9), patina, -3.6, b + 30, 1.2); tab.rotation.z = 0.2; g.add(tab);
    return { group: g, r: 52, water: 0 };
  },
  empire(ctx) {
    const g = new THREE.Group();
    const tiers = [[60, 60, 0, 26], [46, 46, 26, 160], [36, 36, 186, 28], [26, 26, 214, 22], [16, 16, 236, 14]];
    for (const [w, d, y, h] of tiers) ctx.addBox(w, d, h, y, 0xcfc6b2);
    g.add(mesh(new THREE.CylinderGeometry(3, 7, 22, 8), std(0xd8d0c0), 0, 261, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.8, 44, 6), std(0x999999, { metalness: 0.8 }), 0, 294, 0));
    const lit = new THREE.MeshBasicMaterial({ color: 0xff3a8a });
    g.add(mesh(new THREE.BoxGeometry(26.6, 6, 26.6), lit, 0, 230, 0, false));
    g.add(mesh(new THREE.BoxGeometry(16.6, 5, 16.6), new THREE.MeshBasicMaterial({ color: 0x5fe1ff }), 0, 246, 0, false));
    const tip = mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0, 316, 0, false); g.add(tip);
    return { group: g, r: 45 };
  },
  chrysler(ctx) {
    const g = new THREE.Group();
    ctx.addBox(34, 34, 150, 0, 0xb9b5ad); ctx.addBox(26, 26, 30, 150, 0xc4c0b8);
    const steel = std(0xdfe3ea, { metalness: 1, roughness: 0.22, emissive: 0x334466, emissiveIntensity: 0.4 });
    let y = 180, r = 15;
    for (let i = 0; i < 5; i++) { const h = 9 - i; g.add(mesh(new THREE.CylinderGeometry(r * 0.78, r, h, 8), steel, 0, y + h / 2, 0)); y += h; r *= 0.74; }
    g.add(mesh(new THREE.ConeGeometry(r, 34, 8), steel, 0, y + 17, 0));
    // lit chevrons at night
    const chev = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
    for (let i = 0; i < 4; i++) { const m = mesh(new THREE.TorusGeometry(13 - i * 2.5, 0.25, 4, 8), chev, 0, 184 + i * 7, 0, false); m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI / 8; g.add(m); }
    return { group: g, r: 30 };
  },
  owtc(ctx) {
    const g = new THREE.Group();
    const glass = std(0x6d8fb8, { metalness: 0.9, roughness: 0.12, emissive: 0x1a2a50, emissiveIntensity: 0.6 });
    const t = mesh(new THREE.CylinderGeometry(13, 30, 260, 4, 1), glass, 0, 130, 0); t.rotation.y = Math.PI / 4; g.add(t);
    const t2 = mesh(new THREE.CylinderGeometry(30, 30, 20, 4, 1), std(0x8a96a8), 0, 10, 0); t2.rotation.y = Math.PI / 4; g.add(t2);
    g.add(mesh(new THREE.CylinderGeometry(0.6, 1.4, 70, 6), std(0xcccccc, { metalness: 0.8 }), 0, 295, 0));
    g.add(mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 331, 0, false));
    return { group: g, r: 36 };
  },
  transamerica() {
    const g = new THREE.Group();
    const w = std(0xf1efe8, { roughness: 0.5 });
    const p = mesh(new THREE.CylinderGeometry(1.5, 21, 150, 4, 1), w, 0, 75, 0); p.rotation.y = Math.PI / 4; g.add(p);
    for (const s of [-1, 1]) { const wing = mesh(new THREE.BoxGeometry(5, 40, 9), w, s * 9, 105, 0); g.add(wing); }
    g.add(mesh(new THREE.CylinderGeometry(0.4, 1.2, 30, 6), w, 0, 165, 0));
    return { group: g, r: 30 };
  },
  coit() {
    const g = new THREE.Group();
    const hill = mesh(new THREE.SphereGeometry(45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5f7a45), 0, -10, 0); hill.scale.y = 0.6; g.add(hill);
    g.add(mesh(new THREE.CylinderGeometry(5, 5.6, 58, 18), std(0xece6d6), 0, 46, 0));
    g.add(mesh(new THREE.CylinderGeometry(6.2, 6.2, 3, 18), std(0xd8d0bc), 0, 76, 0));
    return { group: g, r: 46 };
  },
  alcatraz() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(55, 68, 14, 12), std(0x6d6a58), 0, 2, 0));
    g.add(mesh(new THREE.BoxGeometry(55, 14, 22), std(0xd9cfb4), 0, 16, 0));
    g.add(mesh(new THREE.BoxGeometry(20, 10, 14), std(0xcbbf9f), -30, 14, 18));
    g.add(mesh(new THREE.CylinderGeometry(2.2, 3, 28, 10), std(0xf1f1f1), 30, 23, -10));
    g.add(mesh(new THREE.SphereGeometry(2.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2a0 }), 30, 38.5, -10, false));
    return { group: g, r: 70 };
  },
  pkin(ctx) {
    const g = new THREE.Group(), c = 0xd9c8a6;
    ctx.addBox(110, 50, 30, 0, c);
    ctx.addBox(52, 52, 70, 30, c);
    for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) ctx.addBox(10, 10, 86, 0, c, x, z);
    ctx.addBox(42, 42, 36, 100, c); ctx.addBox(32, 32, 28, 136, c); ctx.addBox(24, 24, 24, 164, c); ctx.addBox(16, 16, 18, 188, c); ctx.addBox(10, 10, 14, 206, c);
    const gold = std(0xc9a24a, { metalness: 0.9, roughness: 0.3 });
    g.add(mesh(new THREE.ConeGeometry(5.5, 30, 4), std(0xd9c8a6), 0, 235, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.9, 42, 6), gold, 0, 270, 0));
    const clock = new THREE.MeshBasicMaterial({ color: 0xf6efe0 });
    for (const r of [0, 1, 2, 3]) { const cl = mesh(new THREE.CircleGeometry(4, 20), clock, 0, 196, 0, false); cl.rotation.y = r * Math.PI / 2; cl.translateZ(8.1); g.add(cl); }
    return { group: g, r: 75 };
  },
  castle(ctx) {
    const g = new THREE.Group(), red = 0xd2734c;
    ctx.addBox(90, 20, 22, 0, red, 0, -30, 0x6a3a2a);
    ctx.addBox(20, 60, 22, 0, red, -45, 0, 0x6a3a2a);
    ctx.addBox(20, 60, 22, 0, red, 45, 0, 0x6a3a2a);
    ctx.addBox(13, 13, 46, 0, red, 0, -24);
    g.add(mesh(new THREE.ConeGeometry(8, 18, 4), std(0x3c4a3c), 0, 55, -24));
    g.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), std(0xc9a24a, { metalness: 0.9 }), 0, 65, -24));
    // Sigismund's column on the square
    g.add(mesh(new THREE.BoxGeometry(5, 6, 5), std(0x9e9a90), 0, 3, 38));
    g.add(mesh(new THREE.CylinderGeometry(0.95, 1.1, 22, 12), std(0xb06b5a), 0, 17, 38));
    g.add(mesh(new THREE.BoxGeometry(2.4, 1, 2.4), std(0xd8d0c0), 0, 28.5, 38));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, 3.4, 8), std(0x6b5a3a, { metalness: 0.7 }), 0, 30.7, 38));
    const cross = mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), std(0x6b5a3a), 0.8, 32.5, 38); g.add(cross);
    return { group: g, r: 70 };
  },
  stadium() {
    const g = new THREE.Group();
    const st = new THREE.MeshStandardMaterial({ map: AH.tex.stripes(), side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.6 });
    st.map.repeat.set(10, 1);
    const ring = mesh(new THREE.CylinderGeometry(115, 100, 42, 64, 1, true), st, 0, 21, 0); g.add(ring);
    g.add(mesh(new THREE.CylinderGeometry(98, 70, 22, 48, 1, true), std(0xc8c8c8, { side: THREE.DoubleSide }), 0, 11, 0));
    const roof = mesh(new THREE.RingGeometry(62, 116, 48), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), 0, 42, 0); roof.rotation.x = -Math.PI / 2; g.add(roof);
    g.add(mesh(new THREE.CylinderGeometry(1.2, 2.2, 120, 8), std(0xf1d36a, { metalness: 0.6 }), 0, 60, 0));
    const pitch = mesh(new THREE.PlaneGeometry(105, 68), std(0x3f8f3a), 0, 0.3, 0); pitch.rotation.x = -Math.PI / 2; g.add(pitch);
    const lines = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; lines.push(0, 120, 0, Math.cos(a) * 70, 42, Math.sin(a) * 70); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xdddddd })));
    return { group: g, r: 125 };
  },
  decobridge() {
    const g = new THREE.Group();
    const deck = mesh(new THREE.BoxGeometry(260, 2.5, 18), std(0x8a8f99), 0, 8, 0); g.add(deck);
    for (const x of [-120, 120]) g.add(mesh(new THREE.BoxGeometry(6, 8, 14), std(0x777b84), x, 4, 0));
    const py = mesh(new THREE.CylinderGeometry(1.4, 2.6, 85, 8), std(0xf2f2f2), 40, 42, 0); py.rotation.z = -0.12; g.add(py);
    const pts = []; for (let i = 0; i < 16; i++) { const x = -110 + i * 10; if (Math.abs(x - 40) < 6) continue; pts.push(45, 82, 0, x, 9, 7.5, 45, 82, 0, x, 9, -7.5); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff })));
    g.rotation.y = Math.PI / 2;
    const wrap = new THREE.Group(); wrap.add(g);
    return { group: wrap, r: 20, noRotate: true };
  },
  colosseum() {
    const g = new THREE.Group();
    const tex = AH.tex.arches();
    const mk = (rep) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep, 1); return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }); };
    const outer = mesh(new THREE.CylinderGeometry(1, 1, 48, 80, 1, true, 0, Math.PI * 1.45), mk(58), 0, 24, 0); outer.scale.set(95, 1, 78); g.add(outer);
    const broken = mesh(new THREE.CylinderGeometry(1, 1, 36, 40, 1, true, Math.PI * 1.45, Math.PI * 0.55), mk(22), 0, 18, 0); broken.scale.set(90, 1, 73); broken.material.map.repeat.set(22, 0.75); g.add(broken);
    const inner = mesh(new THREE.CylinderGeometry(1, 1, 34, 64, 1, true), mk(44), 0, 17, 0); inner.scale.set(80, 1, 64); g.add(inner);
    const seats = mesh(new THREE.CylinderGeometry(80, 48, 30, 48, 1, true), std(0xbfa57a, { side: THREE.DoubleSide }), 0, 15, 0); seats.scale.set(1, 1, 0.8); g.add(seats);
    const arena = mesh(new THREE.CircleGeometry(48, 32), std(0xc8a774), 0, 0.4, 0); arena.rotation.x = -Math.PI / 2; arena.scale.set(1, 0.8, 1); g.add(arena);
    return { group: g, r: 100 };
  },
  stpeter(ctx) {
    const g = new THREE.Group(), c = 0xe2d6bc;
    ctx.addBox(70, 120, 44, 0, c, 0, -10);
    ctx.addBox(110, 22, 50, 0, c, 0, 55);
    g.add(mesh(new THREE.CylinderGeometry(25, 25, 30, 32), std(0xe8dcc4), 0, 59, -20));
    const dome = mesh(new THREE.SphereGeometry(25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x9fb0b4, { metalness: 0.3, roughness: 0.5 }), 0, 74, -20); dome.scale.y = 1.35; g.add(dome);
    g.add(mesh(new THREE.CylinderGeometry(4.5, 5, 13, 12), std(0xe8dcc4), 0, 114, -20));
    g.add(mesh(new THREE.ConeGeometry(4.6, 7, 12), std(0x9fb0b4), 0, 124, -20));
    g.add(mesh(new THREE.SphereGeometry(1.4, 8, 6), std(0xc9a24a, { metalness: 0.9 }), 0, 128.5, -20));
    for (let i = 0; i < 10; i++) g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 30, 10), std(0xf0e6d0), -40 + i * 9, 15, 67));
    return { group: g, r: 90 };
  },
  obelisk() {
    const g = new THREE.Group(), c = std(0xd9c39a);
    g.add(mesh(new THREE.BoxGeometry(8, 5, 8), std(0xbdb4a0), 0, 2.5, 0));
    const o = mesh(new THREE.CylinderGeometry(1.4, 2.4, 26, 4, 1), c, 0, 18, 0); o.rotation.y = Math.PI / 4; g.add(o);
    const p = mesh(new THREE.ConeGeometry(2, 3, 4), c, 0, 32.5, 0); p.rotation.y = Math.PI / 4; g.add(p);
    return { group: g, r: 14 };
  },
  eiffel(ctx) {
    const g = new THREE.Group();
    const lat = AH.tex.lattice();
    const m = new THREE.MeshStandardMaterial({ color: 0x7a5636, map: lat, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.3, emissive: new THREE.Color(0xffa438).multiplyScalar(ctx.night), emissiveMap: lat });
    const leg = (b0, b1, y0, y1, c0, c1) => { const x = new THREE.Mesh(skewBox(b0, b1, y0, y1, c0, c1), m); x.castShadow = true; g.add(x); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      leg(8, 6, 0, 40, [sx * 38, sz * 38], [sx * 22, sz * 22]);
      leg(6, 4, 40, 78, [sx * 22, sz * 22], [sx * 11, sz * 11]);
    }
    leg(15, 3.5, 78, 165, [0, 0], [0, 0]);
    const deckM = std(0x5e4330, { emissive: new THREE.Color(0xffa438).multiplyScalar(ctx.night * 0.6) });
    g.add(mesh(new THREE.BoxGeometry(62, 3.5, 62), deckM, 0, 40, 0));
    g.add(mesh(new THREE.BoxGeometry(34, 3, 34), deckM, 0, 78, 0));
    g.add(mesh(new THREE.BoxGeometry(9, 4, 9), deckM, 0, 150, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 1.2, 14, 6), deckM, 0, 172, 0));
    for (let f = 0; f < 4; f++) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(26, 1.4, 6, 28, Math.PI), m);
      a.position.y = 13; a.rotation.y = f * Math.PI / 2; a.translateZ(30); g.add(a);
    }
    // sparkle lights
    if (ctx.night > 0.3) {
      const N = 500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const y = Math.random() * 160, t = y / 165;
        const hw = y < 40 ? 46 - y * 0.45 : y < 78 ? 27 - (y - 40) * 0.37 : 15 * (1 - (y - 78) / 87) + 3;
        const side = Math.floor(Math.random() * 4), u = (Math.random() * 2 - 1) * hw;
        const p = [[u, hw], [hw, u], [u, -hw], [-hw, u]][side];
        pos[i * 3] = p[0]; pos[i * 3 + 1] = y; pos[i * 3 + 2] = p[1];
        col[i * 3] = 1; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 0.8;
      }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.2, map: AH.tex.glow(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(pts);
      ctx.anim.push((t) => { if (Math.random() < 0.5) { for (let k = 0; k < 40; k++) { const i = Math.floor(Math.random() * N); const v = Math.random() < 0.5 ? 0 : 1; col[i * 3] = v; col[i * 3 + 1] = v * 0.95; col[i * 3 + 2] = v * 0.8; } pg.attributes.color.needsUpdate = true; } });
      // rotating beacon
      const beamM = new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const beacon = new THREE.Group(); beacon.position.y = 168; g.add(beacon);
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(14, 420, 16, 1, true), beamM); b.rotation.z = s * Math.PI / 2; b.position.x = s * 210; beacon.add(b); }
      ctx.anim.push((t) => { beacon.rotation.y = t * 0.6; });
    }
    return { group: g, r: 62 };
  },
  louvre(ctx) {
    const g = new THREE.Group();
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fc4e0, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.55, emissive: new THREE.Color(0xffd9a0).multiplyScalar(ctx.night * 0.6) });
    const pg = new THREE.ConeGeometry(24, 21, 4, 1); const p = mesh(pg, glass, 0, 10.5, 0); p.rotation.y = Math.PI / 4; g.add(p);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(pg), new THREE.LineBasicMaterial({ color: 0x334455 })); e.position.y = 10.5; e.rotation.y = Math.PI / 4; g.add(e);
    const plaza = mesh(new THREE.PlaneGeometry(130, 110), std(0xbfb5a0), 0, 0.15, -10); plaza.rotation.x = -Math.PI / 2; g.add(plaza);
    ctx.addBox(150, 22, 26, 0, 0xe3d6b8, 0, -70, 0x56606e);
    ctx.addBox(22, 110, 26, 0, 0xe3d6b8, -64, -10, 0x56606e);
    ctx.addBox(22, 110, 26, 0, 0xe3d6b8, 64, -10, 0x56606e);
    return { group: g, r: 80 };
  },
  sacrecoeur() {
    const g = new THREE.Group(), w = std(0xf4f1ea, { roughness: 0.6 });
    const hill = mesh(new THREE.SphereGeometry(90, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x4e6a40), 0, -20, 0); hill.scale.y = 0.65; g.add(hill);
    const top = 38;
    g.add(mesh(new THREE.BoxGeometry(50, 26, 60), w, 0, top + 13, 0));
    g.add(mesh(new THREE.CylinderGeometry(11, 11, 16, 24), w, 0, top + 34, 0));
    const d = mesh(new THREE.SphereGeometry(11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), w, 0, top + 42, 0); d.scale.y = 1.6; g.add(d);
    g.add(mesh(new THREE.CylinderGeometry(2, 2, 8, 10), w, 0, top + 63, 0));
    for (const [x, z] of [[-18, 24], [18, 24], [-18, -20], [18, -20]]) { g.add(mesh(new THREE.CylinderGeometry(5, 5, 8, 14), w, x, top + 30, z)); const s = mesh(new THREE.SphereGeometry(5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), w, x, top + 34, z); s.scale.y = 1.5; g.add(s); }
    return { group: g, r: 95 };
  },
  // drive-through arches (centred on the road, local x = across road)
  arc() {
    const g = new THREE.Group(), c = std(0xe8dec8, { roughness: 0.85 });
    for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(12, 36, 24), c, s * 22, 18, 0)); g.add(mesh(new THREE.BoxGeometry(6, 26, 25), std(0xd8ccb2), s * 22, 13, 0)); }
    g.add(mesh(new THREE.BoxGeometry(56, 18, 24), c, 0, 45, 0));
    g.add(mesh(new THREE.BoxGeometry(58, 2.5, 26), std(0xd8ccb2), 0, 50, 0));
    g.add(mesh(new THREE.BoxGeometry(56, 3, 24), std(0xd0c3a8), 0, 37, 0));
    for (const s of [-1, 1]) for (const z of [-12.3, 12.3]) { const r = mesh(new THREE.BoxGeometry(8, 8, 0.6), std(0xcfc1a4), s * 22, 26, z); g.add(r); }
    return { group: g, r: 40 };
  },
  constantine() {
    const g = new THREE.Group(), c = std(0xe9dfc8, { roughness: 0.85 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(12, 30, 14), c, s * 21, 15, 0));
    g.add(mesh(new THREE.BoxGeometry(54, 16, 14), c, 0, 38, 0));
    for (const s of [-1, 1]) for (const z of [-7.6, 7.6]) for (const dx of [-4, 4]) g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 28, 10), std(0xd2c2a0), s * 21 + dx, 14, z));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(2, 4, 2), std(0xbfae8c), -12 + i * 8, 48, 7));
    return { group: g, r: 36 };
  },
};

// ---------- city builder ----------
AH.buildCity = (city, scene) => {
  const tr = AH.buildTrack(city);
  const env = city.env, night = env.night;
  const rnd = AH.rng(city.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const W = AH.ROAD_HALF, SW = AH.SIDEWALK;
  const root = new THREE.Group(); scene.add(root);
  const anim = [];
  const exclusions = [];   // {x,z,r}
  const waters = [];       // rects {cx,cz,len,wid,ang}
  const boxes = [];        // building instances
  const roofs = [];
  const sampleTmp = {};
  const segFlag = (seg, ranges) => ranges && ranges.some(([a, b]) => seg >= a && seg <= b);

  // ---- ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), std(new THREE.Color(env.ground), { roughness: 1, envMapIntensity: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

  // ---- bridge / water definitions
  const isBridge = (i) => city.bridgeSeg !== undefined && Math.floor(tr.SEG[i]) === city.bridgeSeg;
  const tunnel = city.tunnel;
  const isTunnel = (i) => tunnel && tr.SEG[i] >= tunnel[0] && tr.SEG[i] <= tunnel[1];
  if (city.bridgeSeg !== undefined) {
    const idx = []; for (let i = 0; i < tr.N; i++) if (isBridge(i)) idx.push(i);
    const a = idx[0] * 3, b = idx[idx.length - 1] * 3;
    const cx = (tr.P[a] + tr.P[b]) / 2, cz = (tr.P[a + 2] + tr.P[b + 2]) / 2;
    const len = Math.hypot(tr.P[b] - tr.P[a], tr.P[b + 2] - tr.P[a + 2]);
    waters.push({ cx, cz, len: len - 70, wid: 640, ang: Math.atan2(tr.P[b + 2] - tr.P[a + 2], tr.P[b] - tr.P[a]) });
    tr.bridge = { idx, len };
  }
  for (const w of city.water || []) waters.push(Object.assign({}, w));
  const inWater = (x, z, pad = 0) => waters.some(w => {
    const dx = x - w.cx, dz = z - w.cz, c = Math.cos(w.ang), s = Math.sin(w.ang);
    const u = dx * c + dz * s, v = -dx * s + dz * c;
    return Math.abs(u) < w.len / 2 + pad && Math.abs(v) < w.wid / 2 + pad;
  });
  const waterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(night > 0.5 ? 0x0b1a30 : 0x1d5a86).convertSRGBToLinear(), metalness: 0.6, roughness: 0.12 });
  for (const w of waters) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w.len, w.wid), waterMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -w.ang; m.position.set(w.cx, 0.08, w.cz); m.receiveShadow = true; root.add(m);
  }

  // ---- cross streets (positions along the track)
  const crosses = [];
  {
    let s = 120;
    const ramps = (city.ramps || []).map(r => AH.segToS(tr, r));
    while (s < tr.L - 120) {
      const i = Math.floor(s / tr.ds);
      const ok = !isBridge(i) && !isTunnel(i) && !ramps.some(r => Math.abs(r - s) < 40) && Math.abs(tr.K[i]) < 0.006;
      if (ok) {
        const sides = [];
        for (const side of [-1, 1]) {
          const A = i * 3;
          const ex = tr.P[A] + tr.R[A] * side * (W + SW + 90), ez = tr.P[A + 2] + tr.R[A + 2] * side * (W + SW + 90);
          const mx = tr.P[A] + tr.R[A] * side * (W + SW + 40), mz = tr.P[A + 2] + tr.R[A + 2] * side * (W + SW + 40);
          if (AH.minDistToTrack(tr, ex, ez) > W + SW + 60 && AH.minDistToTrack(tr, mx, mz) > W + SW + 25 && !inWater(mx, mz, 10)) sides.push(side);
        }
        if (sides.length) { crosses.push({ s, i, sides }); s += 170 + rnd() * 120; continue; }
      }
      s += 30;
    }
  }
  const crossAt = (i, side) => crosses.some(c => Math.abs(c.i - i) * tr.ds < 8 && c.sides.includes(side));

  // ---- road surface
  const roadTex = AH.tex.road(); roadTex.repeat.set(1, 1);
  const roadGeo = ribbon(tr, () => [[-W, 0.05, 0], [W, 0.05, 1]], { vScale: 20, flip: true });
  const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.25 }));
  road.receiveShadow = true; root.add(road);
  // sidewalks + curbs + skirts (vertex coloured: bridge parts painted orange-red)
  const gray = [0.62, 0.62, 0.65], skirtC = [0.42, 0.42, 0.45], bridgeC = [0.75, 0.2, 0.14];
  const swGeo = ribbon(tr, (i) => {
    const b = isBridge(i), cc = b ? bridgeC : gray, sk = b ? bridgeC : skirtC;
    return [[-W - SW, -3, 0, sk], [-W - SW, 0.2, 0, cc], [-W - 0.4, 0.2, 0.4, cc], [-W - 0.4, 0.04, 0.45, cc], [W + 0.4, 0.04, 0.55, cc], [W + 0.4, 0.2, 0.6, cc], [W + SW, 0.2, 1, cc], [W + SW, -3, 1, sk]];
  }, { colors: true, vScale: 6, skip: (i, j) => j === 3, flip: true });
  const swTex = AH.tex.sidewalk(); swTex.repeat.set(6, 1);
  const sw = new THREE.Mesh(swGeo, new THREE.MeshStandardMaterial({ map: swTex, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.3 }));
  sw.receiveShadow = true; root.add(sw);

  // barriers with gaps at cross streets
  const stripeCol = { sf: '#d4202f', ny: '#ff1f5a', waw: '#d4202f', rome: '#c27a2a', paris: '#2f5bd4' }[city.id] || '#d4202f';
  const barTex = AH.tex.concrete(stripeCol);
  const barMat = new THREE.MeshStandardMaterial({ map: barTex, roughness: 0.7, emissive: night > 0.5 ? new THREE.Color(stripeCol) : new THREE.Color(0), emissiveMap: night > 0.5 ? AH.tex.glowStrip() : null, emissiveIntensity: 1.2 });
  for (const side of [-1, 1]) {
    const g = ribbon(tr, () => side < 0 ? [[-W - 0.3, 0.04, 0], [-W - 0.3, 1.1, 1], [-W - 0.7, 1.1, 0]] : [[W + 0.7, 1.1, 0], [W + 0.3, 1.1, 1], [W + 0.3, 0.04, 0]], { vScale: 4, skip: (i) => crossAt(i, side) && !isBridge(i) });
    // fix uv so the stripe runs along: swap uv axes
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) { const u = uv.getX(k), v = uv.getY(k); uv.setXY(k, v, u); }
    const m = new THREE.Mesh(g, barMat); m.castShadow = false; m.receiveShadow = true; root.add(m);
  }

  // cross streets geometry
  {
    const pos = [], idx = [], zeb = [], tl = [];
    for (const c of crosses) {
      const A = c.i * 3, px = tr.P[A], py = tr.P[A + 1], pz = tr.P[A + 2], tx = tr.T[A], tz = tr.T[A + 2], tl2 = Math.hypot(tx, tz), ux = tx / tl2, uz = tz / tl2, rx = tr.R[A], rz = tr.R[A + 2];
      for (const side of c.sides) {
        const base = pos.length / 3, d0 = W + 0.5, d1 = W + SW + 110, hw = 7;
        const p = (d, w) => [px + rx * side * d + ux * w, d < W + SW ? py + 0.21 : 0.04, pz + rz * side * d + uz * w];
        pos.push(...p(d0, -hw), ...p(d0, hw), ...p(d1, hw), ...p(d1, -hw));
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        // traffic lights
        tl.push({ x: px + rx * side * (W + 2) + ux * (hw + 1.5), y: py, z: pz + rz * side * (W + 2) + uz * (hw + 1.5), ry: Math.atan2(-tz, tx) });
        // keep buildings out of the street
        for (let d = W + SW + 10; d < d1; d += 12) exclusions.push({ x: px + rx * side * d, z: pz + rz * side * d, r: 11 });
      }
      zeb.push(c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, std(0x3a3c42, { roughness: 0.9, side: THREE.DoubleSide })); m.receiveShadow = true; root.add(m);
    // zebra crossings on the main road
    const zm = new THREE.MeshBasicMaterial({ map: AH.tex.zebra(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const c of zeb) {
      const p = AH.sample(tr, c.s - 9, sampleTmp);
      const z = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 4), zm); z.rotation.x = -Math.PI / 2; z.rotation.z = Math.atan2(-p.tz, p.tx) - Math.PI / 2 + Math.PI / 2;
      z.position.set(p.x, p.y + 0.08, p.z); z.rotation.order = 'YXZ'; z.rotation.set(-Math.PI / 2, Math.atan2(p.tx, p.tz), 0, 'YXZ'); root.add(z);
    }
    // traffic light poles
    if (tl.length) {
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.18, 6, 6).translate(0, 3, 0), std(0x2a2c30, { metalness: 0.6 }), tl.length);
      const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.4, 0.5).translate(0, 6.3, 0), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x20ff60, emissiveIntensity: 0.8 }), tl.length);
      const d = new THREE.Object3D();
      tl.forEach((t, k) => { d.position.set(t.x, t.y, t.z); d.rotation.set(0, t.ry, 0); d.updateMatrix(); pole.setMatrixAt(k, d.matrix); head.setMatrixAt(k, d.matrix); });
      root.add(pole, head);
    }
  }

  // ---- Golden Gate style suspension bridge
  if (tr.bridge) {
    const idx = tr.bridge.idx, red = std(0xc0362c, { roughness: 0.55, metalness: 0.3 });
    const n = idx.length, deckY = tr.P[idx[Math.floor(n / 2)] * 3 + 1];
    const tAt = (f) => idx[Math.floor(f * (n - 1))];
    const towerF = [0.22, 0.78], H = 75;
    const cableTops = [];
    for (const f of towerF) {
      const i = tAt(f), A = i * 3, px = tr.P[A], pz = tr.P[A + 2], ry = Math.atan2(-tr.T[A + 2], tr.T[A]);
      const tw = new THREE.Group(); tw.position.set(px, 0, pz); tw.rotation.y = ry;
      for (const s of [-1, 1]) {
        tw.add(mesh(new THREE.BoxGeometry(4, H + deckY, 5), red, 0, (H + deckY) / 2, s * (W + 4)));
      }
      for (const y of [deckY + 22, deckY + 45, deckY + 68]) tw.add(mesh(new THREE.BoxGeometry(3, 4, (W + 4) * 2), red, 0, y, 0));
      tw.add(mesh(new THREE.BoxGeometry(8, 8, (W + 10) * 2), std(0x777777), 0, 0, 0));
      root.add(tw);
      cableTops.push({ i, y: deckY + H });
    }
    // main cables + suspenders
    for (const side of [-1, 1]) {
      const pts = [];
      const lat = side * (W + 4);
      const span = (a, b, ya, yb, sag, steps) => {
        for (let k = 0; k <= steps; k++) {
          const f = k / steps, i = Math.round(a + (b - a) * f), A = i * 3;
          const y = ya + (yb - ya) * f - sag * 4 * f * (1 - f);
          pts.push(new THREE.Vector3(tr.P[A] + tr.R[A] * lat, y, tr.P[A + 2] + tr.R[A + 2] * lat));
        }
      };
      const i0 = idx[0], iT1 = cableTops[0].i, iT2 = cableTops[1].i, i1 = idx[n - 1];
      span(i0, iT1, deckY + 2, deckY + H, 6, 10);
      span(iT1, iT2, deckY + H, deckY + H, H - 6, 30);
      span(iT2, i1, deckY + H, deckY + 2, 6, 10);
      const curve = new THREE.CatmullRomCurve3(pts);
      root.add(mesh(new THREE.TubeGeometry(curve, 120, 0.55, 6, false), red));
      // suspenders
      const sp = [];
      for (let k = 0; k < pts.length; k++) { const p = pts[k]; if (p.y - deckY > 3) sp.push(p.x, deckY + 1, p.z, p.x, p.y, p.z); }
      for (let f = 0.02; f < 1; f += 0.012) { const p = curve.getPoint(f); if (p.y - deckY > 3) sp.push(p.x, deckY + 1, p.z, p.x, p.y, p.z); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xc0362c })));
    }
    // piers under deck ends
    for (const f of [0.02, 0.98]) { const i = tAt(f), A = i * 3; root.add(mesh(new THREE.BoxGeometry(10, tr.P[A + 1] + 3, 10), std(0x8a8580), tr.P[A], (tr.P[A + 1] - 3) / 2, tr.P[A + 2])); }
    for (const i of idx) exclusions.push({ x: tr.P[i * 3], z: tr.P[i * 3 + 2], r: 40 });
  }

  // ---- tunnel
  if (tunnel) {
    const list = [];
    for (let i = 0; i < tr.N; i += 2) if (isTunnel(i)) list.push(i);
    const wallG = new THREE.BoxGeometry(1.5, 9, 4.2), roofG = new THREE.BoxGeometry((W + SW) * 2 + 3, 1.5, 4.2), lampG = new THREE.BoxGeometry(6, 0.2, 1.2);
    const wm = std(0x5c5f66), lm = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
    const walls = new THREE.InstancedMesh(wallG, wm, list.length * 2), roofsI = new THREE.InstancedMesh(roofG, std(0x3b3d42), list.length), lamps = new THREE.InstancedMesh(lampG, lm, list.length * 2);
    const d = new THREE.Object3D();
    list.forEach((i, k) => {
      const A = i * 3, ry = Math.atan2(tr.T[A], tr.T[A + 2]);
      for (const s of [0, 1]) {
        const lat = (s ? 1 : -1) * (W + SW + 0.5);
        d.position.set(tr.P[A] + tr.R[A] * lat, tr.P[A + 1] + 4.5, tr.P[A + 2] + tr.R[A + 2] * lat); d.rotation.set(0, ry, 0); d.updateMatrix(); walls.setMatrixAt(k * 2 + s, d.matrix);
        const ll = (s ? 1 : -1) * 6;
        d.position.set(tr.P[A] + tr.R[A] * ll, tr.P[A + 1] + 8.8, tr.P[A + 2] + tr.R[A + 2] * ll); d.updateMatrix(); lamps.setMatrixAt(k * 2 + s, d.matrix);
      }
      d.position.set(tr.P[A], tr.P[A + 1] + 9.6, tr.P[A + 2]); d.updateMatrix(); roofsI.setMatrixAt(k, d.matrix);
      exclusions.push({ x: tr.P[A], z: tr.P[A + 2], r: W + SW + 6 });
    });
    walls.castShadow = roofsI.castShadow = true; walls.receiveShadow = true;
    root.add(walls, roofsI, lamps);
    // portal façades
    for (const ii of [list[0], list[list.length - 1]]) {
      const A = ii * 3, ry = Math.atan2(tr.T[A], tr.T[A + 2]);
      const pf = new THREE.Group(); pf.position.set(tr.P[A], tr.P[A + 1], tr.P[A + 2]); pf.rotation.y = ry;
      pf.add(mesh(new THREE.BoxGeometry((W + SW) * 2 + 16, 6, 3), std(0x8a7a6a), 0, 12.6, 0));
      for (const s of [-1, 1]) pf.add(mesh(new THREE.BoxGeometry(8, 16, 3), std(0x8a7a6a), s * (W + SW + 5), 8, 0));
      root.add(pf);
    }
  }

  // ---- start / finish gantry
  {
    const p = AH.sample(tr, 0, {});
    const ry = Math.atan2(p.tx, p.tz);
    const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = ry;
    const chk = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 3), new THREE.MeshStandardMaterial({ map: AH.tex.checker(), polygonOffset: true, polygonOffsetFactor: -2 }));
    chk.rotation.x = -Math.PI / 2; chk.position.y = 0.08; g.add(chk);
    const dark = std(0x1a1b22, { metalness: 0.6, roughness: 0.4 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(1.2, 10, 1.2), dark, s * (W + 1.5), 5, 0));
    g.add(mesh(new THREE.BoxGeometry(W * 2 + 4, 2.4, 1), dark, 0, 10, 0));
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2), new THREE.MeshBasicMaterial({ map: AH.tex.banner() }));
    ban.position.set(0, 10, -0.55); ban.rotation.y = Math.PI; g.add(ban);
    const ban2 = ban.clone(); ban2.position.z = 0.55; ban2.rotation.y = 0; g.add(ban2);
    root.add(g);
  }

  // ---- ramps
  const ramps = [];
  {
    const rm = new THREE.MeshStandardMaterial({ map: AH.tex.ramp(), roughness: 0.6 });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(10, 0); sh.lineTo(10, 1.8); sh.lineTo(9.4, 1.8); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false }); rg.translate(0, 0, -2.5); rg.rotateY(-Math.PI / 2);
    for (const seg of city.ramps || []) {
      const s0 = AH.segToS(tr, seg), lane = AH.LANES[Math.floor(rnd() * 4)];
      const p = AH.sample(tr, s0, {});
      const m = new THREE.Mesh(rg, rm); m.castShadow = true; m.receiveShadow = true;
      m.position.set(p.x + p.rx * lane, p.y + 0.05, p.z + p.rz * lane);
      m.rotation.order = 'YXZ'; m.rotation.set(-Math.asin(p.ty), Math.atan2(p.tx, p.tz), 0);
      root.add(m);
      ramps.push({ s: s0, len: 10, h: 1.8, x: lane, w: 2.6 });
    }
  }

  // ---- landmarks
  const lmCtx = {
    night, anim,
    _origin: null,
    addBox(w, d, h, y, color, ox = 0, oz = 0, roof) {
      const o = this._origin; // {x,y,z,ry}
      const c = Math.cos(o.ry), s = Math.sin(o.ry);
      const wx = o.x + ox * c + oz * s, wz = o.z - ox * s + oz * c;
      boxes.push({ x: wx, y: o.y, z: wz, w, d, h, y0: y, ry: o.ry, c: color });
      if (roof) roofs.push({ x: wx, z: wz, y: o.y + y + h, w, d, h: Math.min(w, d) * 0.3, ry: o.ry, c: roof });
    },
  };
  const placeLandmark = (def) => {
    const builder = AH.LM[def.type];
    let x, z, y = 0, ry = 0;
    if (def.pos) {
      x = def.pos[0]; z = def.pos[1];
      // face the nearest road point
      let bi = 0, bd = 1e12;
      for (let i = 0; i < tr.N; i += 2) { const dx = tr.P[i * 3] - x, dz = tr.P[i * 3 + 2] - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = i; } }
      ry = Math.atan2(tr.P[bi * 3] - x, tr.P[bi * 3 + 2] - z);
    } else {
      const s = AH.segToS(tr, def.seg), p = AH.sample(tr, s, {});
      const side = (def.side === 'in' ? 1 : -1) * tr.inSign;
      let dist = W + def.dist;
      x = p.x + p.rx * side * dist; z = p.z + p.rz * side * dist; y = 0;
      ry = Math.atan2(-p.rx * side, -p.rz * side);
    }
    lmCtx._origin = { x, y, z, ry };
    const built = builder(lmCtx); built.group.name = 'lm-' + def.type;
    built.group.position.set(x, y, z);
    if (!built.noRotate) built.group.rotation.y = ry;
    built.group.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow && !o.material.transparent; } });
    root.add(built.group);
    exclusions.push({ x, z, r: built.r });
    // keep a clear sightline from the nearest stretch of road to the landmark
    {
      let bi = 0, bd = 1e12;
      for (let i = 0; i < tr.N; i += 2) { const dx = tr.P[i * 3] - x, dz = tr.P[i * 3 + 2] - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = i; } }
      for (const off of [-40, 0, 40]) {
        const q = AH.sample(tr, bi * tr.ds + off, {}), len = Math.hypot(x - q.x, z - q.z);
        for (let d = W + 10; d < len - built.r * 0.5; d += 14) { const f = d / len; exclusions.push({ x: q.x + (x - q.x) * f, z: q.z + (z - q.z) * f, r: 22 }); }
      }
    }
    return built;
  };
  for (const def of city.landmarks || []) placeLandmark(def);
  for (const a of city.arches || []) {
    const s = AH.segToS(tr, a.seg), p = AH.sample(tr, s, {});
    const b = AH.LM[a.type](); b.group.name = 'lm-' + a.type;
    b.group.position.set(p.x, p.y, p.z); b.group.rotation.y = Math.atan2(p.tx, p.tz);
    root.add(b.group);
    for (let d = -40; d <= 40; d += 10) { const q = AH.sample(tr, s + d, {}); for (const side of [-1, 1]) exclusions.push({ x: q.x + q.rx * side * 30, z: q.z + q.rz * side * 30, r: 16 }); }
  }

  // ---- buildings along the road
  const style = city.style;
  const vict = (seg) => segFlag(seg, city.victorian), old = (seg) => segFlag(seg, city.oldtown);
  const pal = {
    sky: [0x8d96a8, 0x6f7a8c, 0xa7a196, 0x5b6474, 0xb9b3a6, 0x7d8797, 0x4f5868],
    sf: [0xd8d2c4, 0xc9cfd6, 0xb0b8c2, 0xe0d6c0, 0x9aa3ae],
    victorian: [0xf2b8c6, 0xa8d8e8, 0xf6e3a1, 0xb8e0b0, 0xe8c0f0, 0xffd0a8],
    waw: [0xd8d4cc, 0xbfc4c9, 0xe3dccb, 0xa9b0b8, 0xcfc6b5],
    oldtown: [0xe8b04a, 0xd2604a, 0x7fae8a, 0xe6d27a, 0x9bb6d6, 0xf0a878, 0xc8746a],
    rome: [0xe8a45a, 0xd88a4a, 0xf0c27a, 0xc96a3a, 0xe8c99a, 0xd4a06a],
    paris: [0xece2cc, 0xe8dcc0, 0xf2e8d4, 0xe0d2b6],
  };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const nearOther = (x, z, minD) => AH.minDistToTrack(tr, x, z, 4) < minD;
  const excluded = (x, z, rad) => exclusions.some(e => (e.x - x) ** 2 + (e.z - z) ** 2 < (e.r + rad) ** 2) || inWater(x, z, rad * 0.6);
  const rows = style === 'sky' ? 3 : 2;
  for (const side of [-1, 1]) for (let row = 0; row < rows; row++) {
    let s = rnd() * 10;
    while (s < tr.L) {
      const i = Math.floor(s / tr.ds) % tr.N, seg = tr.SEG[i];
      let w, d, h, c, roofC = null, roofH = 0, gap = 1 + rnd() * 3;
      const v = style === 'sf' && vict(seg), o = style === 'waw' && old(seg);
      if (style === 'sky') { w = 18 + rnd() * 16; d = 18 + rnd() * 14; h = row === 0 ? 30 + rnd() * 90 : 50 + rnd() * 150; c = pick(pal.sky); }
      else if (v) { w = 7 + rnd() * 3; d = 12; h = 10 + rnd() * 5; c = pick(pal.victorian); roofC = 0x5a4a4a; roofH = 4; gap = 0.4; }
      else if (style === 'sf') { w = 16 + rnd() * 14; d = 16 + rnd() * 12; h = row === 0 ? 14 + rnd() * 30 : 30 + rnd() * 70; c = pick(pal.sf); }
      else if (o) { w = 7 + rnd() * 4; d = 12; h = 14 + rnd() * 6; c = pick(pal.oldtown); roofC = 0x9a3a28; roofH = 5; gap = 0.2; }
      else if (style === 'waw') { const block = rnd() < 0.45; w = block ? 40 + rnd() * 20 : 16 + rnd() * 10; d = block ? 14 : 16 + rnd() * 8; h = block ? 25 + rnd() * 15 : 18 + rnd() * (row ? 70 : 30); c = pick(pal.waw); }
      else if (style === 'rome') { w = 14 + rnd() * 10; d = 14 + rnd() * 8; h = 12 + rnd() * 10; c = pick(pal.rome); roofC = 0xa8482c; roofH = 3; gap = 0.5; }
      else { w = 16 + rnd() * 8; d = 16 + rnd() * 4; h = 20 + rnd() * 5; c = pick(pal.paris); roofC = 0x5a6478; roofH = 5; gap = 0.2; }
      const p = AH.sample(tr, s + w / 2, sampleTmp);
      const back = W + SW + 2 + d / 2 + row * (style === 'sky' ? 30 : 26) + (row ? rnd() * 6 : rnd() * 2);
      const x = p.x + p.rx * side * back, z = p.z + p.rz * side * back;
      const rad = Math.max(w, d) / 2;
      if (!isBridge(p.i) && !(isTunnel(p.i) && row === 0) && !nearOther(x, z, back - 1) && !excluded(x, z, rad * 0.8)) {
        const ry = Math.atan2(-p.tz, p.tx);
        boxes.push({ x, y: -2, z, w, d, h: h + p.y + 2, y0: 0, ry, c });
        if (roofC) roofs.push({ x, z, y: p.y + h, w: d, d: w, h: roofH, ry: ry + Math.PI / 2, c: roofC });
        exclusions.push({ x, z, r: rad * 0.7 });
      }
      s += w + gap;
    }
  }
  // distant skyline filler
  {
    const cnt = style === 'sky' ? 260 : 160;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < tr.N; i++) { minX = Math.min(minX, tr.P[i * 3]); maxX = Math.max(maxX, tr.P[i * 3]); minZ = Math.min(minZ, tr.P[i * 3 + 2]); maxZ = Math.max(maxZ, tr.P[i * 3 + 2]); }
    for (let k = 0; k < cnt; k++) {
      const x = minX - 500 + rnd() * (maxX - minX + 1000), z = minZ - 500 + rnd() * (maxZ - minZ + 1000);
      const w = 20 + rnd() * 25;
      if (AH.minDistToTrack(tr, x, z, 6) < 80 || excluded(x, z, w)) continue;
      const hgt = style === 'sky' ? 60 + rnd() * 200 : style === 'sf' ? 20 + rnd() * 80 : style === 'waw' ? 20 + rnd() * 60 : 15 + rnd() * 20;
      const c = pick(style === 'sky' ? pal.sky : style === 'rome' ? pal.rome : style === 'paris' ? pal.paris : style === 'waw' ? pal.waw : pal.sf);
      boxes.push({ x, y: -2, z, w, d: w * (0.7 + rnd() * 0.6), h: hgt, y0: 0, ry: rnd() * 3, c });
      if (style === 'rome' || style === 'paris') roofs.push({ x, z, y: -2 + hgt, w: w, d: w, h: 4, ry: 0, c: style === 'rome' ? 0xa8482c : 0x5a6478 });
    }
  }
  // build building instances
  {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = AH.buildingMat(night);
    const im = new THREE.InstancedMesh(geo, mat, boxes.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    boxes.forEach((b, k) => {
      d.position.set(b.x, b.y + b.y0, b.z); d.rotation.set(0, b.ry, 0); d.scale.set(b.w, b.h, b.d); d.updateMatrix();
      im.setMatrixAt(k, d.matrix); im.setColorAt(k, col.set(b.c).convertSRGBToLinear());
    });
    im.castShadow = true; im.receiveShadow = true;
    root.add(im);
    if (roofs.length) {
      const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.closePath();
      const rg = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); rg.translate(0, 0, -0.5);
      const rm = new THREE.InstancedMesh(rg, std(0xffffff, { roughness: 0.7 }), roofs.length);
      roofs.forEach((r, k) => { d.position.set(r.x, r.y, r.z); d.rotation.set(0, r.ry, 0); d.scale.set(r.w, r.h, r.d); d.updateMatrix(); rm.setMatrixAt(k, d.matrix); rm.setColorAt(k, col.set(r.c).convertSRGBToLinear()); });
      rm.castShadow = true; root.add(rm);
    }
  }

  // ---- street lamps & trees
  {
    const lamps = [], trees = [];
    for (let s = 5; s < tr.L; s += 36) {
      const p = AH.sample(tr, s, sampleTmp);
      if (isTunnel(p.i)) continue;
      for (const side of [-1, 1]) {
        if (crossAt(p.i, side)) continue;
        const lat = side * (W + 1.6);
        lamps.push({ x: p.x + p.rx * lat, y: p.y, z: p.z + p.rz * lat, ry: Math.atan2(p.rx * -side, p.rz * -side) });
        if (!isBridge(p.i) && (style === 'rome' || style === 'paris' || style === 'waw' || (style === 'sf' && rnd() < 0.4))) {
          const tl = side * (W + SW - 1.8), ts = AH.sample(tr, s + 18, {});
          const tx = ts.x + ts.rx * tl, tz = ts.z + ts.rz * tl;
          if (!crossAt(ts.i, side) && !nearOther(tx, tz, W + SW - 3)) trees.push({ x: tx, y: ts.y + 0.2, z: tz, s: 0.8 + rnd() * 0.5 });
        }
      }
    }
    const d = new THREE.Object3D();
    const poleG = new THREE.CylinderGeometry(0.12, 0.16, 9, 6).translate(0, 4.5, 0);
    const armG = new THREE.BoxGeometry(0.12, 0.12, 2.6).translate(0, 9, 1.2);
    const headG = new THREE.BoxGeometry(0.6, 0.18, 1.0).translate(0, 8.9, 2.4);
    const poleI = new THREE.InstancedMesh(poleG, std(0x2b2d33, { metalness: 0.6, roughness: 0.4 }), lamps.length);
    const armI = new THREE.InstancedMesh(armG, std(0x2b2d33, { metalness: 0.6 }), lamps.length);
    const headI = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe1a0, emissiveIntensity: env.lamps ? 2.2 : 0.15 }), lamps.length);
    lamps.forEach((l, k) => { d.position.set(l.x, l.y, l.z); d.rotation.set(0, l.ry, 0); d.scale.set(1, 1, 1); d.updateMatrix(); poleI.setMatrixAt(k, d.matrix); armI.setMatrixAt(k, d.matrix); headI.setMatrixAt(k, d.matrix); });
    poleI.castShadow = true;
    root.add(poleI, armI, headI);
    if (env.lamps) {
      // fake light pools on the road
      const pm = new THREE.MeshBasicMaterial({ map: AH.tex.glow(), color: 0xffc070, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
      const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), pm, lamps.length);
      lamps.forEach((l, k) => { d.position.set(l.x - Math.sin(l.ry) * -3.5, l.y + 0.12, l.z - Math.cos(l.ry) * -3.5); d.rotation.set(0, 0, 0); d.updateMatrix(); pool.setMatrixAt(k, d.matrix); });
      root.add(pool);
    }
    if (trees.length) {
      const cypress = style === 'rome';
      const trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 5).translate(0, 1.5, 0), std(0x5a4030), trees.length);
      const fol = cypress ? new THREE.ConeGeometry(1.6, 9, 7).translate(0, 7, 0) : new THREE.IcosahedronGeometry(3, 0).translate(0, 5, 0);
      const folI = new THREE.InstancedMesh(fol, std(cypress ? 0x2f4a2a : style === 'paris' ? 0x3f6a3a : 0x4f7a3a, { flatShading: true }), trees.length);
      const col = new THREE.Color();
      trees.forEach((t, k) => { d.position.set(t.x, t.y, t.z); d.rotation.set(0, t.s * 7, 0); d.scale.setScalar(t.s); d.updateMatrix(); trunkI.setMatrixAt(k, d.matrix); folI.setMatrixAt(k, d.matrix); folI.setColorAt(k, col.setHSL(0.27 + rnd() * 0.06, 0.4, (night > 0.5 ? 0.18 : 0.28) + rnd() * 0.08)); });
      trunkI.castShadow = folI.castShadow = true;
      root.add(trunkI, folI);
    }
  }

  // ---- neon billboards (NY)
  if (city.billboards) {
    let k = 0;
    for (const [a, b] of city.billboards) {
      const s0 = AH.segToS(tr, a), s1 = AH.segToS(tr, b);
      for (let s = s0; s < (s1 > s0 ? s1 : s0 + 200); s += 45) {
        for (const side of [-1, 1]) {
          const p = AH.sample(tr, s, {}), lat = side * (W + SW + 1.5);
          const x = p.x + p.rx * lat, z = p.z + p.rz * lat;
          if (nearOther(x, z, W + SW)) continue;
          const bb = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: AH.tex.billboard(k++), side: THREE.DoubleSide }));
          bb.position.set(x, p.y + 14 + (k % 3) * 6, z); bb.rotation.y = Math.atan2(-p.rx * side, -p.rz * side);
          root.add(bb);
        }
      }
    }
  }

  // ---- sky
  const skyM = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(env.skyTop) }, mid: { value: new THREE.Color(env.skyMid) }, bot: { value: new THREE.Color(env.skyBot) }, sunDir: { value: new THREE.Vector3(...env.sunDir).normalize() }, sunCol: { value: new THREE.Color(env.sun) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot, sunDir, sunCol; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = mix(bot, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.7, h));
      float sd = max(dot(normalize(vP), sunDir), 0.0); c += sunCol * (pow(sd, 400.0) * 3.0 + pow(sd, 12.0) * 0.35);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), skyM);
  sky.renderOrder = -1; scene.add(sky);
  if (env.stars) {
    const N = 1200, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const t = Math.random() * Math.PI * 2, u = 0.15 + Math.random() * 0.85; const r = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(t) * r * 3300; pos[i * 3 + 1] = u * 3300; pos[i * 3 + 2] = Math.sin(t) * r * 3300; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));
    sky.add(st);
  }

  return { track: tr, root, sky, anim, ramps, crosses, inWater };
};
