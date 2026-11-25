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

