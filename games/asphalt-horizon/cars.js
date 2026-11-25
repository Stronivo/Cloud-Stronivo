'use strict';
// Asphalt Horizon — vehicle visual layer.
// Lofted bodies (superellipse cross-sections, sculpted wheel arches and flares), clearcoat paints,
// per-model lights / grilles / aero / exhausts, multi-piece wheels with brakes.
// Public API kept identical: AH.buildCar(style, color, opt) → { group, wheels, flames, bodyMat, P, glow }.

(() => {
  const V3 = THREE.Vector3;

  // ---------- small textures ----------
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctex = (c, rep, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const T = {};
  T.carbon = () => T._carbon || (T._carbon = (() => {
    const c = cnv(64, 64), g = c.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = ((x + y) % 2) ? 34 : 22, gr = g.createLinearGradient(x * 8, y * 8, x * 8 + 8, y * 8 + 8);
      gr.addColorStop(0, `rgb(${v},${v},${v + 3})`); gr.addColorStop(0.5, `rgb(${v + 22},${v + 22},${v + 26})`); gr.addColorStop(1, `rgb(${v},${v},${v + 3})`);
      g.fillStyle = gr; g.fillRect(x * 8, y * 8, 8, 8);
    }
    const t = ctex(c, true); t.repeat.set(6, 6); return t;
  })());
  T.honey = () => T._honey || (T._honey = (() => {
    const c = cnv(64, 64), g = c.getContext('2d');
    g.fillStyle = '#050506'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#3a3c42'; g.lineWidth = 2.2;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
      const cx = col * 12 + (row % 2) * 6, cy = row * 11 + 4;
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); } g.closePath(); g.stroke();
    }
    const t = ctex(c, true); t.repeat.set(5, 1.5); return t;
  })());
  T.disc = () => T._disc || (T._disc = (() => {
    const c = cnv(128, 128), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#5a5d63'); gr.addColorStop(0.45, '#2c2e33'); gr.addColorStop(0.5, '#9a9ea6'); gr.addColorStop(1, '#7d8189');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#111';
    for (let r = 0; r < 3; r++) for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2 + r * 0.12, d = 38 + r * 8; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1.8, 0, Math.PI * 2); g.fill(); }
    return ctex(c, false);
  })());
  T.blob = () => T._blob || (T._blob = (() => {
    const c = cnv(64, 128), g = c.getContext('2d');
    g.translate(32, 64); g.scale(1, 2);
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 31); gr.addColorStop(0, 'rgba(0,0,0,0.78)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 31, 0, Math.PI * 2); g.fill();
    return ctex(c, false, false);
  })());
  T.sidewall = () => T._side || (T._side = (() => {
    const c = cnv(256, 16), g = c.getContext('2d');
    g.fillStyle = '#161616'; g.fillRect(0, 0, 256, 16);
    g.fillStyle = '#2a2a2a'; g.font = 'bold 10px Arial'; g.fillText('HORIZON  P ZERO  ·  275/35 ZR20  ·  HORIZON', 4, 12);
    return ctex(c, true);
  })());
  AH.carTex = T;

  // ---------- materials ----------
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  AH.lin = lin;
  const reflect = (m, k = 1) => { m.userData.reflect = true; m.envMapIntensity = k; return m; };
  const M = AH.carMats = {
    glass: reflect(new THREE.MeshPhysicalMaterial({ color: 0x05080c, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.92 }), 1.6),
    trim: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.3 }),
    rubberTrim: new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.85 }),
    carbon: reflect(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: T.carbon(), metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05 }), 1.2),
    chrome: reflect(new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1, roughness: 0.08 }), 1.4),
    grille: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.honey(), roughness: 0.6, metalness: 0.4 }),
    head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf3ff, emissiveIntensity: 3.2 }),
    headHousing: reflect(new THREE.MeshPhysicalMaterial({ color: 0x15171c, metalness: 0.9, roughness: 0.12, clearcoat: 1 }), 1.3),
    tail: new THREE.MeshStandardMaterial({ color: 0x400006, emissive: 0xff1428, emissiveIntensity: 3 }),
    tailLens: reflect(new THREE.MeshPhysicalMaterial({ color: 0x3a0308, metalness: 0.2, roughness: 0.1, clearcoat: 1 }), 1.2),
    tire: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.92, metalness: 0 }),
    tireSide: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.sidewall(), roughness: 0.9 }),
    disc: reflect(new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.disc(), metalness: 0.85, roughness: 0.35 }), 0.8),
    blob: new THREE.MeshBasicMaterial({ map: T.blob(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
    stripeW: new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    stripeK: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    flame: new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    taxi: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9a0, emissiveIntensity: 1.2 }),
  };
  M.arch = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95, side: THREE.DoubleSide });
  for (const m of Object.values(M)) if (m.color) m.color.convertSRGBToLinear();
  // keep older references working (AH.mats is reset by the race on dispose)
  AH.mats = M;
  const rimCache = {}, calCache = {};
  AH.RIM_COLORS = { silver: 0xd5d9e0, gunmetal: 0x4a4e56, black: 0x141518, bronze: 0x8a6a3a, gold: 0xc9a24a, white: 0xf0f0f0 };
  const rimMat = (c) => rimCache[c] || (rimCache[c] = reflect(new THREE.MeshPhysicalMaterial({ color: lin(c), metalness: 1, roughness: c === 0x141518 ? 0.35 : 0.2, clearcoat: 0.6 }), 1.2));
  const calMat = (c) => calCache[c] || (calCache[c] = new THREE.MeshPhysicalMaterial({ color: lin(c), metalness: 0.2, roughness: 0.35, clearcoat: 1 }));

  AH.FINISHES = { metallic: 'Metalik', gloss: 'Połysk', pearl: 'Perła', matte: 'Mat' };
  AH.paintMat = (color, finish = 'metallic') => {
    const c = lin(color);
    let m;
    if (finish === 'matte') m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.25, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.6 });
    else if (finish === 'gloss') m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.05, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.02 });
    else if (finish === 'pearl') { m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.5, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.03 }); m.sheen = c.clone().lerp(new THREE.Color(0xffffff), 0.5); }
    else m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.72, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035 });
    return reflect(m, finish === 'matte' ? 0.35 : finish === 'gloss' ? 0.6 : 0.75);
  };

  // ---------- geometry helpers ----------
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of list) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.computeBoundingSphere();
    return m;
  }
  class Kit {
    constructor() { this.parts = {}; }
    add(key, geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const m = new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, 'YXZ')), new V3(...s));
      g.applyMatrix4(m);
      (this.parts[key] = this.parts[key] || []).push(g);
      return this;
    }
    sym(key, geo, p, r = [0, 0, 0], s) { this.add(key, geo, p, r, s); this.add(key, geo, [-p[0], p[1], p[2]], [r[0], -r[1], -r[2]], s); return this; }
    build() { const o = {}; for (const k in this.parts) o[k] = merge(this.parts[k]); return o; }
  }
  // 1D Catmull-Rom over keyframes sorted by z descending (front → rear)
  function interp(keys, z, ch) {
    const n = keys.length;
    if (z >= keys[0][0]) return keys[0][ch];
    if (z <= keys[n - 1][0]) return keys[n - 1][ch];
    let i = 0; while (i < n - 1 && !(z <= keys[i][0] && z >= keys[i + 1][0])) i++;
    const p0 = keys[Math.max(0, i - 1)][ch], p1 = keys[i][ch], p2 = keys[i + 1][ch], p3 = keys[Math.min(n - 1, i + 2)][ch];
    const t = (keys[i][0] - z) / (keys[i][0] - keys[i + 1][0]);
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  const se = (a, n) => Math.sign(a) * Math.pow(Math.abs(a), 2 / n);
  function loftGeo(zs, ring, closed = true, caps = false) {
    const pos = [], uv = [], idx = [];
    const R = ring(zs[0]).length;
    zs.forEach((z, i) => { const pts = ring(z); pts.forEach(([x, y], k) => { pos.push(x, y, z); uv.push(k / R, i / (zs.length - 1)); }); });
    const segs = closed ? R : R - 1;
    for (let i = 0; i < zs.length - 1; i++) for (let k = 0; k < segs; k++) {
      const a = i * R + k, b = i * R + (k + 1) % R, c = (i + 1) * R + k, d = (i + 1) * R + (k + 1) % R;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const out = [g];
    if (caps) for (const [z, flip] of [[zs[0], false], [zs[zs.length - 1], true]]) {
      const pts = ring(z), cp = [], ci = [];
      let cx = 0, cy = 0; pts.forEach(([x, y]) => { cx += x; cy += y; }); cx /= pts.length; cy /= pts.length;
      cp.push(cx, cy, z); pts.forEach(([x, y]) => cp.push(x, y, z));
      for (let k = 0; k < pts.length; k++) { const a = 1 + k, b = 1 + (k + 1) % pts.length; ci.push(0, a, b, 0, b, a); }
      let cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setIndex(ci); cg = cg.toNonIndexed(); cg.computeVertexNormals();
      out.push(cg);
    }
    return out;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r1, r2, h, s = 16, open = false) => new THREE.CylinderGeometry(r1, r2, h, s, 1, open);
  // rounded slab (for light units / intakes): extruded rounded rectangle, facing +z
  function slab(w, h, d, rad = 0.02) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2, r = Math.min(rad, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2); return g;
  }

  // ---------- vehicle definitions ----------
  // body keys: [z, halfWidth, bottomY, shoulderY (widest line), topY (hood/deck centre)]
  // cabin keys: [z, halfWidth, beltY, roofY]
  const DEF = {
    hatch: { r: 0.33, tw: 0.24, wf: 1.32, wr: -1.27, flare: 0.03, nB: 5, nT: 2.6, nC: 3.2,
      body: [[2.07, 0.78, 0.30, 0.50, 0.66], [1.95, 0.87, 0.24, 0.54, 0.78], [1.3, 0.9, 0.22, 0.58, 0.86], [0.45, 0.9, 0.22, 0.6, 0.93], [-0.8, 0.9, 0.22, 0.62, 0.97], [-1.85, 0.88, 0.25, 0.64, 0.98], [-2.07, 0.81, 0.32, 0.64, 0.95]],
      cabin: [[0.62, 0.76, 0.9, 0.92], [0.05, 0.8, 0.91, 1.38], [-0.6, 0.8, 0.94, 1.46], [-1.55, 0.77, 0.96, 1.44], [-2.0, 0.72, 0.96, 1.22]],
      roofCut: [-0.05, -1.75], head: 'swept', tail: 'vslim', grille: 'hex', spoiler: 'roof', exh: [[0.32, 1], [-0.32, 1]], exhR: 0.045, rim: 'y', rimColor: 'silver', caliper: 0xd4202f, carbon: false, mirror: true, skirt: 'trim', diffuser: 'small', finish: 'gloss' },
    muscle: { r: 0.36, tw: 0.28, wf: 1.48, wr: -1.42, flare: 0.05, nB: 6, nT: 3.2, nC: 3.4,
      body: [[2.37, 0.86, 0.3, 0.6, 0.76], [2.22, 0.95, 0.25, 0.65, 0.86], [1.2, 0.98, 0.24, 0.66, 0.92], [0.0, 0.97, 0.24, 0.66, 0.95], [-1.2, 0.99, 0.24, 0.68, 0.97], [-2.2, 0.96, 0.27, 0.7, 0.98], [-2.37, 0.9, 0.33, 0.7, 0.96]],
      cabin: [[0.38, 0.8, 0.94, 0.96], [-0.12, 0.81, 0.95, 1.35], [-0.9, 0.79, 0.97, 1.37], [-1.85, 0.72, 0.98, 1.0]],
      roofCut: [-0.2, -1.2], head: 'round', tail: 'tri', grille: 'wide', spoiler: 'duck', exh: [[0.55, 2], [-0.55, 2]], exhR: 0.05, rim: 'five', rimColor: 'gunmetal', caliper: 0x111111, carbon: false, mirror: true, skirt: 'paint', diffuser: 'none', stripes: true, scoop: true, finish: 'gloss' },
    coupe: { r: 0.36, tw: 0.27, wf: 1.42, wr: -1.36, flare: 0.04, nB: 5, nT: 2.4, nC: 3,
      body: [[2.28, 0.82, 0.28, 0.44, 0.58], [2.12, 0.92, 0.22, 0.5, 0.7], [1.2, 0.95, 0.22, 0.55, 0.79], [0.2, 0.94, 0.22, 0.58, 0.85], [-1.0, 0.96, 0.22, 0.6, 0.89], [-2.0, 0.93, 0.25, 0.62, 0.9], [-2.28, 0.86, 0.31, 0.62, 0.86]],
      cabin: [[0.62, 0.76, 0.83, 0.85], [0.0, 0.78, 0.84, 1.26], [-0.7, 0.77, 0.87, 1.29], [-1.6, 0.71, 0.88, 1.06], [-2.02, 0.64, 0.88, 0.9]],
      roofCut: [-0.12, -1.2], head: 'slitL', tail: 'bar', grille: 'shield', spoiler: 'lip', exh: [[0.62, 2], [-0.62, 2]], exhR: 0.04, rim: 'multi', rimColor: 'silver', caliper: 0x1f4fd4, carbon: false, mirror: true, skirt: 'trim', diffuser: 'small', finish: 'metallic' },
    wedge: { r: 0.36, tw: 0.3, wf: 1.45, wr: -1.38, flare: 0.07, nB: 6, nT: 2.2, nC: 2.6,
      body: [[2.3, 0.8, 0.24, 0.3, 0.4], [2.12, 0.93, 0.19, 0.34, 0.5], [1.2, 1.0, 0.18, 0.42, 0.66], [0.4, 1.0, 0.18, 0.5, 0.79], [-0.6, 1.02, 0.18, 0.56, 0.9], [-1.6, 1.02, 0.2, 0.58, 0.92], [-2.3, 0.96, 0.29, 0.6, 0.88]],
      cabin: [[0.95, 0.7, 0.7, 0.72], [0.28, 0.72, 0.74, 1.11], [-0.45, 0.7, 0.84, 1.14], [-1.25, 0.58, 0.9, 0.97]],
      roofCut: [0.15, -0.6], head: 'arrow', tail: 'x', grille: 'none', spoiler: 'wing', exh: [[0, 3]], exhR: 0.05, rim: 'turbine', rimColor: 'black', caliper: 0xffc21a, carbon: true, mirror: true, skirt: 'carbon', diffuser: 'big', sideIntake: true, louvers: true, finish: 'pearl' },
    hyper: { r: 0.37, tw: 0.32, wf: 1.5, wr: -1.48, flare: 0.08, nB: 6, nT: 2.2, nC: 2.4,
      body: [[2.4, 0.82, 0.24, 0.32, 0.43], [2.22, 0.96, 0.19, 0.36, 0.52], [1.3, 1.03, 0.18, 0.44, 0.64], [0.4, 1.02, 0.18, 0.52, 0.79], [-0.6, 1.04, 0.18, 0.58, 0.89], [-1.8, 1.03, 0.2, 0.58, 0.86], [-2.4, 0.92, 0.27, 0.56, 0.79]],
      cabin: [[0.78, 0.66, 0.68, 0.7], [0.18, 0.68, 0.73, 1.09], [-0.55, 0.62, 0.81, 1.12], [-1.55, 0.4, 0.86, 0.92]],
      roofCut: [0.05, -0.75], head: 'quad', tail: 'ring', grille: 'split', spoiler: 'swan', exh: [[0.12, 1], [-0.12, 1], [0.12, 1, 0.1], [-0.12, 1, 0.1]], exhR: 0.045, rim: 'mesh', rimColor: 'bronze', caliper: 0x111111, carbon: true, mirror: true, skirt: 'carbon', diffuser: 'big', sideIntake: true, louvers: true, finish: 'metallic' },
    proto: { r: 0.37, tw: 0.32, wf: 1.56, wr: -1.5, flare: 0.1, nB: 6, nT: 2.0, nC: 2.2,
      body: [[2.47, 0.78, 0.22, 0.26, 0.35], [2.26, 0.98, 0.17, 0.3, 0.46], [1.3, 1.05, 0.16, 0.4, 0.6], [0.3, 1.03, 0.16, 0.44, 0.66], [-0.8, 1.05, 0.16, 0.48, 0.74], [-2.0, 1.04, 0.18, 0.5, 0.72], [-2.47, 0.95, 0.25, 0.48, 0.66]],
      cabin: [[0.9, 0.5, 0.6, 0.62], [0.22, 0.56, 0.63, 1.05], [-0.5, 0.5, 0.69, 1.07], [-1.65, 0.18, 0.71, 0.84]],
      roofCut: [0.1, -0.9], head: 'pixel', tail: 'fullbar', grille: 'slot', spoiler: 'fin', exh: [[0.25, 1], [-0.25, 1]], exhR: 0.055, rim: 'turbine', rimColor: 'gunmetal', caliper: 0x8a2bff, carbon: true, mirror: false, skirt: 'carbon', diffuser: 'big', sideIntake: true, finish: 'matte', neon: true },
    sedan: { r: 0.33, tw: 0.23, wf: 1.42, wr: -1.4, flare: 0.015, nB: 5, nT: 3, nC: 3.4, lite: true,
      body: [[2.3, 0.8, 0.32, 0.6, 0.76], [2.12, 0.88, 0.27, 0.65, 0.83], [1.1, 0.9, 0.26, 0.68, 0.9], [0, 0.9, 0.26, 0.7, 0.94], [-1.4, 0.9, 0.26, 0.72, 0.98], [-2.12, 0.88, 0.29, 0.72, 1.0], [-2.3, 0.82, 0.35, 0.72, 0.98]],
      cabin: [[0.78, 0.78, 0.93, 0.96], [0.22, 0.8, 0.95, 1.43], [-0.9, 0.79, 0.98, 1.46], [-1.55, 0.76, 1.0, 1.04]],
      roofCut: [0.1, -0.95], head: 'simple', tail: 'block', grille: 'bars', spoiler: 'none', exh: [[0.4, 1]], exhR: 0.035, rim: 'dish', rimColor: 'silver', caliper: 0, carbon: false, mirror: true, skirt: 'none', diffuser: 'none', finish: 'gloss' },
    van: { r: 0.35, tw: 0.24, wf: 1.62, wr: -1.55, flare: 0.015, nB: 7, nT: 7, nC: 5, lite: true,
      body: [[2.5, 0.9, 0.34, 0.72, 0.92], [2.32, 0.98, 0.3, 0.8, 1.04], [1.75, 1.0, 0.3, 0.86, 1.14], [1.28, 1.0, 0.3, 0.92, 1.18], [1.08, 1.0, 0.3, 0.98, 2.2], [0.6, 1.0, 0.3, 1.0, 2.24], [-2.3, 1.0, 0.3, 1.0, 2.24], [-2.5, 0.96, 0.34, 1.0, 2.18]],
      cabin: [[1.8, 0.9, 1.1, 1.12], [1.15, 0.94, 1.12, 2.06], [0.95, 0.95, 1.2, 2.1]],
      roofCut: null, head: 'van', tail: 'vanv', grille: 'bars', spoiler: 'none', exh: [[0.5, 1]], exhR: 0.035, rim: 'dish', rimColor: 'gunmetal', caliper: 0, carbon: false, mirror: true, skirt: 'none', diffuser: 'none', vanWindows: true, finish: 'gloss' },
  };
  AH.CAR_DEF = DEF;

  function bodyAt(d, z) { return { hw: interp(d.body, z, 1), yb: interp(d.body, z, 2), ys: interp(d.body, z, 3), yt: interp(d.body, z, 4) }; }
  function bodyTop(d, z, x) { const b = bodyAt(d, z); const f = Math.min(1, Math.abs(x) / b.hw); return b.ys + (b.yt - b.ys) * Math.pow(Math.max(0, 1 - Math.pow(f, d.nT)), 1 / d.nT); }
  function bodyHalfW(d, z, y) { const b = bodyAt(d, z); const h = y >= b.ys ? b.yt - b.ys : b.ys - b.yb, n = y >= b.ys ? d.nT : d.nB; const f = Math.min(1, Math.abs(y - b.ys) / h); return b.hw * Math.pow(Math.max(0, 1 - Math.pow(f, n)), 1 / n); }
  function cabinAt(d, z) { return { hw: interp(d.cabin, z, 1), base: interp(d.cabin, z, 2), roof: interp(d.cabin, z, 3) }; }

  // ---------- geometry build (cached per style) ----------
  const cache = AH.geoCache = AH.geoCache || {};
  function buildStyle(style) {
    const d = DEF[style], K = new Kit();
    const zF = d.body[0][0], zR = d.body[d.body.length - 1][0], L = zF - zR;
    const R = d.r, Ra = R + 0.075;
    const archBottom = (z) => {
      let y = -1;
      for (const wz of [d.wf, d.wr]) { const dz = z - wz; if (Math.abs(dz) < Ra) y = Math.max(y, R + Math.sqrt(Ra * Ra - dz * dz) - 0.02); }
      return y;
    };
    const flareAt = (z) => { let f = 0; for (const wz of [d.wf, d.wr]) { const dz = (z - wz) / (Ra + 0.35); if (Math.abs(dz) < 1) f = Math.max(f, Math.cos(dz * Math.PI / 2) ** 2); } return f * d.flare; };
    const S = 26;
    const bodyRing = (z) => {
      const b = bodyAt(d, z), hw = b.hw + flareAt(z);
      let yb = b.yb; const ab = archBottom(z); if (ab > yb) yb = Math.min(ab, b.ys - 0.03);
      const pts = [];
      for (let k = 0; k <= S; k++) {
        const a = -Math.PI / 2 + Math.PI * k / S, top = a > 0;
        const n = top ? d.nT : d.nB, h = top ? b.yt - b.ys : b.ys - yb;
        pts.push([hw * se(Math.cos(a), n), b.ys + h * se(Math.sin(a), n)]);
      }
      for (let k = S - 1; k >= 1; k--) pts.push([-pts[k][0], pts[k][1]]);
      return pts;
    };
    // stations: denser near the ends and arches
    const zs = [];
    for (let i = 0; i <= 70; i++) { const t = i / 70; zs.push(zF - L * (0.5 - 0.5 * Math.cos(Math.PI * t))); }
    for (const g of loftGeo(zs, bodyRing, true, true)) K.add('paint', g);

    // cabin / greenhouse
    const cz0 = d.cabin[0][0], cz1 = d.cabin[d.cabin.length - 1][0];
    const C = 14;
    const cabinRing = (z, a0 = 0, a1 = Math.PI / 2, grow = 0, closed = true) => {
      const c = cabinAt(d, z), hw = c.hw + grow, h = Math.max(0.001, c.roof - c.base) + grow;
      const pts = [];
      if (closed) pts.push([hw, c.base - 0.1]);
      for (let k = 0; k <= C; k++) { const a = a0 + (a1 - a0) * k / C; pts.push([hw * se(Math.cos(a), d.nC), c.base + h * se(Math.sin(a), d.nC)]); }
      const right = pts.slice();
      for (let k = right.length - (a1 >= Math.PI / 2 - 1e-6 ? 2 : 1); k >= 0; k--) pts.push([-right[k][0], right[k][1]]);
      return pts;
    };
    const czs = []; for (let i = 0; i <= 30; i++) czs.push(cz0 - (cz0 - cz1) * i / 30);
    for (const g of loftGeo(czs, (z) => cabinRing(z), true, true)) K.add('glass', g);
    // roof panel (two-tone carbon roof on performance cars) + pillars
    if (d.roofCut) {
      const rz = []; for (let i = 0; i <= 18; i++) rz.push(d.roofCut[0] - (d.roofCut[0] - d.roofCut[1]) * i / 18);
      const ringR = (z) => { const r = cabinRing(z, 0.62, Math.PI / 2, 0.012, false); return r; };
      for (const g of loftGeo(rz, ringR, false, false)) K.add(d.carbon ? 'carbon' : 'paint', g);
      // A and C pillars: thin painted bands following the glass edge
      for (const sx of [1, -1]) {
        const pil = [];
        const band = (zA, zB, n) => { const pts = []; for (let i = 0; i <= n; i++) { const z = zA + (zB - zA) * i / n, c = cabinAt(d, z); const yy = c.base + (c.roof - c.base) * 0.5; pts.push(new V3(sx * (c.hw * 0.86 + 0.012), yy + (c.roof - c.base) * 0.3, z)); } return pts; };
        const aP = band(cz0 - 0.04, d.roofCut[0], 8);
        if (aP.length > 1) K.add(d.carbon ? 'carbon' : 'paint', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(aP), 12, 0.035, 5, false));
      }
    }
    // beltline trim
    {
      const bz = []; for (let i = 0; i <= 20; i++) bz.push(cz0 - 0.08 - (cz0 - cz1 - 0.16) * i / 20);
      for (const sx of [1, -1]) {
        const side = (z) => { const c = cabinAt(d, z), pts = []; for (let k = 0; k <= 2; k++) { const a = 0.1 * k / 2; pts.push([sx * (c.hw + 0.008) * se(Math.cos(a), d.nC), c.base + (c.roof - c.base + 0.008) * se(Math.sin(a), d.nC) - 0.012]); } return sx < 0 ? pts.reverse() : pts; };
        for (const g of loftGeo(bz, side, false, false)) K.add(d.lite ? 'trim' : 'chrome', g);
      }
    }

    // stripes (muscle)
    if (d.stripes) {
      for (const xc of [-0.16, 0.16]) {
        const sz = [], w = 0.11;
        for (let i = 0; i <= 60; i++) sz.push(zF - 0.02 - (L - 0.04) * i / 60);
        const ring = (z) => { const pts = []; for (let k = 0; k <= 3; k++) { const x = xc - w / 2 + w * k / 3; const c = cabinAt(d, z); let y = bodyTop(d, z, x); if (z <= cz0 && z >= cz1 && c.roof > c.base + 0.02) { const f = Math.min(1, Math.abs(x) / c.hw); y = Math.max(y, c.base + (c.roof - c.base) * Math.pow(Math.max(0, 1 - Math.pow(f, d.nC)), 1 / d.nC)); } pts.push([x, y + 0.006]); } return pts; };
        for (const g of loftGeo(sz, ring, false, false)) K.add('stripeW', g);
      }
    }

    // wheel-arch liners (hide the see-through above the tyres)
    for (const wz of [d.wf, d.wr]) {
      const b = bodyAt(d, wz), wdt = (b.hw + d.flare) * 2 - 0.12;
      K.add('arch', new THREE.CylinderGeometry(Ra + 0.01, Ra + 0.01, wdt, 24, 1, true, -Math.PI / 2 - 1.25, 2.5).rotateZ(Math.PI / 2), [0, R, wz]);
    }
    // ---------- front fascia ----------
    const F = bodyAt(d, zF), fz = zF + 0.004;
    const capW = (y) => bodyHalfW(d, zF, y);
    const ly = F.ys + (F.yt - F.ys) * 0.25, lx = Math.min(F.hw * 0.62, capW(ly) - 0.2);
    switch (d.head) {
      case 'swept':
        K.sym('headHousing', slab(0.34, 0.12, 0.05, 0.04), [lx, ly, fz], [0, 0.25, 0.06]);
        K.sym('head', cyl(0.042, 0.042, 0.03, 16), [lx + 0.06, ly - 0.005, fz + 0.03], [Math.PI / 2, 0, 0]);
        K.sym('head', box(0.26, 0.016, 0.02), [lx - 0.02, ly + 0.045, fz + 0.03], [0, 0.25, 0.08]);
        break;
      case 'round':
        for (const dx of [-0.1, 0.1]) {
          K.sym('chrome', new THREE.TorusGeometry(0.075, 0.014, 8, 24), [lx + dx, ly - 0.02, fz + 0.025]);
          K.sym('head', cyl(0.066, 0.066, 0.03, 20), [lx + dx, ly - 0.02, fz + 0.02], [Math.PI / 2, 0, 0]);
        }
        break;
      case 'slitL':
        K.sym('headHousing', slab(0.42, 0.075, 0.05, 0.03), [lx, ly + 0.01, fz], [0, 0.3, 0]);
        K.sym('head', box(0.4, 0.014, 0.02), [lx, ly + 0.03, fz + 0.03], [0, 0.3, 0]);
        K.sym('head', box(0.014, 0.1, 0.02), [lx + 0.19, ly - 0.03, fz + 0.03], [0, 0.3, 0]);
        K.sym('head', cyl(0.025, 0.025, 0.02, 12), [lx - 0.05, ly, fz + 0.03], [Math.PI / 2, 0, 0]);
        K.sym('head', cyl(0.025, 0.025, 0.02, 12), [lx + 0.04, ly, fz + 0.03], [Math.PI / 2, 0, 0]);
        break;
      case 'arrow':
        K.sym('headHousing', slab(0.44, 0.06, 0.04, 0.02), [lx, ly, fz], [0, 0.35, -0.12]);
        K.sym('head', box(0.42, 0.012, 0.02), [lx, ly + 0.018, fz + 0.025], [0, 0.35, -0.12]);
        K.sym('head', box(0.2, 0.012, 0.02), [lx + 0.12, ly - 0.03, fz + 0.025], [0, 0.35, 0.45]);
        break;
      case 'quad':
        K.sym('headHousing', slab(0.42, 0.085, 0.05, 0.04), [lx, ly, fz], [0, 0.35, -0.05]);
        for (let i = 0; i < 4; i++) K.sym('head', cyl(0.024, 0.024, 0.02, 12), [lx - 0.14 + i * 0.09, ly + 0.008 - i * 0.004, fz + 0.03], [Math.PI / 2, 0, 0]);
        K.sym('head', box(0.36, 0.01, 0.02), [lx, ly - 0.04, fz + 0.03], [0, 0.35, -0.05]);
        break;
      case 'pixel':
        for (let i = 0; i < 4; i++) K.sym('head', box(0.05, 0.022, 0.02), [lx + 0.12, ly + 0.05 - i * 0.032, fz + 0.02]);
        K.sym('head', box(0.36, 0.01, 0.02), [lx - 0.06, ly + 0.07, fz + 0.02], [0, 0.3, 0]);
        K.sym('headHousing', slab(0.4, 0.15, 0.03, 0.02), [lx, ly + 0.01, fz - 0.005], [0, 0.3, 0]);
        break;
      case 'simple':
        K.sym('headHousing', slab(0.34, 0.11, 0.04, 0.025), [lx, ly, fz]);
        K.sym('head', cyl(0.04, 0.04, 0.02, 12), [lx + 0.06, ly, fz + 0.025], [Math.PI / 2, 0, 0]);
        K.sym('head', box(0.12, 0.015, 0.02), [lx - 0.07, ly - 0.03, fz + 0.025]);
        break;
      case 'van':
        K.sym('headHousing', slab(0.3, 0.17, 0.04, 0.03), [lx, ly - 0.02, fz]);
        K.sym('head', cyl(0.05, 0.05, 0.02, 14), [lx, ly - 0.02, fz + 0.025], [Math.PI / 2, 0, 0]);
        break;
    }
    // grilles / intakes
    const gy = F.yb + (F.ys - F.yb) * 0.45;
    switch (d.grille) {
      case 'hex': K.add('grille', slab(0.95, 0.17, 0.03, 0.06), [0, gy, fz]); K.add('grille', slab(0.6, 0.08, 0.03, 0.03), [0, F.ys + 0.02, fz]); K.sym('grille', slab(0.18, 0.12, 0.03, 0.03), [0.62, gy, fz]); break;
      case 'wide': K.add('grille', slab(1.4, 0.2, 0.03, 0.03), [0, gy + 0.05, fz]); for (const y of [-0.05, 0, 0.05]) K.add('chrome', box(1.36, 0.012, 0.02), [0, gy + 0.05 + y, fz + 0.02]); K.add('chrome', new THREE.TorusGeometry(0.035, 0.008, 6, 16), [0, gy + 0.05, fz + 0.03]); break;
      case 'shield': K.add('grille', slab(0.5, 0.2, 0.03, 0.06), [0, gy + 0.03, fz]); K.add('chrome', box(0.54, 0.012, 0.02), [0, gy + 0.135, fz + 0.01]); K.sym('grille', slab(0.34, 0.07, 0.03, 0.03), [0.55, gy - 0.05, fz], [0, 0, 0.1]); break;
      case 'none': K.add('grille', slab(1.3, 0.085, 0.03, 0.03), [0, F.yb + 0.08, fz]); K.sym('grille', slab(0.22, 0.12, 0.03, 0.04), [0.55, gy + 0.02, fz], [0, 0, -0.2]); break;
      case 'split': K.add('grille', slab(0.5, 0.1, 0.03, 0.04), [0, gy, fz]); K.sym('grille', slab(0.36, 0.14, 0.03, 0.05), [0.52, gy + 0.01, fz]); for (let i = 0; i < 3; i++) K.sym('carbon', box(0.012, 0.13, 0.04), [0.4 + i * 0.1, gy + 0.01, fz + 0.01]); break;
      case 'slot': K.add('grille', slab(1.5, 0.07, 0.03, 0.03), [0, F.yb + 0.07, fz]); break;
      case 'bars': K.add('grille', slab(0.7, 0.14, 0.03, 0.04), [0, gy + 0.04, fz]); for (const y of [-0.03, 0.02]) K.add('chrome', box(0.66, 0.01, 0.02), [0, gy + 0.04 + y, fz + 0.02]); break;
    }
    // splitter
    if (!d.lite) K.add(d.carbon ? 'carbon' : 'trim', box(F.hw * 2 - 0.05, 0.025, 0.14), [0, F.yb - 0.005, zF - 0.02]);
    // hood scoop / louvers
    if (d.scoop) { const z = 1.05, y = bodyTop(d, z, 0); K.add('paint', slab(0.42, 0.09, 0.62, 0.04), [0, y + 0.02, z], [-0.03, 0, 0]); K.add('trim', slab(0.32, 0.05, 0.02, 0.02), [0, y + 0.04, z + 0.31]); }
    if (d.louvers) {
      for (let i = 0; i < 5; i++) { const z = 1.25 - i * 0.07; for (const sx of [-1, 1]) { const x = sx * 0.28, y = bodyTop(d, z, x); K.add('trim', box(0.22, 0.012, 0.03), [x, y + 0.004, z], [-0.25, 0, 0]); } }
      for (let i = 0; i < 6; i++) { const z = -1.0 - i * 0.12; const y = bodyTop(d, z, 0); K.add(d.carbon ? 'carbon' : 'trim', box(0.7, 0.014, 0.05), [0, y + 0.005, z], [-0.12, 0, 0]); }
    }

    // ---------- rear fascia ----------
    const B = bodyAt(d, zR), rz = zR - 0.004;
    const ty = B.ys + (B.yt - B.ys) * 0.3, tx = Math.min(B.hw * 0.66, bodyHalfW(d, zR, ty) - 0.16);
    switch (d.tail) {
      case 'vslim': K.sym('tailLens', slab(0.1, 0.24, 0.04, 0.03), [tx + 0.06, ty, rz]); K.sym('tail', box(0.03, 0.2, 0.02), [tx + 0.06, ty, rz - 0.025]); K.sym('tail', box(0.14, 0.02, 0.02), [tx - 0.04, ty + 0.08, rz - 0.025]); break;
      case 'tri': for (let i = 0; i < 3; i++) { K.sym('tailLens', slab(0.09, 0.13, 0.04, 0.02), [tx - 0.12 + i * 0.12, ty, rz]); K.sym('tail', box(0.06, 0.1, 0.02), [tx - 0.12 + i * 0.12, ty, rz - 0.025]); } break;
      case 'bar': K.add('tailLens', slab(B.hw * 1.6, 0.06, 0.04, 0.03), [0, ty, rz]); K.add('tail', box(B.hw * 1.56, 0.014, 0.02), [0, ty, rz - 0.025]); K.sym('tail', slab(0.22, 0.05, 0.02, 0.02), [tx, ty - 0.005, rz - 0.03]); break;
      case 'x': for (const a of [0.5, -0.5]) K.sym('tail', box(0.3, 0.018, 0.02), [tx, ty, rz - 0.02], [0, 0, a]); K.sym('tailLens', slab(0.32, 0.16, 0.03, 0.04), [tx, ty, rz + 0.005]); break;
      case 'ring': for (const dx of [-0.1, 0.1]) { K.sym('tail', new THREE.TorusGeometry(0.075, 0.016, 8, 28), [tx + dx, ty, rz - 0.02]); K.sym('tailLens', cyl(0.07, 0.07, 0.02, 20), [tx + dx, ty, rz - 0.005], [Math.PI / 2, 0, 0]); } break;
      case 'fullbar': K.add('tail', box(B.hw * 1.8, 0.012, 0.02), [0, ty + 0.03, rz - 0.02]); K.add('tailLens', slab(B.hw * 1.84, 0.05, 0.03, 0.02), [0, ty + 0.03, rz]); break;
      case 'block': K.sym('tailLens', slab(0.32, 0.13, 0.04, 0.03), [tx, ty, rz]); K.sym('tail', box(0.26, 0.04, 0.02), [tx, ty + 0.02, rz - 0.025]); break;
      case 'vanv': K.sym('tailLens', slab(0.12, 0.42, 0.04, 0.03), [B.hw - 0.12, B.ys + 0.15, rz]); K.sym('tail', box(0.08, 0.14, 0.02), [B.hw - 0.12, B.ys + 0.25, rz - 0.025]); break;
    }
    // diffuser + exhausts
    const dy = B.yb + 0.02;
    if (d.diffuser !== 'none') {
      const big = d.diffuser === 'big', w = big ? B.hw * 1.5 : B.hw * 1.1;
      K.add(d.carbon ? 'carbon' : 'trim', box(w, big ? 0.13 : 0.08, 0.3), [0, dy + 0.02, zR + 0.12]);
      const fins = big ? 7 : 4; for (let i = 0; i < fins; i++) K.add(d.carbon ? 'carbon' : 'trim', box(0.012, big ? 0.16 : 0.1, 0.34), [-w / 2 + w * (i + 0.5) / fins, dy + 0.04, zR + 0.1]);
    }
    const exhPos = [];
    for (const e of d.exh) {
      const n = e[1], x0 = e[0], yy = dy + 0.07 + (e[2] || 0);
      for (let i = 0; i < n; i++) {
        const x = n === 3 ? (i - 1) * 0.12 : n === 2 ? x0 + (i ? 0.06 : -0.06) * Math.sign(x0 || 1) : x0;
        K.add('chrome', cyl(d.exhR, d.exhR * 0.92, 0.16, 16, true), [x, yy, zR - 0.02], [Math.PI / 2, 0, 0]);
        K.add('trim', cyl(d.exhR * 0.85, d.exhR * 0.85, 0.02, 16), [x, yy, zR - 0.06], [Math.PI / 2, 0, 0]);
        exhPos.push([x, yy, zR - 0.1]);
      }
    }
    // spoilers
    const deckZ = zR + 0.25, deckY = bodyTop(d, deckZ, 0);
    switch (d.spoiler) {
      case 'roof': { const c = cabinAt(d, cz1 + 0.1); K.add('paint', slab(c.hw * 1.8, 0.03, 0.26, 0.02), [0, c.roof - 0.02, cz1 + 0.08], [0.12, 0, 0]); break; }
      case 'duck': K.add('paint', slab(B.hw * 1.7, 0.05, 0.2, 0.02), [0, deckY + 0.03, zR + 0.12], [0.35, 0, 0]); break;
      case 'lip': K.add('trim', slab(B.hw * 1.5, 0.02, 0.12, 0.01), [0, deckY + 0.015, zR + 0.08], [0.25, 0, 0]); break;
      case 'wing': {
        const wy = deckY + 0.34, wz = zR + 0.3, ww = B.hw * 1.9;
        K.add('carbon', slab(ww, 0.035, 0.34, 0.015), [0, wy, wz], [0.12, 0, 0]);
        K.sym('carbon', slab(0.02, 0.2, 0.42, 0.02), [ww / 2, wy - 0.04, wz]);
        K.sym('trim', box(0.035, 0.32, 0.12), [0.42, wy - 0.17, wz + 0.02]);
        break;
      }
      case 'swan': {
        const wy = deckY + 0.42, wz = zR + 0.2, ww = B.hw * 1.95;
        K.add('carbon', slab(ww, 0.04, 0.42, 0.015), [0, wy, wz], [0.16, 0, 0]);
        K.add('carbon', slab(ww * 0.95, 0.02, 0.14, 0.01), [0, wy + 0.06, wz - 0.22], [0.5, 0, 0]);
        K.sym('carbon', slab(0.02, 0.28, 0.5, 0.03), [ww / 2, wy - 0.04, wz]);
        const neck = new THREE.CatmullRomCurve3([new V3(0, deckY, wz + 0.3), new V3(0, wy + 0.12, wz + 0.15), new V3(0, wy + 0.03, wz)]);
        for (const sx of [-0.38, 0.38]) K.add('carbon', new THREE.TubeGeometry(neck, 10, 0.022, 6, false), [sx, 0, 0]);
        break;
      }
      case 'fin': {
        const fin = new THREE.Shape(); const c1 = cz1 + 0.1, cr = cabinAt(d, c1).roof;
        fin.moveTo(c1, cr - 0.02); fin.lineTo(zR + 0.15, deckY + 0.5); fin.lineTo(zR + 0.02, deckY + 0.5); fin.lineTo(zR + 0.05, deckY); fin.lineTo(c1 - 0.3, cr - 0.25); fin.closePath();
        const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.025, bevelEnabled: false }); fg.translate(0, 0, -0.0125); fg.rotateY(-Math.PI / 2);
        K.add('paint', fg);
        K.add('carbon', slab(B.hw * 2.0, 0.035, 0.3, 0.015), [0, deckY + 0.48, zR + 0.12], [0.1, 0, 0]);
        K.sym('carbon', slab(0.02, 0.3, 0.4, 0.02), [B.hw, deckY + 0.36, zR + 0.12]);
        K.add('tail', box(0.012, 0.32, 0.02), [0, deckY + 0.3, zR + 0.05]);
        break;
      }
    }
    // side details
    const mid = (d.wf + d.wr) / 2, sideLen = d.wf - d.wr - (Ra + 0.1) * 2, midB = bodyAt(d, mid);
    if (d.skirt !== 'none') K.sym(d.skirt === 'carbon' ? 'carbon' : d.skirt === 'paint' ? 'paint' : 'trim', slab(0.07, 0.07, sideLen, 0.02), [midB.hw + flareAt(mid) - 0.02, midB.yb + 0.03, mid]);
    if (d.sideIntake) { const z = d.wr + Ra + 0.32, b = bodyAt(d, z); K.sym('grille', slab(0.04, 0.14, 0.42, 0.04), [b.hw - 0.0, b.ys - 0.04, z], [0, 0, 0.1]); }
    if (d.mirror) {
      const mz = cz0 - (d.lite ? 0.45 : 0.32), c = cabinAt(d, mz), my = c.base + 0.1;
      K.sym('paint', slab(0.2, 0.1, 0.12, 0.04), [c.hw + 0.16, my, mz], [0, 0.1, 0]);
      K.sym('trim', box(0.12, 0.025, 0.05), [c.hw + 0.06, my - 0.03, mz + 0.01]);
      K.sym('glass', box(0.17, 0.07, 0.01), [c.hw + 0.16, my, mz - 0.062]);
    }
    if (d.vanWindows) for (const z of [0.6, -0.2, -1.0]) K.sym('glass', slab(0.01, 0.42, 0.68, 0.06), [bodyAt(d, z).hw + 0.004, 1.62, z]);
    // door seams (subtle dark cut lines)
    if (!d.lite) { const z = d.wf - Ra - 0.25, b = bodyAt(d, z); K.sym('trim', box(0.004, b.ys - b.yb + 0.15, 0.006), [b.hw + flareAt(z) - 0.003, (b.ys + b.yb) / 2 + 0.07, z]); }

    const geos = K.build();
    // ---------- wheel ----------
    const tw = d.tw;
    const W = new Kit();
    const prof = [[R * 0.7, -tw / 2], [R * 0.92, -tw / 2], [R * 0.985, -tw / 2 + 0.025], [R, -tw / 2 + 0.06], [R, tw / 2 - 0.06], [R * 0.985, tw / 2 - 0.025], [R * 0.92, tw / 2], [R * 0.7, tw / 2]].map(([r, y]) => new THREE.Vector2(r, y));
    W.add('tire', new THREE.LatheGeometry(prof, 32).rotateZ(Math.PI / 2));
    const rr = R * 0.7, face = tw / 2 - 0.035;
    W.add('rim', cyl(rr, rr, tw * 0.92, 28, true).rotateZ(Math.PI / 2));
    W.add('rim', new THREE.TorusGeometry(rr, 0.014, 6, 32).rotateY(Math.PI / 2), [tw / 2 - 0.012, 0, 0]);
    W.add('rim', cyl(rr * 0.24, rr * 0.28, 0.07, 12).rotateZ(Math.PI / 2), [face, 0, 0]);
    W.add('chrome', cyl(rr * 0.1, rr * 0.1, 0.02, 10).rotateZ(Math.PI / 2), [face + 0.04, 0, 0]);
    const spoke = (n, w, twist = 0, lean = 0, x = face) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const len = rr * 0.76; W.add('rim', box(0.035, len, w), [x, Math.cos(a) * (rr * 0.24 + len / 2), Math.sin(a) * (rr * 0.24 + len / 2)], [a + twist, 0, 0]); } };
    switch (d.rim) {
      case 'five': spoke(5, 0.085); break;
      case 'y': for (let i = 0; i < 5; i++) for (const o of [-0.16, 0.16]) { const a = i / 5 * Math.PI * 2; const len = rr * 0.78; W.add('rim', box(0.03, len, 0.035), [face, Math.cos(a + o * 0.5) * (rr * 0.24 + len / 2), Math.sin(a + o * 0.5) * (rr * 0.24 + len / 2)], [a + o, 0, 0]); } break;
      case 'multi': spoke(10, 0.032); break;
      case 'turbine': for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, len = rr * 0.78; W.add('rim', box(0.03, len, 0.045), [face, Math.cos(a) * (rr * 0.24 + len / 2), Math.sin(a) * (rr * 0.24 + len / 2)], [a + 0.35, 0.5, 0]); } break;
      case 'mesh': for (const s of [1, -1]) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, len = rr * 0.8; W.add('rim', box(0.026, len, 0.026), [face, Math.cos(a) * (rr * 0.24 + len / 2), Math.sin(a) * (rr * 0.24 + len / 2)], [a + s * 0.42, 0, 0]); } break;
      case 'dish': W.add('rim', cyl(rr * 0.96, rr * 0.96, 0.03, 28).rotateZ(Math.PI / 2), [face - 0.02, 0, 0]); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; W.add('trim', cyl(0.035, 0.035, 0.035, 10).rotateZ(Math.PI / 2), [face - 0.0, Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6]); } break;
    }
    if (!d.lite) W.add('disc', cyl(rr * 0.86, rr * 0.86, 0.028, 32).rotateZ(Math.PI / 2), [-0.01, 0, 0]);
    else W.add('trim', cyl(rr * 0.8, rr * 0.8, 0.02, 20).rotateZ(Math.PI / 2), [-0.02, 0, 0]);
    const wgeos = W.build();
    const caliper = d.lite ? null : (() => { const k = new Kit(); k.add('c', slab(0.06, 0.15, 0.11, 0.03)); return k.build().c; })();
    // flames / blob
    return { body: geos, wheel: wgeos, caliper, exhPos, L, W: Math.max(...d.body.map(k => k[1])) * 2 + d.flare * 2 };
  }

  function getStyle(style) {
    if (!DEF[style]) style = 'coupe';
    if (!cache[style]) { const s = buildStyle(style); const flat = {}; for (const k in s.body) flat['b_' + k] = s.body[k]; for (const k in s.wheel) flat['w_' + k] = s.wheel[k]; if (s.caliper) flat.caliper = s.caliper; Object.defineProperty(flat, '_s', { value: s, enumerable: false }); cache[style] = flat; }
    return cache[style]._s;
  }

  // ---------- assemble ----------
  AH.buildCar = (style, color, opt = {}) => {
    if (!DEF[style]) style = 'coupe';
    const d = DEF[style], s = getStyle(style);
    const g = new THREE.Group();
    const finish = opt.finish || d.finish;
    const bodyMat = AH.paintMat(color, finish);
    const matFor = (k) => k === 'paint' ? bodyMat : M[k];
    for (const k in s.body) {
      const m = new THREE.Mesh(s.body[k], matFor(k));
      m.castShadow = !['head', 'tail', 'glass'].includes(k); m.receiveShadow = k === 'paint' || k === 'carbon';
      g.add(m);
    }
    // wheels
    const wheels = [];
    const rim = rimMat(AH.RIM_COLORS[opt.rim || d.rimColor] || AH.RIM_COLORS.silver);
    const calC = opt.caliper !== undefined ? opt.caliper : d.caliper;
    for (const [wz, sz] of [[d.wf, 1], [d.wr, -1]]) for (const sx of [1, -1]) {
      const b = bodyAt(d, wz), x = b.hw + d.flare * 0.85 - d.tw / 2 - 0.035;
      const w = new THREE.Group();
      for (const k in s.wheel) { const m = new THREE.Mesh(s.wheel[k], k === 'rim' ? rim : M[k]); m.castShadow = k === 'tire'; w.add(m); }
      w.position.set(sx * x, d.r, wz);
      if (sx < 0) w.rotation.y = Math.PI;
      g.add(w); wheels.push(w);
      if (s.caliper) { const c = new THREE.Mesh(s.caliper, calMat(calC || 0x202020)); c.position.set(sx * (x + 0.02), d.r + d.r * 0.3, wz - sz * d.r * 0.26); c.rotation.x = sz * 0.6; g.add(c); }
    }
    // contact shadow
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(s.W + 0.7, s.L + 0.9), M.blob);
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.renderOrder = -1; g.add(blob);
    // nitro flames at the real exhaust tips
    const flames = [];
    if (!opt.noFlames) for (const [x, y, z] of s.exhPos.slice(0, 4)) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(d.exhR * 1.6, 1.2, 10, 1, true), M.flame);
      f.rotation.x = -Math.PI / 2; f.position.set(x, y, z - 0.6); f.visible = false; g.add(f); flames.push(f);
    }
    // underglow neon
    let glow = null;
    const neon = opt.neon !== undefined ? opt.neon : (d.neon ? color : null);
    if (neon || opt.glow) {
      glow = new THREE.Mesh(new THREE.PlaneGeometry(s.W + 1.4, s.L + 1.2), new THREE.MeshBasicMaterial({ color: neon || color, map: AH.tex.glow(), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);
    }
    if (opt.taxi) { const t = new THREE.Mesh(slab(0.62, 0.18, 0.24, 0.05), M.taxi); const c = cabinAt(d, -0.35); t.position.set(0, c.roof + 0.1, -0.35); g.add(t); }
    return { group: g, wheels, flames, bodyMat, P: { L: s.L, W: s.W, r: d.r }, glow };
  };
  // kept for compatibility with older code paths
  AH.PROFILES = new Proxy({}, { get: (_, k) => { const s = DEF[k] && getStyle(k); return s ? { L: s.L, W: s.W, r: DEF[k].r } : undefined; } });
})();
