'use strict';
// Asphalt Horizon — procedural textures and car models.

AH.tex = (() => {
  const cache = {};
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toTex = (c, rep) => {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 8;
    return t;
  };
  const once = (k, f) => cache[k] || (cache[k] = f());
  const rnd = AH.rng ? AH.rng(7) : Math.random;

  return {
    windows: () => once('win', () => {
      // 8x8 window cells (one cell = 4 m x 3.5 m); wall is near-white so instance colour tints it
      const S = 256, C = 32, a = canvas(S, S), b = canvas(S, S);
      const g = a.getContext('2d'), e = b.getContext('2d');
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, S, S);
      e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
      let r = 12345;
      const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const x = i * C + 6, y = j * C + 7, w = C - 12, h = C - 13;
        const sh = 60 + Math.floor(R() * 40);
        g.fillStyle = `rgb(${sh - 20},${sh},${sh + 22})`; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 3);
        g.fillStyle = '#c9c9c9'; g.fillRect(x - 2, y + h, w + 4, 3);
        if (R() < 0.42) {
          const warm = R() < 0.8;
          e.fillStyle = warm ? `rgb(255,${190 + Math.floor(R() * 50)},${110 + Math.floor(R() * 60)})` : 'rgb(170,210,255)';
          e.fillRect(x, y, w, h);
        }
      }
      return { map: toTex(a, true), emi: toTex(b, true) };
    }),
    road: () => once('road', () => {
      const W = 256, H = 512, c = canvas(W, H), g = c.getContext('2d');
      g.fillStyle = '#34363c'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgba(${v},${v},${v + 4},.5)`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (const lx of [0.19, 0.44, 0.69]) g.fillRect(lx * W, 0, 18, H); // tyre wear
      g.fillStyle = '#f2f2f2';
      g.fillRect(0.035 * W, 0, 5, H); g.fillRect(0.965 * W - 5, 0, 5, H);
      for (const lx of [0.25, 0.5, 0.75]) g.fillRect(lx * W - 2.5, 0, 5, H * 0.45);
      return toTex(c, true);
    }),
    concrete: (stripe) => once('con' + stripe, () => {
      const c = canvas(64, 64), g = c.getContext('2d');
      g.fillStyle = '#b9bcc2'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
      g.fillStyle = stripe; g.fillRect(0, 6, 64, 9);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 62, 64, 2);
      return toTex(c, true);
    }),
    glowStrip: () => once('gstrip', () => { const c = canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(0, 6, 64, 9); return toTex(c, true); }),
    sidewalk: () => once('side', () => {
      const c = canvas(64, 64), g = c.getContext('2d');
      g.fillStyle = '#9a9aa0'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
      for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
      return toTex(c, true);
    }),
    checker: () => once('chk', () => {
      const c = canvas(128, 32), g = c.getContext('2d');
      for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; g.fillRect(i * 8, j * 8, 8, 8); }
      const t = toTex(c, false); t.magFilter = THREE.NearestFilter; return t;
    }),
    zebra: () => once('zeb', () => {
      const c = canvas(128, 32), g = c.getContext('2d');
      g.clearRect(0, 0, 128, 32);
      g.fillStyle = 'rgba(245,245,245,.9)';
      for (let i = 0; i < 128; i += 12) g.fillRect(i + 2, 2, 6, 28);
      return toTex(c, false);
    }),
    ramp: () => once('ramp', () => {
      const c = canvas(64, 64), g = c.getContext('2d');
      g.fillStyle = '#ffc21a'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#151515';
      for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 11, 64); g.lineTo(i + 43, 0); g.lineTo(i + 32, 0); g.fill(); }
      return toTex(c, true);
    }),
    lattice: () => once('lat', () => {
      const c = canvas(128, 128), g = c.getContext('2d');
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.strokeRect(4, 4, 120, 120);
      g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(128, 0); g.lineTo(0, 128); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
      return toTex(c, true);
    }),
    arches: () => once('arch', () => {
      // one bay of the Colosseum: three arcaded tiers + attic, arches cut out (alpha)
      const c = canvas(128, 256), g = c.getContext('2d');
      g.fillStyle = '#dcc79c'; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(80,60,30,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
      g.globalCompositeOperation = 'destination-out';
      for (let t = 0; t < 3; t++) {
        const y0 = 256 - t * 62 - 8, top = y0 - 44;
        g.beginPath(); g.moveTo(30, y0); g.lineTo(30, top + 17); g.arc(64, top + 17, 34, Math.PI, 0); g.lineTo(98, y0); g.closePath(); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(60,45,25,.35)';
      for (let t = 0; t < 4; t++) g.fillRect(0, 256 - t * 62 - 10, 128, 5);
      g.fillStyle = 'rgba(40,30,20,.6)'; g.fillRect(50, 26, 28, 18);
      return toTex(c, true);
    }),
    stripes: () => once('str', () => {
      const c = canvas(256, 64), g = c.getContext('2d');
      for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#d4202f'; g.fillRect(i * 8, 0, 8, 64); }
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(i * 16 + 8, 34, 5, 16, 0, 0, Math.PI * 2); g.fill(); }
      return toTex(c, true);
    }),
    billboard: (i) => once('bb' + i, () => {
      const ads = [['NITRO COLA', '#ff1f5a', '#1a0010'], ['HORIZON TV', '#5fe1ff', '#00141f'], ['SPEED 24/7', '#ffc21a', '#1a1000'], ['NEON BURGER', '#ff7a1a', '#1a0800'], ['VELOCITY', '#b48cff', '#0c0020'], ['TURBO BANK', '#3ee08a', '#001a0c']];
      const [txt, fg, bg] = ads[i % ads.length];
      const c = canvas(256, 128), g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116);
      g.fillStyle = fg; g.font = 'italic 700 40px Arial Narrow, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, 128, 66);
      return toTex(c, false);
    }),
    banner: () => once('ban', () => {
      const c = canvas(512, 64), g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#ff1f5a'); gr.addColorStop(0.55, '#ff7a1a'); gr.addColorStop(1, '#ffc21a');
      g.fillStyle = '#0b0b12'; g.fillRect(0, 0, 512, 64);
      g.fillStyle = gr; g.font = 'italic 700 44px Arial Narrow, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('ASPHALT HORIZON', 256, 34);
      return toTex(c, false);
    }),
    glow: () => once('glow', () => {
      const c = canvas(64, 64), g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return toTex(c, false);
    }),
    grid: () => once('grid', () => {
      const c = canvas(128, 128), g = c.getContext('2d');
      g.fillStyle = '#0d0e16'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,122,26,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
      return toTex(c, true);
    }),
  };
})();

AH.rng = (seed) => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

// ---------------- cars ----------------
// Side profiles: [u along length (front = +), v height]. Cabin is the glass greenhouse.
AH.PROFILES = {
  hatch:  { L: 4.1, W: 1.86, r: 0.36, body: [[-2.05,.3],[2.05,.3],[2.08,.62],[1.9,.84],[1.0,.95],[-1.9,1.0],[-2.05,.85]], cabin: [[-1.86,.98],[0.95,.93],[0.2,1.45],[-1.62,1.48]], cabW: 1.6, spoiler: 'lip' },
  muscle: { L: 4.7, W: 2.0, r: 0.38, body: [[-2.35,.3],[2.35,.3],[2.38,.76],[2.2,.88],[0.8,.96],[-2.3,.96],[-2.38,.8]], cabin: [[-1.4,.94],[0.7,.94],[0.0,1.36],[-1.1,1.37]], cabW: 1.66, spoiler: 'duck', scoop: true },
  coupe:  { L: 4.5, W: 1.95, r: 0.37, body: [[-2.25,.28],[2.25,.28],[2.3,.5],[2.1,.72],[0.9,.85],[-2.0,.88],[-2.25,.72]], cabin: [[-1.7,.86],[0.9,.83],[0.1,1.28],[-1.0,1.3]], cabW: 1.6, spoiler: 'lip' },
  wedge:  { L: 4.6, W: 2.05, r: 0.37, body: [[-2.3,.26],[2.3,.26],[2.36,.42],[0.6,.8],[-2.1,.9],[-2.3,.78]], cabin: [[-1.3,.86],[0.65,.78],[-0.1,1.18],[-0.9,1.2]], cabW: 1.5, spoiler: 'wing' },
  hyper:  { L: 4.8, W: 2.1, r: 0.38, body: [[-2.4,.25],[2.4,.25],[2.46,.4],[1.4,.62],[0.4,.78],[-1.6,.86],[-2.4,.8]], cabin: [[-1.2,.8],[0.5,.74],[-0.15,1.12],[-0.85,1.13]], cabW: 1.45, spoiler: 'bigwing' },
  proto:  { L: 4.9, W: 2.1, r: 0.38, body: [[-2.45,.22],[2.45,.22],[2.5,.35],[1.2,.55],[0.2,.72],[-2.2,.78],[-2.45,.7]], cabin: [[-1.0,.72],[0.6,.65],[-0.2,1.05],[-0.75,1.05]], cabW: 1.2, spoiler: 'fins', glow: true },
  sedan:  { L: 4.5, W: 1.85, r: 0.35, body: [[-2.25,.32],[2.25,.32],[2.27,.74],[1.3,.86],[-2.2,.9],[-2.27,.78]], cabin: [[-1.5,.88],[0.9,.85],[0.3,1.42],[-1.1,1.44]], cabW: 1.6 },
  van:    { L: 5.0, W: 2.0, r: 0.37, body: [[-2.5,.35],[2.5,.35],[2.52,1.0],[1.95,1.18],[-2.5,1.2]], cabin: [[-2.45,1.18],[1.9,1.18],[1.45,2.35],[-2.45,2.35]], cabW: 1.9, cabinPainted: true },
};

AH.geoCache = {};
AH.extrudeProfile = (pts, width, bevel) => {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  const depth = Math.max(0.1, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
};

AH.mats = {
  glass: new THREE.MeshStandardMaterial({ color: 0x0b1018, metalness: 0.9, roughness: 0.08 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 1, roughness: 0.25 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.4, roughness: 0.5 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d8, emissiveIntensity: 2 }),
  tail: new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1030, emissiveIntensity: 2 }),
  flame: new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
};

AH.buildCar = (style, color, opt = {}) => {
  const P = AH.PROFILES[style];
  const key = style;
  if (!AH.geoCache[key]) {
    AH.geoCache[key] = {
      body: AH.extrudeProfile(P.body, P.W, 0.07),
      cabin: AH.extrudeProfile(P.cabin, P.cabW, 0.05),
      tire: new THREE.CylinderGeometry(P.r, P.r, 0.3, 18).rotateZ(Math.PI / 2),
      rim: new THREE.CylinderGeometry(P.r * 0.62, P.r * 0.62, 0.32, 10).rotateZ(Math.PI / 2),
    };
  }
  const G = AH.geoCache[key];
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.27 });
  const body = new THREE.Mesh(G.body, bodyMat); body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(G.cabin, P.cabinPainted ? bodyMat : AH.mats.glass); cab.castShadow = true; g.add(cab);
  if (P.cabinPainted) { // van windscreen
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9), AH.mats.glass);
    ws.position.set(0, 1.7, 1.72); ws.rotation.x = -0.45; g.add(ws);
  }
  const wheels = [];
  const wx = P.W / 2 - 0.08, wz = P.L / 2 - 0.78;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(G.tire, AH.mats.tire); t.castShadow = true; w.add(t);
    const r = new THREE.Mesh(G.rim, AH.mats.rim); w.add(r);
    w.position.set(sx * wx, P.r, sz * wz);
    g.add(w); wheels.push(w);
  }
  // lights
  const front = P.body[2][1] + 0.0, frontZ = P.L / 2 + 0.06;
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), AH.mats.head);
    h.position.set(sx * (P.W / 2 - 0.35), front - 0.1, frontZ); g.add(h);
  }
  const rearY = P.body[P.body.length - 1][1] - 0.12;
  const tl = new THREE.Mesh(new THREE.BoxGeometry(P.W - 0.3, 0.09, 0.08), AH.mats.tail);
  tl.position.set(0, rearY, -P.L / 2 - 0.06); g.add(tl);
  // aero
  const deckY = P.body[P.body.length - 2][1];
  if (P.spoiler === 'wing' || P.spoiler === 'bigwing') {
    const big = P.spoiler === 'bigwing';
    const wing = new THREE.Mesh(new THREE.BoxGeometry(P.W * 0.96, 0.06, big ? 0.55 : 0.42), AH.mats.dark);
    wing.position.set(0, deckY + (big ? 0.42 : 0.32), -P.L / 2 + 0.32); wing.rotation.x = 0.1; wing.castShadow = true; g.add(wing);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, big ? 0.42 : 0.32, 0.2), AH.mats.dark); st.position.set(sx * 0.55, deckY + (big ? 0.21 : 0.16), -P.L / 2 + 0.35); g.add(st); }
  } else if (P.spoiler === 'duck' || P.spoiler === 'lip') {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(P.W * 0.9, 0.06, 0.3), P.spoiler === 'duck' ? AH.mats.dark : bodyMat);
    lip.position.set(0, (P.spoiler === 'lip' ? P.cabin[3][1] : deckY) + 0.03, P.spoiler === 'lip' ? P.cabin[3][0] - 0.1 : -P.L / 2 + 0.2); lip.rotation.x = 0.15; g.add(lip);
  } else if (P.spoiler === 'fins') {
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 1.2), bodyMat); f.position.set(sx * 0.7, deckY + 0.2, -P.L / 2 + 0.7); g.add(f); }
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.4), AH.mats.dark); w.position.set(0, deckY + 0.45, -P.L / 2 + 0.45); g.add(w);
  }
  if (P.scoop) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.9), AH.mats.dark); s.position.set(0, P.body[4][1] + 0.05, 1.3); g.add(s); }
  if (opt.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9a0, emissiveIntensity: 1 }));
    sign.position.set(0, P.cabin[2][1] + 0.12, (P.cabin[2][0] + P.cabin[3][0]) / 2); g.add(sign);
  }
  // nitro flames
  const flames = [];
  if (!opt.noFlames) {
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.3, 10, 1, true), AH.mats.flame);
      f.rotation.x = -Math.PI / 2; f.position.set(sx * 0.45, 0.42, -P.L / 2 - 0.75); f.visible = false; g.add(f); flames.push(f);
    }
  }
  let glow = null;
  if (P.glow || opt.glow) {
    glow = new THREE.Mesh(new THREE.PlaneGeometry(P.W + 1.2, P.L + 1.2), new THREE.MeshBasicMaterial({ color, map: AH.tex.glow(), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);
  }
  return { group: g, wheels, flames, bodyMat, P, glow };
};
