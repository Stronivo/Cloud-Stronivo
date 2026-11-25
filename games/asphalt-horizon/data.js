'use strict';
// Asphalt Horizon — game data: cars, cities, upgrades, boosts, save/progression.
window.AH = window.AH || {};

AH.CARS = [
  { id: 'vento',   name: 'Vento GT',     cls: 'D', level: 1,  price: 0,     color: 0xe3203a, top: 58, accel: 15.5, grip: 1.00, nitro: 1.00, style: 'hatch',  desc: 'Zwinny hatchback na start kariery.' },
  { id: 'raptor',  name: 'Raptor S',     cls: 'C', level: 2,  price: 1500,  color: 0xffc400, top: 61, accel: 16.5, grip: 0.96, nitro: 1.05, style: 'muscle', desc: 'Ciężki muscle car z potężnym V8.' },
  { id: 'nebula',  name: 'Nebula R',     cls: 'C', level: 4,  price: 4000,  color: 0x1f6bff, top: 64, accel: 18,   grip: 1.10, nitro: 1.08, style: 'coupe',  desc: 'Coupé, które trzyma się zakrętów jak przyklejone.' },
  { id: 'falco',   name: 'Falco X',      cls: 'B', level: 6,  price: 8000,  color: 0x16c96a, top: 68, accel: 19.5, grip: 1.15, nitro: 1.12, style: 'wedge',  desc: 'Klinowy supersamochód z centralnym silnikiem.' },
  { id: 'tempest', name: 'Tempest V12',  cls: 'A', level: 9,  price: 15000, color: 0xff6a00, top: 72, accel: 21.5, grip: 1.20, nitro: 1.18, style: 'hyper',  desc: 'Hypercar V12 z aktywnym spojlerem.' },
  { id: 'phantom', name: 'Phantom Zero', cls: 'S', level: 12, price: 26000, color: 0x8a2bff, top: 77, accel: 24,   grip: 1.30, nitro: 1.25, style: 'proto',  desc: 'Prototyp z hybrydowym napędem i neonowym podświetleniem.' },
];

AH.UPGRADES = [
  { id: 'engine', name: 'Silnik',      desc: 'Prędkość maks. +3,5% i przyspieszenie +6% na poziom', base: 320 },
  { id: 'tires',  name: 'Opony',       desc: 'Lepsza przyczepność w zakrętach i szybszy skręt',      base: 260 },
  { id: 'nitro',  name: 'Nitro',       desc: 'Mocniejszy i dłuższy zastrzyk nitro',                   base: 290 },
  { id: 'boost',  name: 'Moc boostów', desc: 'Dłuższe zamrożenie i większy zasięg, więcej monet',     base: 240 },
];
AH.UP_MAX = 5;

AH.BOOSTS = [
  { id: 'freeze', name: 'Zamrożenie', price: 250, key: 'Q', color: '#5fe1ff', desc: 'Zamraża rywali przed tobą na kilka sekund. Prawie stają w miejscu.' },
  { id: 'fly',    name: 'Lot',        price: 300, key: 'E', color: '#b48cff', desc: 'Auto unosi się na 2 sekundy: przelatujesz nad ruchem ulicznym i rywalami.' },
  { id: 'nitro',  name: 'Nitro Max',  price: 200, key: 'R', color: '#ff7a1a', desc: 'Natychmiast pełny pasek nitro i 2 s super‑doładowania.' },
];

AH.ICONS = {
  freeze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4 10.5l3.4-.4L6 7M20 13.5l-3.4.4L18 17M4 13.5l3.4.4L6 17M20 10.5l-3.4-.4L18 7"/></svg>',
  fly: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 13c-2-4-6-6-11-6 1 3 3 5 6 5.6C5 13 3.5 14 3 16c3 .3 6-.6 9-3zm0 0c2-4 6-6 11-6-1 3-3 5-6 5.6 2 .4 3.5 1.4 4 3.4-3 .3-6-.6-9-3z"/></svg>',
  nitro: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4 14h6.5L9 22l11-13h-7z"/></svg>',
  pts: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 5.5 13.9 10l4.6.3-3.6 3 1.2 4.6L12 15.4 7.9 17.9l1.2-4.6-3.6-3 4.6-.3z"/></svg>',
};

// ---- Cities. Track points are [x, z, y]; `seg` values are positions along the control-point loop.
AH.CITIES = [
  {
    id: 'sf', name: 'San Francisco', country: 'USA', diff: 1, mult: 1.0, laps: 2, aiSpeed: 54,
    blurb: 'Przejazd przez Golden Gate, wzgórza, Transamerica Pyramid i Alcatraz w zatoce.',
    landmarksText: 'Golden Gate · Transamerica · Alcatraz · Coit Tower',
    card: ['#ff8a4c', '#5a3a8c'],
    points: [[0,0,2],[250,0,2],[420,-60,6],[600,-40,12],[760,60,14],[800,240,8],[700,380,6],[520,420,12],[160,420,12],[-20,380,6],[-120,240,3],[-100,100,2]],
    bridgeSeg: 7,
    style: 'sf', victorian: [[9.2, 11.8]],
    landmarks: [
      { type: 'transamerica', seg: 2.5, side: 'out', dist: 70 },
      { type: 'coit', seg: 4.6, side: 'out', dist: 90 },
      { type: 'alcatraz', pos: [340, 640] },
    ],
    ramps: [1.4, 5.3, 10.4],
    env: { skyTop: '#2c3a7a', skyMid: '#f2875a', skyBot: '#ffd2a0', fog: '#eaa47e', fogNear: 160, fogFar: 1500, sun: '#ffb071', sunInt: 2.1, sunDir: [-0.55, 0.22, 0.8], hemiSky: '#ffd0a8', hemiGround: '#4d3d55', hemiInt: 0.75, night: 0.25, lamps: false, ground: '#6f7b55', traffic: [0xd9d9d9, 0x2f4f7f, 0x9b1b1b, 0x222222, 0xe8e2d0, 0x4f6f4f] },
  },
  {
    id: 'ny', name: 'Nowy Jork', country: 'USA', diff: 2, mult: 1.25, laps: 2, aiSpeed: 57,
    blurb: 'Nocny Manhattan: neony, żółte taksówki, tunel i Statua Wolności nad rzeką.',
    landmarksText: 'Statua Wolności · Empire State · Chrysler · One WTC',
    card: ['#6a3cff', '#120a2a'],
    points: [[0,0],[400,0],[470,50],[470,300],[420,350],[220,350],[170,400],[170,620],[120,670],[-220,670],[-270,620],[-270,50],[-220,0]],
    tunnel: [2.15, 2.85],
    style: 'sky',
    water: [{ cx: -560, cz: 335, len: 1000, wid: 530, ang: Math.PI / 2 }],
    billboards: [[4.1, 5.9], [8.2, 9.8], [0.2, 0.9]],
    landmarks: [
      { type: 'liberty', pos: [-560, 330] },
      { type: 'empire', pos: [-20, 470] },
      { type: 'chrysler', pos: [320, 170] },
      { type: 'owtc', pos: [640, -170] },
    ],
    ramps: [0.5, 6.5, 11.5],
    env: { skyTop: '#04050d', skyMid: '#1a1540', skyBot: '#4b2a5c', fog: '#251a3d', fogNear: 120, fogFar: 1400, sun: '#8ea6ff', sunInt: 0.55, sunDir: [0.4, 0.6, -0.5], hemiSky: '#6a6aa0', hemiGround: '#20152a', hemiInt: 0.55, night: 1, lamps: true, stars: true, ground: '#24232b', traffic: [0xffc915, 0xffc915, 0xffc915, 0x1d1d22, 0xcfcfcf, 0x7a1220] },
  },
  {
    id: 'waw', name: 'Warszawa', country: 'Polska', diff: 3, mult: 1.5, laps: 2, aiSpeed: 60,
    blurb: 'Pałac Kultury w centrum, Stare Miasto z Kolumną Zygmunta i Stadion nad Wisłą.',
    landmarksText: 'Pałac Kultury · Zamek Królewski · Kolumna Zygmunta · Stadion Narodowy',
    card: ['#e8314a', '#1c2a52'],
    points: [[0,0],[350,-30],[520,80],[560,300],[480,480],[300,540],[120,470],[60,330],[-80,280],[-200,380],[-330,300],[-300,100],[-150,20]],
    style: 'waw', oldtown: [[8.4, 11.2]],
    water: [{ cx: 780, cz: 260, len: 1100, wid: 150, ang: Math.PI / 2 }],
    landmarks: [
      { type: 'pkin', pos: [330, 255] },
      { type: 'castle', pos: [-215, 485] },
      { type: 'stadium', pos: [990, 250] },
      { type: 'decobridge', pos: [780, 470] },
    ],
    ramps: [1.5, 4.5, 11.6],
    env: { skyTop: '#2a72d8', skyMid: '#86bdf2', skyBot: '#dbecfb', fog: '#c6dcf0', fogNear: 220, fogFar: 1800, sun: '#fff2dc', sunInt: 2.4, sunDir: [0.5, 0.75, 0.35], hemiSky: '#cfe6ff', hemiGround: '#5d6b48', hemiInt: 0.85, night: 0, lamps: false, ground: '#78935a', traffic: [0xffffff, 0x2a2a2a, 0x8a8f99, 0xc4161c, 0x1e3f8a, 0xe6c34a] },
  },
  {
    id: 'rome', name: 'Rzym', country: 'Włochy', diff: 4, mult: 1.8, laps: 2, aiSpeed: 63,
    blurb: 'Złota godzina: Koloseum tuż przy krawężniku i przejazd przez Łuk Konstantyna.',
    landmarksText: 'Koloseum · Łuk Konstantyna · Bazylika św. Piotra · Obelisk',
    card: ['#f5b04a', '#7a2f1c'],
    points: [[0,0],[300,60],[480,0],[620,120],[600,320],[440,420],[460,600],[260,660],[60,560],[-60,420],[-200,380],[-220,180],[-120,60]],
    style: 'rome',
    arches: [{ type: 'constantine', seg: 1.55 }],
    landmarks: [
      { type: 'colosseum', seg: 3.5, side: 'out', dist: 122 },
      { type: 'stpeter', pos: [230, 330] },
      { type: 'obelisk', seg: 7.5, side: 'in', dist: 45 },
    ],
    ramps: [5.5, 8.4, 11.3],
    env: { skyTop: '#4f7fc4', skyMid: '#f5bf78', skyBot: '#ffe2ae', fog: '#efcf9c', fogNear: 200, fogFar: 1700, sun: '#ffcf86', sunInt: 2.3, sunDir: [-0.7, 0.3, -0.45], hemiSky: '#ffe0b0', hemiGround: '#6a5034', hemiInt: 0.8, night: 0.1, lamps: false, ground: '#a99660', traffic: [0xf2f2f2, 0x9e1b1b, 0x2d2d2d, 0x3d6b3d, 0xc7a252, 0x6a90b8] },
  },
  {
    id: 'paris', name: 'Paryż', country: 'Francja', diff: 5, mult: 2.2, laps: 2, aiSpeed: 66,
    blurb: 'Zmierzch nad Sekwaną: świecąca Wieża Eiffla, Łuk Triumfalny i piramida Luwru.',
    landmarksText: 'Wieża Eiffla · Łuk Triumfalny · Luwr · Sacré‑Cœur',
    card: ['#ff9a7a', '#24205a'],
    points: [[0,0],[300,-40],[520,40],[600,220],[520,400],[560,560],[400,680],[200,600],[80,660],[-120,600],[-200,420],[-120,260],[-220,120],[-140,10]],
    style: 'paris',
    arches: [{ type: 'arc', seg: 1.5 }],
    landmarks: [
      { type: 'eiffel', seg: 4.5, side: 'out', dist: 95 },
      { type: 'louvre', pos: [210, 300] },
      { type: 'sacrecoeur', pos: [-470, 520] },
    ],
    ramps: [3.3, 7.5, 11.5],
    env: { skyTop: '#121842', skyMid: '#6b4a8e', skyBot: '#ff9c7c', fog: '#5c4a7a', fogNear: 160, fogFar: 1500, sun: '#ff9a68', sunInt: 1.0, sunDir: [-0.6, 0.12, 0.75], hemiSky: '#9a86d0', hemiGround: '#2a2238', hemiInt: 0.75, night: 0.75, lamps: true, stars: true, ground: '#3f4d3e', traffic: [0xe8e8e8, 0x1c1c1c, 0x2d4a7a, 0x8a1c2a, 0xb8b8b8, 0x2d6a5a] },
  },
];

AH.NAMES = ['Vortex', 'Nocna Mara', 'Kobra', 'Blaze', 'Glacier', 'Rekin', 'Neon', 'Wiedźma', 'Tytan', 'Szerszeń'];

// ---- save / progression
AH.SAVE_KEY = 'asphaltHorizon.v1';
AH.defaultSave = () => ({ pts: 1000, xp: 0, owned: { vento: true }, sel: 'vento', ups: {}, boosts: { freeze: 2, fly: 2, nitro: 2 }, best: {}, races: 0, wins: 0, muted: false });
AH.load = () => {
  try {
    const raw = localStorage.getItem(AH.SAVE_KEY);
    if (raw) return Object.assign(AH.defaultSave(), JSON.parse(raw));
  } catch (e) { /* storage blocked */ }
  return AH.defaultSave();
};
AH.save = AH.load();
AH.persist = () => { try { localStorage.setItem(AH.SAVE_KEY, JSON.stringify(AH.save)); } catch (e) { /* ignore */ } };

AH.xpFor = (L) => 75 * (L - 1) * L;   // cumulative XP needed to reach level L
AH.level = (xp = AH.save.xp) => { let L = 1; while (xp >= AH.xpFor(L + 1)) L++; return L; };
AH.carById = (id) => AH.CARS.find(c => c.id === id) || AH.CARS[0];
AH.ups = (id) => { const u = AH.save.ups[id] || {}; return { engine: u.engine || 0, tires: u.tires || 0, nitro: u.nitro || 0, boost: u.boost || 0 }; };
AH.upCost = (car, upId, lvl) => {
  const tier = 1 + AH.CARS.indexOf(car) * 0.45;
  const base = AH.UPGRADES.find(u => u.id === upId).base;
  return Math.round(base * (lvl + 1) * tier / 10) * 10;
};
AH.stats = (car, u = AH.ups(car.id)) => ({
  top: car.top * (1 + 0.035 * u.engine),
  accel: car.accel * (1 + 0.06 * u.engine),
  grip: car.grip * (1 + 0.07 * u.tires),
  nitroPow: 1.26 * car.nitro * (1 + 0.04 * u.nitro),
  nitroUse: 30 * (1 - 0.07 * u.nitro),
  freezeDur: 3 + 0.5 * u.boost,
  freezeRange: 220 + 40 * u.boost,
  coinMult: 1 + 0.1 * u.boost,
});
AH.rating = (s) => Math.round(s.top * 3.6 * 3 + s.accel * 22 + s.grip * 260 + s.nitroPow * 220);
AH.fmtTime = (t) => { if (!isFinite(t)) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
AH.fmt = (n) => Math.round(n).toLocaleString('pl-PL');
