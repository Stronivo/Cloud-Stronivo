'use strict';
// Asphalt Horizon — game data: cars, cities, upgrades, boosts, save/progression.
window.AH = window.AH || {};

// Every car is one of the delivered 3D models, ordered from weakest (cheapest) to strongest (most expensive).
AH.CARS = [
  { id: 'samand',  name: 'IKCO Samand X7',      cls: 'E', price: 0,     color: 0xffffff, top: 54, accel: 14.5, grip: 0.95, nitro: 0.95, style: 'samand',    desc: 'Rodzinny sedan z Iranu. Skromny start, ale każda kariera od czegoś się zaczyna.', model: true },
  { id: 'vento',   name: 'Mustang ’65 Cabrio',  cls: 'D', price: 1500,  color: 0x1b2a6b, top: 59, accel: 16,   grip: 1.00, nitro: 1.00, style: 'mustang',   desc: 'Klasyczny kabriolet z V8 i otwartym dachem.', model: true },
  { id: 'm4csl',   name: 'BMW M4 CSL',          cls: 'C', price: 5000,  color: 0x272727, top: 64, accel: 18.5, grip: 1.12, nitro: 1.08, style: 'm4csl',     desc: 'Lżejsze, mocniejsze M4 z pomarańczowymi akcentami. Pewne w zakrętach.', model: true },
  { id: 'mc720',   name: 'McLaren 720S Spider', cls: 'B', price: 10000, color: 0x303030, top: 69, accel: 21,   grip: 1.18, nitro: 1.14, style: 'mc720',     desc: 'Brytyjski supersamochód z centralnym V8 i składanym dachem.', model: true },
  { id: 'phantom', name: 'LaFerrari',           cls: 'A', price: 18000, color: 0xbd0000, top: 74, accel: 23,   grip: 1.25, nitro: 1.20, style: 'laferrari', desc: 'Hybrydowy hypercar V12.', model: true },
  { id: 'amgone',  name: 'Mercedes-AMG ONE',    cls: 'S', price: 30000, color: 0xffffff, top: 79, accel: 25,   grip: 1.32, nitro: 1.27, style: 'amgone',    desc: 'Silnik prosto z Formuły 1. Szczyt festiwalowej hierarchii.', model: true },
];

// Real 3D models (glTF). lod = lighter copy used only far from the camera; paint = material that takes the garage colour.
AH.MODELS = {
  samand:    { file: 'cars/samand.json', lod: 'cars/samand_lod.json', far: 'cars/samand_far.json', lodDistance: 22, paint: 'wire_006134113', fallback: 'sedan' },
  mustang:   { file: 'cars/mustang.json', fallback: 'muscle', atlasRef: [27, 42, 107] },
  m4csl:     { file: 'cars/m4csl.json', lod: 'cars/m4csl_lod.json', lodDistance: 25, paint: 'Car_Paint', fallback: 'coupe' },
  mc720:     { file: 'cars/mc720.json', lod: 'cars/mc720_lod.json', lodDistance: 25, paint: 'Car_Paint', fallback: 'wedge' },
  laferrari: { file: 'cars/laferrari.json', lod: 'cars/laferrari_lod.json', lodDistance: 25, fallback: 'proto' },
  amgone:    { file: 'cars/amgone.json', noPaint: true, fallback: 'hyper' },
};
AH.TRAFFIC_STYLE = 'samand';

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
    id: 'sf', name: 'San Francisco', country: 'USA', diff: 1, mult: 1.0, laps: 2, aiSpeed: 49, ai: { accel: 12.5, nitro: 0.02, catchUp: 1.05, skill: [0.92, 1.0] }, traffic: 8,
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
    id: 'ny', name: 'Nowy Jork', country: 'USA', diff: 2, mult: 1.25, laps: 2, aiSpeed: 55, ai: { accel: 15, nitro: 0.04, catchUp: 1.08, skill: [0.95, 1.02] }, traffic: 12,
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
    id: 'waw', name: 'Warszawa', country: 'Polska', diff: 3, mult: 1.5, laps: 2, aiSpeed: 62, ai: { accel: 18, nitro: 0.07, catchUp: 1.12, skill: [0.96, 1.04] }, traffic: 15,
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
    id: 'rome', name: 'Rzym', country: 'Włochy', diff: 4, mult: 1.8, laps: 2, aiSpeed: 69, ai: { accel: 21, nitro: 0.1, catchUp: 1.15, skill: [0.97, 1.05] }, traffic: 18,
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
    id: 'paris', name: 'Paryż', country: 'Francja', diff: 5, mult: 2.2, laps: 2, aiSpeed: 75, ai: { accel: 24, nitro: 0.13, catchUp: 1.18, skill: [0.98, 1.06] }, traffic: 22,
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

// ---- new festival cities (track shapes follow the real road layouts)
AH.CITIES.push(
  {
    id: 'rio', name: 'Rio de Janeiro', country: 'Brazylia',
    blurb: 'Avenida Atlântica wzdłuż Copacabany: falujący chodnik, Głowa Cukru w zatoce i Chrystus na Corcovado.',
    landmarksText: 'Copacabana · Głowa Cukru · Chrystus Odkupiciel · fawele',
    card: ['#1fd1f9', '#1a6b3a'],
    // crescent beach on the south side, back through Copacabana's inner streets
    points: [[0,0],[350,-35],[700,-55],[1000,-25],[1180,80],[1220,260],[1080,380],[800,385],[500,345],[220,365],[-60,330],[-240,220],[-230,70]],
    style: 'rio', beach: true,
    water: [{ cx: 500, cz: -420, len: 3200, wid: 560, ang: 0 }],
    sand: [{ cx: 500, cz: -108, len: 2600, wid: 64, ang: 0 }],
    landmarks: [
      { type: 'sugarloaf', pos: [1520, -430] },
      { type: 'christ', pos: [420, 1080] },
      { type: 'favela', pos: [-380, 720] },
    ],
    ramps: [1.5, 6.5, 10.4],
    env: { skyTop: '#1f7fe0', skyMid: '#7cc8f5', skyBot: '#e6f7ff', fog: '#cfe9f6', fogNear: 240, fogFar: 2200, sun: '#fff1d0', sunInt: 2.5, sunDir: [0.35, 0.72, -0.6], hemiSky: '#d4efff', hemiGround: '#6b8a4a', hemiInt: 0.9, night: 0, lamps: false, ground: '#7fa35a', traffic: [0xffd200, 0xffd200, 0xffffff, 0x1d6fd6, 0x2b2b2b, 0xc8c8c8] },
  },
  {
    id: 'bcn', name: 'Barcelona', country: 'Hiszpania',
    blurb: 'Kwartały Eixample ze ściętymi narożnikami, przejazd Avinguda Diagonal i Sagrada Família tuż obok.',
    landmarksText: 'Sagrada Família · Avinguda Diagonal · Torre Glòries · Hotel W',
    card: ['#ffb347', '#c0392b'],
    // Eixample block grid with 40 m chamfered corners; the Diagonal cuts one corner of the loop
    points: [[0,0],[620,0],[675,54],[675,405],[405,675],[54,675],[0,620],[0,54]],
    style: 'bcn',
    water: [{ cx: 600, cz: -560, len: 3000, wid: 700, ang: 0 }],
    sand: [{ cx: 600, cz: -190, len: 2400, wid: 50, ang: 0 }],
    landmarks: [
      { type: 'sagrada', pos: [340, 330] },
      { type: 'glories', pos: [900, 820] },
      { type: 'whotel', pos: [1150, -150] },
    ],
    ramps: [0.5, 3.5, 6.5],
    env: { skyTop: '#3a86d8', skyMid: '#9fd0f4', skyBot: '#ffe6c2', fog: '#f0dcc0', fogNear: 220, fogFar: 2000, sun: '#ffe0b0', sunInt: 2.35, sunDir: [-0.45, 0.45, -0.75], hemiSky: '#ffe8c8', hemiGround: '#7a6a4a', hemiInt: 0.85, night: 0.05, lamps: false, ground: '#b9a77c', traffic: [0xf2f2f2, 0x1c1c1c, 0xffd400, 0xb3202a, 0x2a5aa8, 0x8a8f99] },
  },
  {
    id: 'milan', name: 'Mediolan', country: 'Włochy',
    blurb: 'Obwodnica wokół Duomo: marmurowe iglice, Galeria Wiktora Emanuela, Castello i wieżowce Porta Nuova.',
    landmarksText: 'Duomo · Galeria · Castello Sforzesco · Porta Nuova',
    card: ['#f3d27a', '#5a4a8a'],
    // the inner ring road (Cerchia dei Navigli) around the cathedral square
    points: [[440,0],[410,240],[220,400],[0,450],[-230,410],[-420,230],[-450,0],[-400,-230],[-230,-430],[0,-470],[240,-400],[420,-230]],
    style: 'milan',
    water: [{ cx: -560, cz: 620, len: 900, wid: 34, ang: -0.6 }],
    landmarks: [
      { type: 'duomo', pos: [0, -40] },
      { type: 'galleria', pos: [0, 170] },
      { type: 'castello', pos: [-760, -520] },
      { type: 'unicredit', pos: [320, -820] },
      { type: 'bosco', pos: [-120, -860] },
    ],
    ramps: [1.6, 5.5, 9.5],
    env: { skyTop: '#5f8fd0', skyMid: '#c4d8ec', skyBot: '#f6e4c6', fog: '#e8dccb', fogNear: 220, fogFar: 1900, sun: '#ffe6c0', sunInt: 2.1, sunDir: [-0.5, 0.38, 0.75], hemiSky: '#e8e0d0', hemiGround: '#6a5a44', hemiInt: 0.85, night: 0.1, lamps: false, ground: '#8f9a6a', traffic: [0xf2f2f2, 0x1c1c1c, 0x9e1b1b, 0x2d4a7a, 0xc8c8c8, 0xe8c34a] },
  },
  {
    id: 'msk', name: 'Moskwa', country: 'Rosja',
    blurb: 'Zimowa pętla wokół Kremla: czerwone mury, cebulaste kopuły Soboru Wasyla Błogosławionego i Moskwa City.',
    landmarksText: 'Kreml · Sobór Wasyla Błogosławionego · Moskwa City · rzeka Moskwa',
    card: ['#e8f1fa', '#a3222a'],
    // around the Kremlin triangle, along the Moskva embankment and past Red Square
    points: [[0,0],[520,-60],[900,40],[1020,300],[820,560],[480,660],[140,560],[-80,360],[-120,140]],
    style: 'msk', winter: true,
    water: [{ cx: 450, cz: -300, len: 2600, wid: 170, ang: 0, ice: true }],
    landmarks: [
      { type: 'kremlin', pos: [470, 300] },
      { type: 'stbasil', pos: [880, 330] },
      { type: 'moscity', pos: [-760, 260] },
      { type: 'sister', pos: [1300, 980] },
    ],
    ramps: [1.4, 4.4, 7.6],
    env: { skyTop: '#5f88c4', skyMid: '#bcd2ea', skyBot: '#eef3fa', fog: '#e1e9f2', fogNear: 200, fogFar: 1800, sun: '#fff2e0', sunInt: 1.9, sunDir: [0.55, 0.28, -0.75], hemiSky: '#dfe9f6', hemiGround: '#cfd8e2', hemiInt: 1.0, night: 0.15, lamps: false, ground: '#eef2f6', traffic: [0x1c1c1c, 0xf2f2f2, 0x8a8f99, 0x2d4a7a, 0x5a1a1a, 0x3d5a3d] },
  },
  {
    id: 'cairo', name: 'Egipt', country: 'Kair i Giza',
    blurb: 'Bulwar nad Nilem z palmami, Wieża Kairu, meczet z minaretami i piramidy w Gizie nad pustynią.',
    landmarksText: 'Piramidy w Gizie · Sfinks · Nil · Wieża Kairu · Cytadela',
    card: ['#ffcf7a', '#b3541e'],
    // Nile corniche on the west, desert road towards the Giza plateau on the east
    points: [[0,0],[500,-40],[950,0],[1250,160],[1300,450],[1050,650],[650,700],[250,640],[-50,480],[-150,240]],
    style: 'cairo',
    water: [{ cx: -430, cz: 300, len: 1800, wid: 230, ang: 1.5708 }],
    landmarks: [
      { type: 'pyramids', pos: [1950, 760] },
      { type: 'sphinx', pos: [1560, 430] },
      { type: 'cairotower', pos: [-430, -330] },
      { type: 'mosque', pos: [620, 1060] },
    ],
    ramps: [1.5, 4.6, 8.2],
    env: { skyTop: '#3f7fd0', skyMid: '#f0c98a', skyBot: '#ffe2b0', fog: '#f2d6a6', fogNear: 260, fogFar: 2400, sun: '#ffd8a0', sunInt: 2.6, sunDir: [-0.6, 0.3, -0.72], hemiSky: '#ffe6c0', hemiGround: '#a98a5a', hemiInt: 0.85, night: 0.05, lamps: false, ground: '#d9b77a', traffic: [0xf2f2f2, 0x1c1c1c, 0xc8a050, 0x2d4a7a, 0x9e9e9e, 0x7a2a1a] },
  },
);
// progression order (easiest → hardest), AI pace, laps and traffic grow with every city
{
  const ORDER = ['sf', 'rio', 'bcn', 'ny', 'waw', 'milan', 'rome', 'msk', 'cairo', 'paris'];
  const AI = [49, 53, 57, 61, 64, 67, 70, 73, 76, 80], LAPS = [2, 2, 2, 3, 3, 3, 4, 4, 5, 5], TRAF = [8, 10, 12, 13, 14, 15, 16, 17, 18, 20];
  const MULT = [1.0, 1.15, 1.3, 1.5, 1.7, 1.9, 2.1, 2.4, 2.7, 3.0];
  AH.CITIES = ORDER.map((id, i) => {
    const c = AH.CITIES.find(x => x.id === id);
    const f = i / (ORDER.length - 1);
    return Object.assign(c, {
      diff: Math.ceil((i + 1) / 2), mult: MULT[i], laps: LAPS[i], aiSpeed: AI[i], traffic: TRAF[i],
      ai: { accel: 12.5 + f * 12, nitro: 0.02 + f * 0.11, catchUp: 1.05 + f * 0.13, skill: [0.92 + f * 0.06, 1.0 + f * 0.06] },
    });
  });
}

AH.NAMES = ['Vortex', 'Nocna Mara', 'Kobra', 'Blaze', 'Glacier', 'Rekin', 'Neon', 'Wiedźma', 'Tytan', 'Szerszeń'];

// ---- save / progression
AH.SAVE_KEY = 'asphaltHorizon.v1';
AH.defaultSave = () => ({ pts: 1000, xp: 0, cleared: {}, owned: { samand: true }, sel: 'samand', quest: null, ups: {}, boosts: { freeze: 2, fly: 2, nitro: 2 }, best: {}, races: 0, wins: 0, muted: false });
AH.saveKey = () => AH.SAVE_KEY + (AH.Net && AH.Net.user ? '.' + AH.Net.user.id : '');
AH.load = () => {
  try {
    const raw = localStorage.getItem(AH.saveKey());
    if (raw) return Object.assign(AH.defaultSave(), JSON.parse(raw));
  } catch (e) { /* storage blocked */ }
  return AH.defaultSave();
};
AH.migrate = (S) => {
  const removed = { raptor: 1500, nebula: 4000, falco: 8000, tempest: 15000 };
  for (const id in removed) if (S.owned && S.owned[id]) { S.pts += removed[id]; delete S.owned[id]; if (S.ups) delete S.ups[id]; }
  S.owned = Object.assign({ samand: true }, S.owned || {});
  if (!AH.CARS.some(c => c.id === S.sel)) S.sel = 'samand';
  return S;
};
AH.save = AH.migrate(AH.load());
AH.persist = () => { try { localStorage.setItem(AH.saveKey(), JSON.stringify(AH.save)); } catch (e) { /* ignore */ } };

// Progression by maps: city 1 is open, each next city unlocks after a podium (top 3) in the previous one.
AH.PODIUM = 3;
AH.cityUnlocked = (i) => i === 0 || ((AH.save.cleared || {})[AH.CITIES[i - 1].id] || 99) <= AH.PODIUM;
AH.unlockedCount = () => AH.CITIES.filter((c, i) => AH.cityUnlocked(i)).length;
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
AH.PAINTS = [0xe3203a, 0xff6a00, 0xffc400, 0x16c96a, 0x00b8c2, 0x1f6bff, 0x8a2bff, 0xff2fa0, 0xf2f2f2, 0x9aa3ae, 0x2b2d33, 0x0b0b0f];
AH.NEONS = [null, 0xff1f5a, 0x5fe1ff, 0x8a2bff, 0x3ee08a, 0xff7a1a];
AH.cosm = (id) => { const car = AH.carById(id), c = (AH.save.cosm || {})[id] || {}; return { color: c.color !== undefined ? c.color : car.color, finish: c.finish || null, rim: c.rim || null, neon: c.neon !== undefined ? c.neon : undefined }; };
AH.setCosm = (id, patch) => { AH.save.cosm = AH.save.cosm || {}; AH.save.cosm[id] = Object.assign({}, AH.save.cosm[id] || {}, patch); AH.persist(); };
AH.rating = (s) => Math.round(s.top * 3.6 * 3 + s.accel * 22 + s.grip * 260 + s.nitroPow * 220);
AH.fmtTime = (t) => { if (!isFinite(t)) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
AH.fmt = (n) => Math.round(n).toLocaleString('pl-PL');
