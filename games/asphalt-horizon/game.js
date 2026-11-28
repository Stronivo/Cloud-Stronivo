'use strict';
// Asphalt Horizon — renderer, menus, garage, race simulation, HUD, audio.
(() => {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const wrap = (d, L) => { d = ((d % L) + L) % L; return d > L / 2 ? d - L : d; };
  const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('touch');

  if (!window.THREE) { $('loadtext').textContent = 'Nie udało się wczytać silnika 3D. Odśwież stronę.'; return; }

  // ---------------- renderer ----------------
  const canvas = $('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
  } catch (e) { $('loadtext').textContent = 'Twoja przeglądarka nie obsługuje WebGL.'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 7000);
  let viewOffset = [0, 0];
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (viewOffset[0] || viewOffset[1]) camera.setViewOffset(w, h, viewOffset[0] * w, viewOffset[1] * h, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function makeEnvMap(top, mid, bot, panels = []) {
    // Cube map painted on canvases: works on every GPU (no float render targets needed).
    const S = 128, css = (c) => '#' + new THREE.Color(c).getHexString();
    const T = css(top), M = css(mid), B = css(bot);
    const faces = [];
    for (let f = 0; f < 6; f++) {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      if (f === 2) { g.fillStyle = T; g.fillRect(0, 0, S, S); }
      else if (f === 3) { g.fillStyle = B; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, S, S); }
      else {
        const gr = g.createLinearGradient(0, 0, 0, S);
        gr.addColorStop(0, T); gr.addColorStop(0.38, M); gr.addColorStop(0.5, B); gr.addColorStop(0.52, '#000'); gr.addColorStop(1, '#000');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        g.fillStyle = B; g.globalAlpha = 0.35; g.fillRect(0, S * 0.52, S, S * 0.48); g.globalAlpha = 1;
      }
      faces.push({ c, g });
    }
    for (const p of panels) {
      const a = p.pos.map(Math.abs), ax = a.indexOf(Math.max(...a)), f = ax * 2 + (p.pos[ax] < 0 ? 1 : 0), d = a[ax] * 2;
      const g = faces[f].g, w = clamp(p.w / d, 0.05, 0.9) * S, h = clamp(p.h / d, 0.04, 0.9) * S;
      const cy = ax === 1 ? S / 2 : clamp(0.5 - p.pos[1] / d, 0.1, 0.9) * S;
      g.fillStyle = css(p.c); g.fillRect(S / 2 - w / 2, cy - h / 2, w, h);
    }
    const tex = new THREE.CubeTexture(faces.map(f => f.c));
    tex.encoding = THREE.sRGBEncoding; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
    return { texture: tex, dispose: () => tex.dispose() };
  }

  // ---------------- audio ----------------
  const Snd = {
    ctx: null, master: null, eng: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        const ctx = this.ctx = new C();
        this.master = ctx.createGain(); this.master.gain.value = AH.save.muted ? 0 : 0.55; this.master.connect(ctx.destination);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 4;
        const g = ctx.createGain(); g.gain.value = 0;
        const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; const o2 = ctx.createOscillator(); o2.type = 'square';
        const g2 = ctx.createGain(); g2.gain.value = 0.35;
        o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.master);
        o1.start(); o2.start();
        this.eng = { f, g, o1, o2 };
        const len = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
        // wind / nitro hiss loop
        const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
        const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1200; nf.Q.value = 0.7;
        const ng = ctx.createGain(); ng.gain.value = 0;
        ns.connect(nf); nf.connect(ng); ng.connect(this.master); ns.start();
        this.hiss = { nf, ng };
      } catch (e) { this.ctx = null; }
    },
    setMuted(m) { AH.save.muted = m; AH.persist(); if (this.master) this.master.gain.value = m ? 0 : 0.55; },
    engine(on, rpm, nitro, speed01) {
      if (!this.eng) return;
      const t = this.ctx.currentTime;
      const base = 55 + rpm * 120;
      this.eng.o1.frequency.setTargetAtTime(base, t, 0.05);
      this.eng.o2.frequency.setTargetAtTime(base * 0.5 + 3, t, 0.05);
      this.eng.f.frequency.setTargetAtTime(500 + rpm * 1600 + (nitro ? 900 : 0), t, 0.08);
      this.eng.g.gain.setTargetAtTime(on ? 0.16 + rpm * 0.1 : 0, t, 0.1);
      this.hiss.ng.gain.setTargetAtTime(on ? speed01 * 0.05 + (nitro ? 0.12 : 0) : 0, t, 0.15);
      this.hiss.nf.frequency.setTargetAtTime(nitro ? 2600 : 900 + speed01 * 900, t, 0.2);
    },
    tone(freq, dur, type = 'sine', vol = 0.3, slide = 0) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
    },
    burst(dur, freq, vol = 0.5, type = 'lowpass') {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noise; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    },
    sfx(k) {
      switch (k) {
        case 'beep': this.tone(660, 0.18, 'square', 0.18); break;
        case 'go': this.tone(1320, 0.45, 'square', 0.2); break;
        case 'coin': this.tone(1400, 0.08, 'square', 0.1); setTimeout(() => this.tone(2100, 0.12, 'square', 0.1), 60); break;
        case 'pickup': this.tone(700, 0.25, 'triangle', 0.25, 700); break;
        case 'crash': this.burst(0.5, 700, 0.9); this.tone(90, 0.4, 'sawtooth', 0.3, -50); break;
        case 'wall': this.burst(0.18, 2500, 0.25, 'highpass'); break;
        case 'nitro': this.burst(0.7, 3000, 0.35, 'highpass'); break;
        case 'freeze': this.tone(1800, 0.6, 'sine', 0.2, 1500); this.tone(2400, 0.7, 'triangle', 0.12, -800); break;
        case 'fly': this.tone(300, 0.9, 'sawtooth', 0.15, 900); this.burst(0.8, 1500, 0.2, 'bandpass'); break;
        case 'takedown': this.burst(0.6, 500, 1); this.tone(180, 0.5, 'square', 0.25, -120); break;
        case 'land': this.burst(0.2, 300, 0.5); break;
        case 'buy': this.tone(880, 0.1, 'square', 0.12); setTimeout(() => this.tone(1320, 0.18, 'square', 0.12), 90); break;
      }
    },
  };

  // ---------------- festival world (menus) ----------------
  const garage = { get scene() { return AH.Festival.scene; }, car: null, id: null };
  function setGarageCar(id, force) {
    if (!force && garage.id === id && garage.car) return;
    const c = AH.carById(id), cs = AH.cosm(id);
    garage.car = AH.buildCar(c.style, cs.color, { noFlames: true, finish: cs.finish, rim: cs.rim, neon: cs.neon });
    AH.Festival.setCar(garage.car);
    garage.id = id;
  }
  const SHOT = { menu: 'home', loading: 'home', garage: 'garage', map: 'map', cities: 'festival', shop: 'festival', party: 'festival', auth: 'festival', credits: 'festival' };

  // ---------------- UI ----------------
  const screens = ['auth', 'party', 'menu', 'cities', 'map', 'garage', 'shop', 'credits', 'hud', 'pause', 'results', 'loading'];
  let mode = 'loading';
  function show(name, keepHud) {
    for (const s of screens) { const el = $(s); if (el) el.hidden = !(s === name || (keepHud && s === 'hud')); }
    mode = name;
    if (SHOT[name]) {
      const narrow = window.innerWidth < 860;
      viewOffset = name === 'menu' ? (narrow ? [0, 0.16] : [-0.1, 0.04]) : name === 'garage' ? (narrow ? [0, 0.3] : [0, 0.02]) : [0, 0];
      resize();
      renderTopbars();
      if (name === 'menu') renderHome();
    }
  }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false; t.style.opacity = 1;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.opacity = 0; setTimeout(() => (t.hidden = true), 300); }, 2200);
  }
  const online = () => !!(AH.Net.enabled && AH.Net.user);
  async function act(remote, local) {
    if (online()) { try { await remote(); return true; } catch (e) { toast(e.message || 'Błąd serwera'); return false; } }
    local(); return true;
  }
  const nextEvent = () => {
    const cl = AH.save.cleared || {};
    for (let i = 0; i < AH.CITIES.length; i++) if (AH.cityUnlocked(i) && !((cl[AH.CITIES[i].id] || 99) <= AH.PODIUM)) return i;
    return AH.unlockedCount() - 1;
  };
  function renderTopbars() {
    const S = AH.save, U = AH.unlockedCount(), T = AH.CITIES.length;
    const name = online() ? (AH.Net.nickname || 'Kierowca') : 'Gość';
    const html = `<span class="pp" title="Postęp festiwalu"><span class="avatar">${name.slice(0, 1).toUpperCase()}</span><span class="who"><b>${name}</b><small>Poziom ${AH.Quests.state().level} · Wydarzenia ${U}/${T}</small></span></span>
      <span class="pp cr num" title="Punkty">${AH.ICONS.pts}${AH.fmt(S.pts)}</span>
      ${AH.BOOSTS.map(bb => `<span class="pp num" title="${bb.name}" style="color:${bb.color}">${AH.ICONS[bb.id]}<span style="color:#fff">${S.boosts[bb.id] || 0}</span></span>`).join('')}
      ${online() ? `<button class="iconbtn" data-logout aria-label="Wyloguj" title="Wyloguj"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg></button>` : `<button class="pp" data-login>Zaloguj</button>`}
      <button class="iconbtn" data-mute aria-label="Dźwięk">${S.muted ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2"/></svg>'}</button>`;
    document.querySelectorAll('[data-topbar]').forEach(el => { el.innerHTML = html; });
    document.querySelectorAll('[data-mute]').forEach(b => b.onclick = () => { Snd.init(); Snd.setMuted(!AH.save.muted); renderTopbars(); });
    document.querySelectorAll('[data-login]').forEach(b => b.onclick = () => showAuth('login'));
    document.querySelectorAll('[data-logout]').forEach(b => b.onclick = logout);
    const car = AH.carById(S.sel);
    $('menu-car').innerHTML = `<span class="cls">${car.cls}</span>${car.name}`;
  }
  const pips = (n) => `<span class="pips">${Array.from({ length: 5 }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const KIND = ['Sprint przez zatokę', 'Plażowy sprint', 'Pętla Eixample', 'Nocny wyścig uliczny', 'Rajd przez stolicę', 'Mediolański ring', 'Złota godzina', 'Zimowy klasyk', 'Pustynny maraton', 'Finał festiwalu'];

  function renderHome() {
    const i = nextEvent(), c = AH.CITIES[i];
    $('continue-sub').textContent = `Następny przystanek: ${c.name}`;
    $('featured').innerHTML = `<span class="tag">Wydarzenie ${i + 1} / ${AH.CITIES.length}</span><span class="art">${AH.Art.city(c.id)}</span>
      <span class="go">JEDŹ ›</span><span class="cap"><span>${KIND[i]}</span><h3>${c.name}</h3><span>${c.landmarksText}</span></span>`;
    $('featured').setAttribute('aria-label', `Jedź: ${c.name}`);
    const Q = AH.Quests, q = Q.state();
    $('hometasks').innerHTML = `<div class="hh">Zadania · poziom ${q.level}<span>${q.done}/${Q.PER_LEVEL} do poziomu ${q.level + 1} · +${AH.fmt(Q.levelReward(q.level + 1))} pkt</span></div>
      <div class="lvbar"><b style="width:${q.done / Q.PER_LEVEL * 100}%"></b></div>
      <ol>${q.active.map(a => `<li><span>${Q.text(a)}</span><em class="num">${Math.min(a.prog, a.goal) | 0}/${a.goal} · +${a.reward}</em></li>`).join('')}</ol>`;
  }
  $('featured').onclick = () => startRace(nextEvent());
  $('btn-continue').onclick = () => startRace(nextEvent());
  // keyboard navigation in the main menu
  window.addEventListener('keydown', (e) => {
    if (mode !== 'menu' || race) return;
    const items = [...document.querySelectorAll('#menu .mi')];
    const i = items.indexOf(document.activeElement);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });

  function renderCities() {
    $('citygrid').innerHTML = AH.CITIES.map((c, i) => {
      const best = AH.save.best[c.id], open = AH.cityUnlocked(i), place = (AH.save.cleared || {})[c.id];
      return `<button class="city ${open ? '' : 'locked'}" data-city="${i}" ${open ? '' : 'aria-disabled="true"'}>
        <span class="art">${AH.Art.city(c.id)}
          <span class="num-badge">${String(i + 1).padStart(2, '0')}</span>
          <span class="play">${open ? 'START' : 'ZABLOKOWANE'}</span>
          <span class="over"><span class="kicker">${KIND[i]}</span><h3>${c.name}</h3><p>${open ? c.blurb : `Zdobądź podium w mieście ${AH.CITIES[i - 1].name}, żeby tu wjechać.`}</p></span></span>
        <span class="meta"><span>Trudność${pips(c.diff)}</span><span>Nagroda<b class="pts num">${AH.fmt(1000 * c.mult)}</b></span><span>Rekord<b class="num">${best ? AH.fmtTime(best) : '—'}${place ? ' · ' + place + '.' : ''}</b></span></span></button>`;
    }).join('');
    $('citygrid').querySelectorAll('[data-city]').forEach(b => b.onclick = () => { const i = +b.dataset.city; if (AH.cityUnlocked(i)) startRace(i); else toast(`Zajmij miejsce 1–3 w mieście ${AH.CITIES[i - 1].name}, żeby odblokować ${AH.CITIES[i].name}.`); });
    const cur = $('citygrid').children[nextEvent()]; if (cur) setTimeout(() => cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 60);
  }

  let mapSel = null;
  function renderMap() {
    if (mapSel === null) mapSel = nextEvent();
    const P = AH.Art.PINS, cl = AH.save.cleared || {};
    $('mapbox').innerHTML = AH.Art.map() + AH.CITIES.map((c, i) => {
      const [x, y] = P[c.id], open = AH.cityUnlocked(i), done = (cl[c.id] || 99) <= AH.PODIUM;
      return `<button class="pin ${open ? '' : 'locked'} ${done ? 'done' : ''} ${i === mapSel ? 'on' : ''}" data-pin="${i}" style="left:${x / 10}%;top:${y / 10}%">${i === nextEvent() ? '<span class="pulse"></span>' : ''}<span class="dot"><span>${i + 1}</span></span><b>${c.name}</b></button>`;
    }).join('');
    const i = mapSel, c = AH.CITIES[i], open = AH.cityUnlocked(i), best = AH.save.best[c.id], place = cl[c.id];
    $('mapinfo').innerHTML = `<div class="art">${AH.Art.city(c.id)}</div><span class="kicker">Wydarzenie ${i + 1} · ${KIND[i]}</span><h3>${c.name}</h3><p>${c.blurb}</p>
      <div class="legend"><span>Trudność ${pips(c.diff)}</span><span>Nagroda <b class="pts num">${AH.fmt(1000 * c.mult)}</b></span><span>Rekord <b class="num">${best ? AH.fmtTime(best) : '—'}${place ? ' · ' + place + '. msc' : ''}</b></span></div>
      <div class="btns">${open ? `<button class="solid" id="map-go">Jedź na wydarzenie</button>` : `<button class="ghost" disabled>Podium w: ${AH.CITIES[i - 1].name}</button>`}</div>
      <div class="legend"><span><i style="background:linear-gradient(135deg,#ff2d87,#ff8a00)"></i>Otwarte</span><span><i style="background:linear-gradient(135deg,#ffd23f,#ff8a00)"></i>Podium zdobyte</span><span><i style="background:#7c8794"></i>Zablokowane</span></div>`;
    $('mapbox').querySelectorAll('[data-pin]').forEach(b => b.onclick = () => { mapSel = +b.dataset.pin; renderMap(); });
    if ($('map-go')) $('map-go').onclick = () => startRace(i);
  }

  let viewCar = AH.save.sel;
  function statRows(car) {
    const s = AH.stats(car), b = AH.stats(car, { engine: 0, tires: 0, nitro: 0, boost: 0 });
    const rows = [
      ['Prędkość', s.top * 3.6, b.top * 3.6, 190, 340, Math.round(s.top * 3.6) + ' km/h'],
      ['Przyspieszenie', s.accel, b.accel, 12, 34, (27.8 / (s.accel * 0.82)).toFixed(1) + ' s'],
      ['Prowadzenie', s.grip, b.grip, 0.85, 1.75, Math.round(s.grip * 100)],
      ['Nitro', s.nitroPow, b.nitroPow, 1.2, 1.9, '+' + Math.round((s.nitroPow - 1) * 100) + '%'],
    ];
    return rows.map(([n, v, bv, lo, hi, txt]) => `<div class="stat"><span>${n}</span><div class="bar"><u style="width:${clamp((v - lo) / (hi - lo), 0.03, 1) * 100}%"></u><i style="width:${clamp((bv - lo) / (hi - lo), 0.03, 1) * 100}%"></i></div><em class="num">${txt}</em></div>`).join('');
  }
  function renderGarage() {
    const car = AH.carById(viewCar), S = AH.save;
    const owned = !!S.owned[car.id];
    setGarageCar(car.id);
    let action;
    if (owned) action = S.sel === car.id ? `<button class="solid wide" disabled>Twoje auto</button>` : `<button class="solid wide" id="g-select">Wybierz to auto</button>`;
    else action = `<button class="solid wide" id="g-buy" ${S.pts < car.price ? 'disabled' : ''}>Kup za ${AH.fmt(car.price)} pkt</button>`;
    $('carpanel').innerHTML = `
      <span class="rank">KLASA ${car.cls} · RANGA ${AH.rating(AH.stats(car))}${car.model ? ' · MODEL 3D' : ''}</span>
      <h2><span class="cls">${car.cls}</span>${car.name}</h2>
      <p class="desc">${car.desc}</p>
      <div class="stats">${statRows(car)}</div>
      ${action}`;
    $('carlist').innerHTML = AH.CARS.map(c => `<button class="carchip ${c.id === viewCar ? 'sel' : ''} ${!S.owned[c.id] && S.pts < c.price ? 'locked' : ''}" data-car="${c.id}"><b>${c.name}</b><span>${S.owned[c.id] ? (S.sel === c.id ? 'W użyciu' : 'W garażu') : AH.fmt(c.price) + ' pkt'}</span></button>`).join('')
      + `<span class="drag-hint" style="align-self:center;padding:0 14px">Przeciągnij, by obrócić auto</span>`;
    const u = AH.ups(car.id);
    $('uppanel').innerHTML = `<span class="kicker">${owned ? 'Tuning' : 'Kup auto, by je ulepszać'}</span><div class="ups">${AH.UPGRADES.map(up => {
      const lv = u[up.id], max = lv >= AH.UP_MAX, cost = AH.upCost(car, up.id, lv);
      return `<div class="up"><div><b>${up.name}</b><p>${up.desc}</p><div class="ticks">${Array.from({ length: AH.UP_MAX }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div></div>
        <button class="buy" data-up="${up.id}" ${!owned || max || S.pts < cost ? 'disabled' : ''}>${max ? 'MAX' : AH.fmt(cost) + ' pkt'}</button></div>`;
    }).join('')}</div>`;
    if (owned) {
      const cs = AH.cosm(car.id), def = AH.CAR_DEF[car.style] || { finish: 'metallic', rimColor: 'silver' };
      const tpl = (AH.modelTemplates || {})[car.style];
      const canFinish = !tpl, canRim = !tpl;
      const curFinish = cs.finish || def.finish, curRim = cs.rim || def.rimColor, curNeon = cs.neon !== undefined ? cs.neon : (def.neon ? cs.color : null);
      const hex = (c) => '#' + new THREE.Color(c).getHexString();
      const paints = car.model && !AH.PAINTS.includes(car.color) ? [car.color, ...AH.PAINTS] : AH.PAINTS;
      $('uppanel').insertAdjacentHTML('beforeend', `<div class="cosm"><span class="kicker">Lakier i wygląd</span>
        ${tpl && !tpl.paint && !tpl.atlas ? '<p class="xptext">Oryginalne malowanie autora modelu: lakieru nie można zmienić.</p>' : `<div class="swatches">${paints.map(c => `<button class="sw ${c === cs.color ? 'on' : ''}" data-paint="${c}" style="background:${hex(c)}" aria-label="Kolor ${hex(c)}"></button>`).join('')}</div>`}
        ${canFinish ? `<div class="chips">${Object.entries(AH.FINISHES).map(([k, n]) => `<button class="cchip ${k === curFinish ? 'on' : ''}" data-finish="${k}">${n}</button>`).join('')}</div>` : ''}
        ${canRim ? `<div class="chips"><span class="clabel">Felgi</span>${Object.entries({ silver: 'Srebrne', gunmetal: 'Grafit', black: 'Czarne', bronze: 'Brąz', gold: 'Złote' }).map(([k, n]) => `<button class="cchip ${k === curRim ? 'on' : ''}" data-rim="${k}"><i style="background:${hex(AH.RIM_COLORS[k])}"></i>${n}</button>`).join('')}</div>` : ''}
        <div class="chips"><span class="clabel">Neon</span>${AH.NEONS.map(c => `<button class="cchip ${c === curNeon || (c === null && !curNeon) ? 'on' : ''}" data-neon="${c === null ? 'off' : c}">${c === null ? 'Wył.' : `<i style="background:${hex(c)};box-shadow:0 0 8px ${hex(c)}"></i>`}</button>`).join('')}</div></div>`);
      const apply = (patch) => {
        AH.setCosm(car.id, patch); setGarageCar(car.id, true); renderGarage(); AH.Net.retrack();
        if (online()) AH.Net.setCosmetics(car.id, AH.save.cosm[car.id]).catch(e => toast(e.message));
      };
      $('uppanel').querySelectorAll('[data-paint]').forEach(b => b.onclick = () => apply({ color: +b.dataset.paint }));
      $('uppanel').querySelectorAll('[data-finish]').forEach(b => b.onclick = () => apply({ finish: b.dataset.finish }));
      $('uppanel').querySelectorAll('[data-rim]').forEach(b => b.onclick = () => apply({ rim: b.dataset.rim }));
      $('uppanel').querySelectorAll('[data-neon]').forEach(b => b.onclick = () => apply({ neon: b.dataset.neon === 'off' ? null : +b.dataset.neon }));
    }
    $('carlist').querySelectorAll('[data-car]').forEach(b => b.onclick = () => { viewCar = b.dataset.car; renderGarage(); });
    const sel = $('g-select'); if (sel) sel.onclick = async () => { if (await act(() => AH.Net.selectCar(car.id), () => { S.sel = car.id; AH.persist(); })) { Snd.sfx('buy'); AH.Net.retrack(); renderGarage(); renderTopbars(); } };
    const buy = $('g-buy'); if (buy) buy.onclick = async () => {
      if (S.pts < car.price) return;
      if (!(await act(() => AH.Net.purchase('car', car.id), () => { S.pts -= car.price; S.owned[car.id] = true; S.sel = car.id; AH.persist(); }))) return;
      Snd.sfx('buy'); toast(car.name + ' jest twój!'); AH.Net.retrack(); renderGarage(); renderTopbars();
    };
    $('uppanel').querySelectorAll('[data-up]').forEach(b => b.onclick = async () => {
      const id = b.dataset.up, lv = AH.ups(car.id)[id], cost = AH.upCost(car, id, lv);
      if (S.pts < cost || lv >= AH.UP_MAX) return;
      if (!(await act(() => AH.Net.purchase('upgrade', car.id, id), () => { S.pts -= cost; S.ups[car.id] = Object.assign(AH.ups(car.id), { [id]: lv + 1 }); AH.persist(); }))) return;
      Snd.sfx('buy');
      toast(AH.UPGRADES.find(x => x.id === id).name + ' → poziom ' + (lv + 1)); renderGarage(); renderTopbars();
    });
  }
  // drag to orbit the car in the garage
  {
    let px = null;
    canvas.addEventListener('pointerdown', (e) => { if (mode === 'garage') { px = e.clientX; AH.Festival.dragging = true; } });
    window.addEventListener('pointermove', (e) => { if (px !== null) { AH.Festival.orbit -= (e.clientX - px) * 0.008; px = e.clientX; } });
    window.addEventListener('pointerup', () => { px = null; AH.Festival.dragging = false; });
  }
  function renderShop() {
    const S = AH.save;
    $('shopgrid').innerHTML = AH.BOOSTS.map(b => `<div class="boostcard">
      <div class="row"><div class="ico" style="background:${b.color}">${AH.ICONS[b.id]}</div><span class="have num">MASZ: ${S.boosts[b.id] || 0}</span></div>
      <h3>${b.name}</h3><p>${b.desc}</p><p>Klawisz w wyścigu: <kbd>${b.key}</kbd></p>
      <div class="row"><button class="buy" data-buy="${b.id}" data-n="1" ${S.pts < b.price ? 'disabled' : ''}>+1 · ${AH.fmt(b.price)} pkt</button><button class="buy" data-buy="${b.id}" data-n="5" ${S.pts < b.price * 4 ? 'disabled' : ''}>+5 · ${AH.fmt(b.price * 4)} pkt</button></div></div>`).join('');
    $('shopgrid').querySelectorAll('[data-buy]').forEach(btn => btn.onclick = async () => {
      const b = AH.BOOSTS.find(x => x.id === btn.dataset.buy), n = +btn.dataset.n, cost = n === 5 ? b.price * 4 : b.price;
      if (S.pts < cost) return;
      if (!(await act(() => AH.Net.purchase('boost', b.id, null, n), () => { S.pts -= cost; S.boosts[b.id] = (S.boosts[b.id] || 0) + n; AH.persist(); }))) return;
      Snd.sfx('buy'); toast(`${b.name}: +${n}`); renderShop(); renderTopbars();
    });
  }

  $('btn-race').onclick = () => { Snd.init(); renderCities(); show('cities'); };
  $('credits-btn').onclick = () => show('credits');
  $('credits-close').onclick = () => show('menu');
  $('btn-map').onclick = () => { Snd.init(); mapSel = null; renderMap(); show('map'); };
  $('btn-garage').onclick = () => { Snd.init(); viewCar = AH.save.sel; renderGarage(); show('garage'); };
  $('btn-shop').onclick = () => { Snd.init(); renderShop(); show('shop'); };
  $('btn-party').onclick = () => { Snd.init(); renderParty(); show('party'); };
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { setGarageCar(AH.save.sel); show('menu'); });

  // ---------------- input ----------------
  const keys = {}, touch = { l: false, r: false, drift: false, nitro: false };
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) && race) e.preventDefault();
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (!race) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'hud') pause(); else if (mode === 'pause') resume(); }
    if (mode !== 'hud') return;
    if (e.code === 'KeyQ' || e.code === 'Digit1') race.useBoost('freeze');
    if (e.code === 'KeyE' || e.code === 'Digit2') race.useBoost('fly');
    if (e.code === 'KeyR' || e.code === 'Digit3') race.useBoost('nitro');
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (race && mode === 'hud') pause(); });
  const bindTouch = (id, k) => {
    const el = $(id);
    const on = (e) => { e.preventDefault(); touch[k] = true; el.classList.add('down'); Snd.init(); };
    const off = () => { touch[k] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  bindTouch('tl', 'l'); bindTouch('tr', 'r'); bindTouch('tdrift', 'drift'); bindTouch('tnitro', 'nitro');
  const input = () => ({
    steer: clamp(((keys.ArrowRight || keys.KeyD || touch.r) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA || touch.l) ? 1 : 0), -1, 1),
    brake: !!(keys.ArrowDown || keys.KeyS || touch.drift),
    nitro: !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || touch.nitro),
    gas: isTouch || AH.save.autoGas !== false || !!(keys.KeyW || keys.ArrowUp),
  });

  // ---------------- particles ----------------
  class Particles {
    constructor(scene, n, size, additive) {
      this.n = n; this.i = 0;
      this.pos = new Float32Array(n * 3).fill(-9999); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
      this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
      this.geo = new THREE.BufferGeometry();
      this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
      this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ size, map: AH.tex.glow(), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: additive ? 1 : 0.5 }));
      this.pts.frustumCulled = false; scene.add(this.pts);
    }
    spawn(x, y, z, vx, vy, vz, life, r, g, b) {
      const i = this.i = (this.i + 1) % this.n, k = i * 3;
      this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
      this.base[k] = r; this.base[k + 1] = g; this.base[k + 2] = b; this.life[i] = this.max[i] = life;
    }
    update(dt, grav) {
      for (let i = 0; i < this.n; i++) {
        if (this.life[i] <= 0) continue;
        const k = i * 3; this.life[i] -= dt;
        if (this.life[i] <= 0) { this.pos[k + 1] = -9999; continue; }
        this.vel[k + 1] -= grav * dt;
        this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
        const f = this.life[i] / this.max[i];
        this.col[k] = this.base[k] * f; this.col[k + 1] = this.base[k + 1] * f; this.col[k + 2] = this.base[k + 2] * f;
      }
      this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    }
  }

  // ---------------- race ----------------
  const W = AH.ROAD_HALF;
  let race = null;
  const tmpA = {}, tmpB = {};
  const AI_COLORS = [0xffffff, 0x15161a, 0xe3203a, 0x1f6bff, 0xffc400, 0x16c96a, 0xff6a00, 0x8a2bff, 0x9aa3ae, 0x00c2c7];

  class Race {
    constructor(cityIdx, net = null) {
      this.cityIdx = cityIdx;
      this.online = net; this.remotes = []; this.netT = 0;
      this.boostLog = { used: { freeze: 0, fly: 0, nitro: 0 }, picked: { freeze: 0, fly: 0, nitro: 0 } };
      const city = this.city = AH.CITIES[cityIdx];
      const env = city.env;
      const scene = this.scene = new THREE.Scene();
      scene.fog = new THREE.Fog(new THREE.Color(env.fog).convertSRGBToLinear(), env.fogNear, env.fogFar);
      const dim = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
      this.envRT = makeEnvMap(dim(env.skyTop, 0.8), dim(env.skyMid, 0.55), dim(env.skyBot, 0.45), env.night > 0.5 ? [{ w: 30, h: 10, c: 0xff3a8a, pos: [-60, 10, 40] }, { w: 30, h: 10, c: 0x3ac8ff, pos: [60, 12, -30] }, { w: 40, h: 6, c: 0xffd9a0, pos: [0, 50, 0] }] : [{ w: 20, h: 20, c: new THREE.Color(env.sun).multiplyScalar(3), pos: env.sunDir.map(v => v * 90) }]);
      renderer.toneMappingExposure = env.night > 0.5 ? 1.15 : 1.0;
      scene.add(new THREE.HemisphereLight(env.hemiSky, env.hemiGround, env.hemiInt));
      const sun = this.sun = new THREE.DirectionalLight(env.sun, env.sunInt);
      sun.castShadow = true;
      const sm = isTouch ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
      const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 600;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
      scene.add(sun, sun.target);
      this.sunDir = new THREE.Vector3(...env.sunDir).normalize();
      if (env.night > 0.5) scene.add(new THREE.AmbientLight(0x404060, 0.4));

      this.world = AH.buildCity(city, scene);
      const tr = this.tr = this.world.track;
      this.L = tr.L; this.laps = city.laps;
      this.rnd = AH.rng(Date.now() & 0xffff);

      // player
      const carCfg = AH.carById(AH.save.sel);
      const st = AH.stats(carCfg);
      const cs = AH.cosm(carCfg.id);
      this.player = this.makeRacer(carCfg, cs.color, 'Ty', true, -18, 0, { finish: cs.finish, rim: cs.rim, neon: cs.neon });
      this.player.st = st;
      this.player.nitro = 35;
      if (env.night > 0.4) {
        const hl = new THREE.SpotLight(0xfff2d0, 2.2, 90, 0.55, 0.5, 1.2);
        hl.position.set(0, 1, 2); hl.target.position.set(0, 0, 25);
        this.player.model.group.add(hl, hl.target);
      }
      this.addIce(this.player);
      const GRID6 = [[-8, -8], [0, -8], [8, -8], [-8, -18], [0, -18], [8, -18]];
      if (net) {
        // online party: real players only, grid slot = order of joining
        net.roster.forEach((m, k) => {
          const [gx, gd] = GRID6[k % 6];
          if (m.id === net.selfId) { this.player.x = gx; this.player.dist = gd; return; }
          const r = this.makeRacer(AH.carById(m.car), m.color, m.name, false, gd, gx, { finish: m.finish, rim: m.rim, neon: m.neon });
          r.isRemote = true; r.id = m.id; r.snaps = [{ t: performance.now(), d: gd, x: gx, a: 0, v: 0, n: 0, f: 0, fr: 0 }];
          this.addIce(r); this.remotes.push(r);
        });
      }
      // AI
      this.ai = [];
      const D = city.ai;
      const tier = Math.min(AH.CARS.length - 1, Math.round(cityIdx * (AH.CARS.length - 1) / Math.max(1, AH.CITIES.length - 1)));
      const pool = AH.CARS.slice(Math.max(0, tier - 2), tier + 1);
      const names = AH.NAMES.slice().sort(() => this.rnd() - 0.5);
      const grid = [[-8, -8], [0, -8], [8, -8], [-8, -18], [8, -18]];
      if (!net) grid.forEach(([x, d], k) => {
        const c = pool[Math.floor(this.rnd() * pool.length)];
        // real models drive in their original paint; procedural cars get random colours
        const col = c.model ? c.color : AI_COLORS[Math.floor(this.rnd() * AI_COLORS.length)];
        const a = this.makeRacer(c, col, names[k], false, d, x, c.model ? {} : { finish: ['metallic', 'gloss', 'pearl', 'matte'][Math.floor(this.rnd() * 4)] });
        a.skill = D.skill[0] + this.rnd() * (D.skill[1] - D.skill[0]) - (k >= 3 ? 0.02 : 0);
        a.accel = D.accel;
        a.grip = 1 + cityIdx * 0.08;
        a.targetX = x; a.pref = x; a.laneT = this.rnd();
        this.addIce(a);
        this.ai.push(a);
      });
      this.racers = [this.player, ...this.ai, ...this.remotes];

      // traffic
      this.traffic = [];
      const tcols = env.traffic, nT = city.traffic;
      for (let k = 0; k < nT; k++) {
        const col = tcols[Math.floor(this.rnd() * tcols.length)];
        const m = AH.buildCar(AH.TRAFFIC_STYLE || 'sedan', col, { noFlames: true, traffic: true });
        scene.add(m.group);
        const t = { model: m, dist: 220 + (k / nT) * (this.L - 300), x: AH.LANES[Math.floor(this.rnd() * 4)], v: 20 + this.rnd() * 9, wreck: 0, nm: -10, alt: 0, latV: 0 };
        this.traffic.push(t);
      }

      // pickups
      this.buildPickups();

      // reflections only on shiny things (cars, glass, metal, water) so roads stay matte
      scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && (o.material.metalness >= 0.5 || o.material.userData.reflect)) { o.material.envMap = this.envRT.texture; o.material.needsUpdate = true; } });
      // fx
      this.sparks = new Particles(scene, 260, 0.45, true);
      this.smoke = new Particles(scene, 200, 2.6, true);
      this.rings = [];

      // camera state
      this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.fov = 62; this.shake = 0;
      this.t = 0; this.state = 'count'; this.count = 4.2; this.lastCount = 5;
      this.stats = { coins: 0, takedowns: 0, near: 0, crashes: 0, driftT: 0, longDrift: 0, curDrift: 0, nitroT: 0, nitroMax: 0, gems: 0, jumps: 0, airT: 0, top: 0, fastT: 0, leadT: 0, overtakes: 0, frozen: 0, flyUsed: 0, picked: 0, perfect: 0, lastPos: 0, city: city.id };
      this.placeAll(0);
      const p = this.player.model.group.position;
      this.camPos.set(p.x, p.y + 5, p.z).addScaledVector(this.fwd(this.player), -12);
      this.buildMinimap();
      viewOffset = [0, 0]; resize();
    }
    addIce(e) {
      const ice = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 5.4), new THREE.MeshPhysicalMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.45, emissive: 0x2aa8c8, emissiveIntensity: 0.5, roughness: 0.05, clearcoat: 1 }));
      ice.position.y = 1; ice.visible = false; e.model.group.add(ice); e.ice = ice;
    }
    makeRacer(cfg, color, name, isPlayer, dist, x, look = {}) {
      const m = AH.buildCar(cfg.style, color, look);
      // position marker above the roof
      const lc = document.createElement('canvas'); lc.width = 256; lc.height = 128;
      const lt = new THREE.CanvasTexture(lc); lt.encoding = THREE.sRGBEncoding;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthTest: false, depthWrite: false, fog: false }));
      label.renderOrder = 10; label.scale.set(2.6, 1.3, 1); this.scene.add(label);
      m.label = { sprite: label, canvas: lc, tex: lt, last: '' };
      this.scene.add(m.group);
      return { cfg, model: m, name, isPlayer, dist, x, v: 0, vx: 0, latV: 0, alt: 0, vy: 0, air: false, flyT: 0, frozen: 0, wreck: 0, spin: 0, nitro: 0, nitroOn: false, nitroT: 0, superT: 0, startBoost: 0, drift: false, driftAng: 0, steerVis: 0, finished: false, finishTime: 0, lastWall: 0, wheelRot: 0 };
    }
    buildPickups() {
      const tr = this.tr, rnd = AH.rng(this.cityIdx * 977 + 13);
      this.pickups = [];
      this.pkGroup = new THREE.Group(); this.scene.add(this.pkGroup);
      const G = {
        coin: new THREE.CylinderGeometry(0.75, 0.75, 0.16, 18).rotateX(Math.PI / 2),
        nitro: new THREE.OctahedronGeometry(1.0).scale(0.8, 1.25, 0.8),
        freeze: new THREE.BoxGeometry(1.15, 1.15, 1.15),
        fly: new THREE.BoxGeometry(2.3, 0.14, 0.7),
      };
      const M = {
        coin: new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 1, roughness: 0.25, emissive: 0xaa6600, emissiveIntensity: 0.6 }),
        nitro: new THREE.MeshStandardMaterial({ color: 0xff9a2a, emissive: 0xff5a00, emissiveIntensity: 1.3, metalness: 0.3, roughness: 0.15, flatShading: true }),
        freeze: new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x2ad0ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }),
        fly: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb48cff, emissiveIntensity: 1.4 }),
      };
      const glowCol = { nitro: 0xff7a1a, freeze: 0x5fe1ff, fly: 0xb48cff };
      const rampS = this.world.ramps.map(r => r.s);
      const add = (type, s, x) => {
        const g = new THREE.Group();
        if (type === 'fly') { const a = new THREE.Mesh(G.fly, M.fly); a.position.x = -0.9; a.rotation.z = 0.35; const b = new THREE.Mesh(G.fly, M.fly); b.position.x = 0.9; b.rotation.z = -0.35; g.add(a, b); }
        else g.add(new THREE.Mesh(G[type], M[type]));
        if (glowCol[type]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: AH.tex.glow(), color: glowCol[type], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(4.5, 4.5, 1); g.add(sp); }
        const p = AH.sample(tr, s, tmpA);
        g.position.set(p.x + p.rx * x, p.y + 1.3, p.z + p.rz * x);
        this.pkGroup.add(g);
        this.pickups.push({ type, s, x, g, hidden: 0, baseY: p.y + 1.3 });
      };
      for (let s = 160; s < this.L - 60; s += 80 + rnd() * 60) {
        if (rampS.some(r => Math.abs(r - s) < 30)) continue;
        const lane = AH.LANES[Math.floor(rnd() * 4)], roll = rnd();
        if (roll < 0.5) for (let k = 0; k < 6; k++) add('coin', s + k * 5, lane);
        else if (roll < 0.72) add('nitro', s, lane);
        else if (roll < 0.86) add('freeze', s, lane);
        else add('fly', s, lane);
      }
    }
    buildMinimap() {
      const tr = this.tr, c = $('minimap'), S = c.width;
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (let i = 0; i < tr.N; i++) { const x = tr.P[i * 3], z = tr.P[i * 3 + 2]; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      const sc = (S * 0.66) / Math.max(maxX - minX, maxZ - minZ), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      this.mm = { sc, cx, cz, S };
      const off = document.createElement('canvas'); off.width = off.height = S;
      const g = off.getContext('2d');
      g.lineJoin = 'round'; g.lineCap = 'round';
      const path = () => { g.beginPath(); for (let i = 0; i <= tr.N; i += 4) { const k = (i % tr.N) * 3; const x = S / 2 + (tr.P[k] - cx) * sc, y = S / 2 + (tr.P[k + 2] - cz) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
      path(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 14; g.stroke();
      path(); g.strokeStyle = 'rgba(233,236,242,.85)'; g.lineWidth = 7; g.stroke();
      const k0 = 0; g.fillStyle = '#ffc21a'; g.fillRect(S / 2 + (tr.P[k0] - cx) * sc - 5, S / 2 + (tr.P[k0 + 2] - cz) * sc - 5, 10, 10);
      this.mmBg = off;
    }
    fwd(e) { const p = AH.sample(this.tr, e.dist, tmpB); const l = Math.hypot(p.tx, p.tz) || 1; return new THREE.Vector3(p.tx / l, 0, p.tz / l); }
    // ---- physics helpers
    vertical(e, dt) {
      if (e.flyT > 0) {
        e.flyT -= dt; e.alt = damp(e.alt, 7.5, 3.5, dt); e.vy = 0; e.air = true;
        return;
      }
      if (!e.air) {
        for (const r of this.world.ramps) {
          const d = ((e.dist - r.s) % this.L + this.L) % this.L;
          if (d <= r.len && Math.abs(e.x - r.x) < r.w) {
            e.alt = r.h * d / r.len;
            if (d > r.len - 1) { e.air = true; e.vy = 5 + e.v * 0.1; e.alt = r.h; if (e.isPlayer) { this.pop('SKOK!', 'sm'); e.nitro = Math.min(100, e.nitro + 12); if (this.state === 'race') this.stats.jumps++; } }
            return;
          }
        }
        e.alt = damp(e.alt, 0, 12, dt);
      } else {
        e.vy -= 26 * dt; e.alt += e.vy * dt;
        if (e.isPlayer && e.alt > 0.5) { e.nitro = Math.min(100, e.nitro + 16 * dt); if (this.state === 'race') this.stats.airT += dt; }
        if (e.alt <= 0) {
          if (e.isPlayer && e.vy < -7) { Snd.sfx('land'); this.shake = Math.max(this.shake, 0.35); }
          e.alt = 0; e.air = false; e.vy = 0;
        }
      }
    }
    updatePlayer(dt) {
      const p = this.player, st = p.st, tr = this.tr;
      const inp = input();
      const racing = this.state === 'race';
      let steer = racing ? inp.steer : 0;
      if (this.state === 'finished') steer = clamp((3 - p.x) * 0.15, -1, 1);
      p.steerVis = damp(p.steerVis, steer, 10, dt);
      const brake = racing && inp.brake;
      const wantN = racing && inp.nitro && p.nitro > 0;
      if (wantN && !p.nitroOn && p.superT <= 0) Snd.sfx('nitro');
      p.nitroOn = wantN || p.superT > 0 || p.startBoost > 0;
      if (wantN && p.superT <= 0) p.nitro = Math.max(0, p.nitro - st.nitroUse * dt);
      if (p.superT > 0) p.superT -= dt;
      if (p.startBoost > 0) p.startBoost -= dt;
      p.drift = brake && Math.abs(steer) > 0.3 && p.v > 18;
      let top = st.top * (p.nitroOn ? st.nitroPow * (p.superT > 0 ? 1.08 : 1) : 1);
      if (p.frozen > 0) { p.frozen -= dt; top = Math.min(top, 6); }
      p.ice.visible = p.frozen > 0;
      if (this.state === 'count') { p.v = 0; }
      else {
        if (brake && !p.drift) p.v -= 32 * dt;
        else if (p.drift) { p.v -= 5 * dt; p.nitro = Math.min(100, p.nitro + 26 * dt); }
        // the tank also refills slowly on its own while not boosting
        if (racing && !p.nitroOn) p.nitro = Math.min(100, p.nitro + 3.5 * dt);
        if (!inp.gas && !brake) p.v = Math.max(0, p.v - 5 * dt);
        else if (!brake || p.drift) {
          if (p.v < top) p.v += st.accel * clamp(1.12 - p.v / top, 0.12, 1) * (p.nitroOn ? 1.8 : 1) * dt;
          else p.v = damp(p.v, top, 0.8, dt);
        }
        p.v = Math.max(0, p.v);
      }
      const s = AH.sample(tr, p.dist, tmpA);
      const maxLat = 13 * st.grip * (p.drift ? 1.35 : 1) * clamp(p.v / 22, 0.25, 1) * (p.air && p.flyT <= 0 ? 0.55 : 1);
      p.vx = damp(p.vx, steer * maxLat, p.drift ? 3.5 : 7, dt);
      const centr = p.v * p.v * s.k * 0.22 / st.grip * (p.drift ? 0.45 : 1);
      p.latV = p.vx - centr;
      p.x += p.latV * dt;
      const lim = W - 1.15;
      if (Math.abs(p.x) > lim) {
        const hit = Math.abs(p.latV);
        p.x = Math.sign(p.x) * lim; p.vx = 0; p.v *= 1 - 0.35 * dt;
        if (hit > 3 && this.t - p.lastWall > 0.3) { Snd.sfx('wall'); this.shake = Math.max(this.shake, 0.25); p.lastWall = this.t; }
        if (this.rnd() < 0.7) { const g = p.model.group.position, sd = Math.sign(p.x); for (let k = 0; k < 3; k++) this.sparks.spawn(g.x + s.rx * sd * 1, g.y + 0.5, g.z + s.rz * sd * 1, (this.rnd() - 0.5) * 6, 2 + this.rnd() * 4, (this.rnd() - 0.5) * 6, 0.4, 1, 0.6, 0.15); }
      }
      p.driftAng = damp(p.driftAng, p.drift ? steer * 0.38 : 0, 4, dt);
      if (racing) {
        const T = this.stats, kmh = p.v * 3.6;
        if (p.drift) { T.driftT += dt; T.curDrift += dt; T.longDrift = Math.max(T.longDrift, T.curDrift); } else T.curDrift = 0;
        if (p.nitroOn) T.nitroT += dt;
        T.top = Math.max(T.top, Math.round(kmh));
        if (kmh > 200) T.fastT += dt;
      }
      p.dist += p.v * dt;
      this.vertical(p, dt);
      // finish & laps
      const lap = Math.floor(p.dist / this.L);
      if (lap !== p.lap) {
        if (p.lap !== undefined && lap > p.lap && lap >= 1 && lap < this.laps) this.pop(lap === this.laps - 1 ? 'OSTATNIE OKRĄŻENIE' : `OKRĄŻENIE ${lap + 1}/${this.laps}`, 'sm');
        p.lap = lap;
      }
      if (!p.finished && p.dist >= this.laps * this.L) {
        p.finished = true; p.finishTime = this.t;
        if (this.online) AH.Net.send('finish', { id: this.online.selfId, t: this.t });
        this.state = 'finished'; this.finishT = 0;
        const place = this.racers.filter(r => r.finished).length;
        this.pop(place === 1 ? 'ZWYCIĘSTWO!' : `META · ${place}. MIEJSCE`);
      }
    }
    onNet(ev, p) {
      if (ev === 'state') {
        const r = this.remotes.find(q => q.id === p.id); if (!r) return;
        r.snaps.push(Object.assign({ t: performance.now() }, p)); if (r.snaps.length > 20) r.snaps.shift();
      } else if (ev === 'finish') {
        const r = this.remotes.find(q => q.id === p.id); if (!r) return;
        r.finished = true; r.finishTime = p.t; if (!this.player.finished) this.pop(`${r.name} na mecie`, 'sm');
      } else if (ev === 'freeze') {
        if ((p.targets || []).includes(this.online.selfId) && this.state === 'race') {
          this.player.frozen = Math.min(6, Math.max(0, +p.dur || 3)); this.pop('ZAMROŻONO CIĘ!', 'ice'); this.flash('vfreeze'); Snd.sfx('freeze');
        }
      }
    }
    updateRemote(r, dt) {
      // render remote players ~150 ms in the past, interpolating between network snapshots
      const now = performance.now(), rt = now - 150, S = r.snaps;
      let a = S[0], b = S[S.length - 1];
      for (let i = S.length - 1; i > 0; i--) if (S[i - 1].t <= rt) { a = S[i - 1]; b = S[i]; break; }
      let d, x, al;
      if (rt >= b.t) { const ex = Math.min(0.3, (rt - b.t) / 1000); d = b.d + b.v * ex; x = b.x; al = b.a; }
      else { const k = b.t > a.t ? clamp((rt - a.t) / (b.t - a.t), 0, 1) : 1; d = a.d + (b.d - a.d) * k; x = a.x + (b.x - a.x) * k; al = a.a + (b.a - a.a) * k; }
      const prevX = r.x;
      r.dist = d; r.x = x; r.alt = al; r.v = b.v; r.nitroOn = !!b.n; r.flyT = b.f ? 1 : 0;
      r.latV = damp(r.latV, dt > 0 ? (x - prevX) / dt : 0, 8, dt);
      if (r.frozenFx > 0) r.frozenFx -= dt;
      r.frozen = b.fr || r.frozenFx > 0 ? 1 : 0;
      r.ice.visible = r.frozen > 0;
      r.stale = now - b.t > 6000;
      r.model.group.visible = !r.stale || r.finished;
    }
    chooseLane(a) {
      let best = a.targetX, bc = 1e9;
      const cands = AH.LANES.concat([a.x]);
      for (const lane of cands) {
        let cost = Math.abs(lane - a.x) * 0.12 + Math.abs(lane - a.pref) * 0.05;
        for (const t of this.traffic) {
          if (t.wreck > 0) continue;
          const ds = wrap(t.dist - a.dist, this.L);
          if (ds > -3 && ds < 55 && Math.abs(t.x - lane) < 3.4) cost += 60 - ds;
        }
        for (const r of this.racers) {
          if (r === a) continue;
          const ds = wrap(r.dist - a.dist, this.L);
          if (ds > -2 && ds < 14 && r.v < a.v + 2 && Math.abs(r.x - lane) < 2.6) cost += 20 - ds;
        }
        if (cost < bc) { bc = cost; best = lane; }
      }
      return best;
    }
    updateAI(a, dt) {
      const tr = this.tr;
      if (a.wreck > 0) {
        a.wreck -= dt; a.v = damp(a.v, 0, 2.5, dt); a.spin += dt * 9 * clamp(a.wreck / 2.5, 0, 1);
        if (a.wreck <= 0) { a.v = 18; a.spin = 0; }
      } else {
        let target = this.city.aiSpeed * a.skill;
        const gap = this.player.dist - a.dist;
        target *= clamp(1 + gap / 1400, 0.87, this.city.ai.catchUp);
        let mk = 0;
        for (let d = 0; d <= 80; d += 10) mk = Math.max(mk, Math.abs(AH.sample(tr, a.dist + d, tmpA).k));
        const vmax = Math.sqrt(13 * a.grip / (0.22 * mk + 1e-5)) * 1.08;
        target = Math.min(target, vmax);
        if (a.nitroT > 0) { a.nitroT -= dt; target *= 1.2; }
        else if (this.state === 'race' && this.rnd() < dt * this.city.ai.nitro && mk < 0.004) a.nitroT = 1.2 + this.rnd() * 1.5;
        a.nitroOn = a.nitroT > 0;
        if (a.frozen > 0) { a.frozen -= dt; target = 5; a.nitroOn = false; }
        if (this.state === 'count') target = 0;
        if (a.v < target) a.v = Math.min(target, a.v + a.accel * (a.nitroOn ? 1.6 : 1) * dt * (a.frozen > 0 ? 0 : 1));
        else a.v = damp(a.v, target, a.frozen > 0 ? 3 : 1.2, dt);
        a.laneT -= dt;
        if (a.laneT <= 0) { a.laneT = 0.3; if (this.rnd() < 0.02) a.pref = AH.LANES[Math.floor(this.rnd() * 4)]; a.targetX = this.chooseLane(a); }
        const want = clamp(a.targetX - a.x, -1, 1) * 7.5 * (a.frozen > 0 ? 0.2 : 1);
        a.latV = damp(a.latV, want, 6, dt);
        a.x = clamp(a.x + a.latV * dt, -W + 1.2, W - 1.2);
      }
      a.ice.visible = a.frozen > 0;
      a.dist += a.v * dt;
      this.vertical(a, dt);
      if (!a.finished && a.dist >= this.laps * this.L) { a.finished = true; a.finishTime = this.t; }
    }
    updateTraffic(dt) {
      const p = this.player;
      for (const t of this.traffic) {
        if (t.wreck > 0) {
          t.wreck -= dt;
          const g = t.model.group;
          t.vel.y -= 22 * dt; g.position.addScaledVector(t.vel, dt);
          if (g.position.y < t.floor) { g.position.y = t.floor; t.vel.y *= -0.35; t.vel.x *= 0.7; t.vel.z *= 0.7; }
          g.rotation.x += t.rot.x * dt; g.rotation.z += t.rot.z * dt; g.rotation.y += t.rot.y * dt;
          if (t.wreck <= 0) { t.dist = p.dist + 280 + this.rnd() * 250; t.x = AH.LANES[Math.floor(this.rnd() * 4)]; t.v = 20 + this.rnd() * 9; g.rotation.set(0, 0, 0); }
          continue;
        }
        if (this.state !== 'count') t.dist += t.v * dt;
        // keep traffic within reach of the player so the road always feels busy
        const rel = wrap(t.dist - p.dist, this.L);
        if (rel < -250) { t.dist = p.dist + 380 + this.rnd() * 300; t.x = AH.LANES[Math.floor(this.rnd() * 4)]; }
      }
    }
    knock(t, from, power) {
      const g = t.model.group, f = this.fwd(from);
      t.wreck = 2.6; t.floor = g.position.y;
      const side = Math.sign(t.x - from.x) || 1, s = AH.sample(this.tr, t.dist, tmpA);
      t.vel = new THREE.Vector3(f.x * from.v * 0.75 * power + s.rx * side * 8, 9 + power * 6, f.z * from.v * 0.75 * power + s.rz * side * 8);
      t.rot = new THREE.Vector3((this.rnd() - 0.5) * 8, (this.rnd() - 0.5) * 6, (this.rnd() - 0.5) * 10);
      for (let k = 0; k < 14; k++) this.sparks.spawn(g.position.x, g.position.y + 0.8, g.position.z, (this.rnd() - 0.5) * 14, this.rnd() * 9, (this.rnd() - 0.5) * 14, 0.6, 1, 0.55, 0.1);
    }
    collisions() {
      const p = this.player, L = this.L;
      // racers vs traffic
      for (const r of this.racers) {
        if (r.alt > 1.4 || r.wreck > 0 || r.isRemote) continue;
        for (const t of this.traffic) {
          if (t.wreck > 0) continue;
          const ds = wrap(t.dist - r.dist, L), dx = t.x - r.x;
          if (Math.abs(ds) < 4.4 && Math.abs(dx) < 2.05) {
            if (r.isPlayer) {
              if (r.nitroOn) { r.v *= 0.9; this.knock(t, r, 1); Snd.sfx('takedown'); this.shake = 0.5; this.stats.takedowns++; this.pop('ROZBITY!', 'sm'); r.nitro = Math.min(100, r.nitro + 10); }
              else { r.v *= 0.42; this.knock(t, r, 0.6); Snd.sfx('crash'); this.shake = 0.9; this.stats.crashes++; this.pop('KOLIZJA'); }
            } else { r.v *= 0.5; this.knock(t, r, 0.6); }
          } else if (r.isPlayer && Math.abs(ds) < 2.5 && Math.abs(dx) < 3.7 && r.v - t.v > 8 && this.t - t.nm > 3) {
            t.nm = this.t; this.stats.near++; r.nitro = Math.min(100, r.nitro + 14); this.pop('O WŁOS!', 'sm'); Snd.tone(1200, 0.12, 'triangle', 0.15);
          }
        }
      }
      // player vs AI
      if (p.alt > 1.4) return;
      for (const a of this.ai) {
        if (a.wreck > 0 || a.alt > 1.4) continue;
        const ds = wrap(a.dist - p.dist, L), dx = a.x - p.x;
        if (Math.abs(ds) < 4.6 && Math.abs(dx) < 2.2) {
          const latPush = p.latV * Math.sign(dx);
          if (p.nitroOn && (latPush > 4 || (ds > 0 && p.v - a.v > 7))) {
            a.wreck = 2.6; a.frozen = 0; this.stats.takedowns++; p.nitro = Math.min(100, p.nitro + 25);
            this.pop('TAKEDOWN!'); Snd.sfx('takedown'); this.shake = 0.6;
            const g = a.model.group.position; for (let k = 0; k < 20; k++) this.sparks.spawn(g.x, g.y + 0.8, g.z, (this.rnd() - 0.5) * 16, this.rnd() * 10, (this.rnd() - 0.5) * 16, 0.7, 1, 0.5, 0.1);
          } else {
            const ov = 2.2 - Math.abs(dx), sd = Math.sign(dx) || 1;
            if (Math.abs(ds) < 3.6) { p.x -= sd * ov * 0.5; a.x += sd * ov * 0.5; p.vx *= 0.3; this.shake = Math.max(this.shake, 0.15); }
            else if (ds > 0) { p.v = Math.min(p.v, a.v * 0.97); }
            else { a.v = Math.min(a.v, p.v * 0.97); }
            if (this.t - (a.bump || 0) > 0.4) { a.bump = this.t; Snd.burst(0.15, 900, 0.3); }
          }
        }
      }
    }
    pickupsUpdate(dt) {
      const p = this.player;
      for (const k of this.pickups) {
        if (k.hidden > 0) { k.hidden -= dt; if (k.hidden <= 0) k.g.visible = true; continue; }
        k.g.rotation.y += dt * 2.5;
        k.g.position.y = k.baseY + Math.sin(this.t * 3 + k.s) * 0.25;
        if (this.state !== 'race' || p.alt > 4) continue;
        const ds = wrap(k.s - p.dist, this.L);
        if (Math.abs(ds) < 2.4 && Math.abs(k.x - p.x) < 2.1) {
          k.hidden = 14; k.g.visible = false;
          if (k.type === 'coin') { this.stats.coins++; Snd.sfx('coin'); }
          else if (k.type === 'nitro') { p.nitro = 100; this.stats.gems++; this.pop('PEŁNE NITRO!', 'sm'); Snd.sfx('pickup'); }
          else { AH.save.boosts[k.type] = (AH.save.boosts[k.type] || 0) + 1; this.boostLog.picked[k.type]++; this.stats.picked++; this.pop(k.type === 'freeze' ? '+ZAMROŻENIE' : '+LOT', 'sm ice'); Snd.sfx('pickup'); this.hudBoosts(); }
          const g = k.g.position; for (let n = 0; n < 10; n++) this.sparks.spawn(g.x, g.y, g.z, (this.rnd() - 0.5) * 8, this.rnd() * 6, (this.rnd() - 0.5) * 8, 0.5, 1, 0.85, 0.3);
        }
      }
    }
    useBoost(id) {
      if (this.state !== 'race') return;
      const S = AH.save, p = this.player;
      if (!(S.boosts[id] > 0)) { this.pop('Brak ładunków: kup w sklepie', 'sm'); return; }
      if (id === 'freeze') {
        const range = p.st.freezeRange; let n = 0;
        for (const a of this.ai) { const ds = wrap(a.dist - p.dist, this.L); if (ds > -25 && ds < range && a.wreck <= 0) { a.frozen = p.st.freezeDur; n++; } }
        const hit = this.remotes.filter(r => { const ds = wrap(r.dist - p.dist, this.L); return ds > -25 && ds < range && !r.finished; });
        if (hit.length) { AH.Net.send('freeze', { from: this.online.selfId, targets: hit.map(r => r.id), dur: p.st.freezeDur }); hit.forEach(r => (r.frozenFx = p.st.freezeDur)); n += hit.length; }
        if (!n) { this.pop('Brak rywali w zasięgu', 'sm'); return; }
        this.stats.frozen += n; this.pop(`ZAMROŻENIE ×${n}`, 'ice'); Snd.sfx('freeze'); this.flash('vfreeze');
        this.ring(0x5fe1ff);
      } else if (id === 'fly') {
        if (p.flyT > 0) return;
        p.flyT = 2; p.air = true; this.stats.flyUsed++; this.pop('LOT!', 'ice'); Snd.sfx('fly'); this.ring(0xb48cff);
      } else if (id === 'nitro') {
        p.nitro = 100; p.superT = 2; this.stats.nitroMax++; this.pop('NITRO MAX!'); Snd.sfx('nitro'); this.ring(0xff7a1a);
      }
      S.boosts[id]--; this.boostLog.used[id]++; AH.persist(); this.hudBoosts();
    }
    ring(color) {
      const m = new THREE.Mesh(new THREE.RingGeometry(1, 2.2, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(this.player.model.group.position); m.position.y += 0.4;
      this.scene.add(m); this.rings.push({ m, t: 0 });
    }
    flash(id) { const el = $(id); el.style.opacity = 1; setTimeout(() => (el.style.opacity = 0), 500); }
    pop(text, cls = '') {
      const box = $('hmsg');
      const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text;
      box.appendChild(d); while (box.children.length > 3) box.firstChild.remove();
      setTimeout(() => d.remove(), 1400);
    }
    hudBoosts() {
      const S = AH.save;
      $('hboosts').innerHTML = AH.BOOSTS.map(b => `<button class="bst ${S.boosts[b.id] > 0 ? '' : 'empty'}" data-b="${b.id}" style="color:${b.color}" aria-label="${b.name}">${AH.ICONS[b.id]}<b class="num">${S.boosts[b.id] || 0}</b>${isTouch ? '' : `<kbd>${b.key}</kbd>`}</button>`).join('');
      $('hboosts').querySelectorAll('[data-b]').forEach(el => el.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); this.useBoost(el.dataset.b); }));
    }
    placeCar(e, dt) {
      const s = AH.sample(this.tr, e.dist, tmpA);
      const g = e.model.group;
      g.position.set(s.x + s.rx * e.x, s.y + 0.02 + e.alt, s.z + s.rz * e.x);
      const yaw = Math.atan2(s.tx, s.tz) - Math.atan2(e.latV, Math.max(e.v, 6)) * 0.85 - (e.driftAng || 0) + e.spin;
      const pitch = -Math.asin(clamp(s.ty, -1, 1)) - (e.air ? clamp(e.vy * 0.015, -0.2, 0.2) : 0);
      g.rotation.set(pitch, yaw, (e.steerVis || 0) * -0.035 * clamp(e.v / 50, 0, 1), 'YXZ');
      e.wheelRot += e.v * dt / e.model.P.r;
      for (const w of e.model.wheels) w.rotation.x = e.wheelRot;
      const fl = e.model.flames;
      for (const f of fl) { f.visible = e.nitroOn; if (e.nitroOn) { const sc = 0.8 + Math.random() * 0.6; f.scale.set(1, sc, 1); } }
      if (e.model.glow && e.isPlayer) e.model.glow.material.opacity = e.flyT > 0 ? 1 : 0.85;
      if (e.model.label) {
        const lb = e.model.label, sp = lb.sprite;
        sp.position.set(g.position.x, g.position.y + 2.25, g.position.z);
        const dcam = camera.position.distanceTo(sp.position);
        sp.visible = dcam < 320 && !(e.isPlayer && this.state === 'count');
        const k = clamp(dcam * 0.045, e.isPlayer ? 0.75 : 1, 7);
        sp.scale.set(2.6 * k, 1.3 * k, 1);
      }
    }
    placeTraffic(t) {
      if (t.wreck > 0) return;
      const s = AH.sample(this.tr, t.dist, tmpA), g = t.model.group;
      g.position.set(s.x + s.rx * t.x, s.y + 0.02, s.z + s.rz * t.x);
      g.rotation.set(-Math.asin(clamp(s.ty, -1, 1)), Math.atan2(s.tx, s.tz), 0, 'YXZ');
    }
    placeAll(dt) { for (const r of this.racers) this.placeCar(r, dt); for (const t of this.traffic) this.placeTraffic(t); }
    update(dt) {
      this.dtLast = dt;
      this.t += this.state === 'count' ? 0 : dt;
      if (this.state === 'count') {
        this.count -= dt;
        const n = Math.ceil(this.count - 1);
        if (n !== this.lastCount && this.count < 4) {
          this.lastCount = n;
          const cd = $('countdown');
          if (n >= 1) { cd.innerHTML = `<span>${n}</span>`; Snd.sfx('beep'); }
          else { cd.innerHTML = '<span>START!</span>'; Snd.sfx('go'); this.state = 'race'; this.t = 0; this.goT = 0; setTimeout(() => (cd.innerHTML = ''), 900);
            if (input().nitro) { this.player.startBoost = 1.4; this.stats.perfect = 1; this.pop('IDEALNY START!', 'sm'); }
          }
        }
      }
      if (this.state === 'race' && this.goT !== undefined && this.goT < 0.4) { this.goT += dt; if (input().nitro && this.player.startBoost <= 0 && this.goT < 0.35) { this.player.startBoost = 1.2; this.stats.perfect = 1; this.pop('IDEALNY START!', 'sm'); } }
      this.updatePlayer(dt);
      for (const a of this.ai) this.updateAI(a, dt);
      for (const r of this.remotes) this.updateRemote(r, dt);
      if (this.online && this.state !== 'count') {
        this.netT += dt;
        if (this.netT >= 0.12) {
          this.netT = 0; const p = this.player;
          AH.Net.send('state', { id: this.online.selfId, d: Math.round(p.dist * 10) / 10, x: Math.round(p.x * 100) / 100, a: Math.round(p.alt * 100) / 100, v: Math.round(p.v * 10) / 10, n: p.nitroOn ? 1 : 0, f: p.flyT > 0 ? 1 : 0, fr: p.frozen > 0 ? 1 : 0 });
        }
      }
      this.updateTraffic(dt);
      if (this.state !== 'count') this.collisions();
      this.pickupsUpdate(dt);
      this.placeAll(dt);
      // fx
      const p = this.player, pg = p.model.group.position;
      if (p.drift && p.alt < 0.3) { const f = this.fwd(p); for (let k = 0; k < 2; k++) this.smoke.spawn(pg.x - f.x * 2 + (this.rnd() - 0.5) * 2, pg.y + 0.3, pg.z - f.z * 2 + (this.rnd() - 0.5) * 2, (this.rnd() - 0.5) * 2, 1 + this.rnd(), (this.rnd() - 0.5) * 2, 0.9, 0.35, 0.35, 0.38); }
      if (p.flyT > 0) { for (let k = 0; k < 2; k++) this.sparks.spawn(pg.x + (this.rnd() - 0.5) * 2, pg.y, pg.z + (this.rnd() - 0.5) * 2, 0, -3, 0, 0.5, 0.7, 0.55, 1); }
      for (const a of this.ai) if (a.frozen > 0 && this.rnd() < 0.4) { const g = a.model.group.position; this.sparks.spawn(g.x + (this.rnd() - 0.5) * 3, g.y + 2, g.z + (this.rnd() - 0.5) * 3, 0, 1, 0, 0.6, 0.5, 0.9, 1); }
      this.sparks.update(dt, 12); this.smoke.update(dt, -1);
      for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt; const s = 1 + r.t * 90; r.m.scale.set(s, s, s); r.m.material.opacity = Math.max(0, 0.8 - r.t * 1.2); if (r.t > 0.7) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.rings.splice(i, 1); } }
      for (const f of this.world.anim) f(this.t);
      this.updateCamera(dt);
      this.hud();
      // engine audio
      const top = p.st.top, sp = p.v / top;
      const gears = [0, 0.22, 0.4, 0.58, 0.76, 0.92, 1.4];
      let gi = 1; while (gi < gears.length - 1 && sp > gears[gi]) gi++;
      const rpm = this.state === 'count' ? 0.25 + Math.abs(Math.sin(this.count * 6)) * 0.2 : clamp((sp - gears[gi - 1]) / (gears[gi] - gears[gi - 1]), 0, 1) * 0.75 + 0.25;
      Snd.engine(mode === 'hud' || mode === 'results', rpm, p.nitroOn, clamp(sp, 0, 1.3));
      if (this.state === 'finished') {
        this.finishT += dt;
        if (this.finishT > 2.6 && !this.resultsShown) { this.resultsShown = true; showResults(this); }
      }
    }
    updateCamera(dt) {
      const p = this.player, g = p.model.group.position;
      const f = this.fwd(p);
      const yawOff = -Math.atan2(p.latV, Math.max(p.v, 6)) * 0.35 - p.driftAng * 0.4;
      const cf = new THREE.Vector3(f.x * Math.cos(yawOff) + f.z * Math.sin(yawOff), 0, -f.x * Math.sin(yawOff) + f.z * Math.cos(yawOff));
      const back = 7.4 + p.v * 0.022 + (p.nitroOn ? 1.2 : 0);
      const target = new THREE.Vector3(g.x - cf.x * back, g.y + 2.6 + p.alt * 0.15, g.z - cf.z * back);
      this.camPos.x = damp(this.camPos.x, target.x, 9, dt); this.camPos.z = damp(this.camPos.z, target.z, 9, dt); this.camPos.y = damp(this.camPos.y, target.y, 6, dt);
      this.shake = Math.max(0, this.shake - dt * 1.6);
      const sh = this.shake * this.shake * 0.8 + (p.nitroOn ? 0.03 : 0);
      camera.position.set(this.camPos.x + (Math.random() - 0.5) * sh, this.camPos.y + (Math.random() - 0.5) * sh, this.camPos.z + (Math.random() - 0.5) * sh);
      this.camLook.set(g.x + cf.x * 9, g.y + 1.3, g.z + cf.z * 9);
      camera.lookAt(this.camLook);
      const fov = 60 + p.v * 0.16 + (p.nitroOn ? 10 : 0) + (p.flyT > 0 ? 6 : 0);
      this.fov = damp(this.fov, fov, 3.5, dt);
      if (Math.abs(camera.fov - this.fov) > 0.05) { camera.fov = this.fov; camera.updateProjectionMatrix(); }
      this.world.sky.position.copy(camera.position);
      this.sun.position.copy(g).addScaledVector(this.sunDir, 250);
      this.sun.target.position.copy(g);
    }
    positionOf(e) { return 1 + this.racers.filter(r => r !== e && (r.finished && e.finished ? r.finishTime < e.finishTime : r.finished ? true : e.finished ? false : r.dist > e.dist)).length; }
    drawLabel(e, pos) {
      const lb = e.model.label; if (!lb) return;
      const key = pos + '|' + e.name + '|' + (e.frozen > 0 ? 1 : 0);
      if (lb.last === key) return; lb.last = key;
      const g = lb.canvas.getContext('2d'), W = 256, H = 128;
      g.clearRect(0, 0, W, H);
      const col = e.isPlayer ? '#ffc21a' : e.frozen > 0 ? '#5fe1ff' : pos === 1 ? '#ff7a1a' : '#e9ecf2';
      g.fillStyle = 'rgba(8,9,14,.72)'; g.strokeStyle = col; g.lineWidth = 5;
      const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
      rr(8, 14, W - 16, 78, 22); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(W / 2 - 14, 92); g.lineTo(W / 2 + 14, 92); g.lineTo(W / 2, 112); g.closePath(); g.fillStyle = col; g.fill();
      g.fillStyle = col; g.font = 'italic 700 58px "Chakra Petch", Arial, sans-serif'; g.textBaseline = 'middle';
      g.fillText(String(pos), 24, 55);
      g.font = '600 30px "Barlow Semi Condensed", Arial, sans-serif'; g.fillStyle = '#ffffff';
      const nm = e.isPlayer ? 'TY' : e.name.toUpperCase();
      g.fillText(nm.length > 10 ? nm.slice(0, 9) + '…' : nm, pos >= 10 ? 100 : 76, 56);
      lb.tex.needsUpdate = true;
    }
    hud() {
      const p = this.player;
      for (const r of this.racers) this.drawLabel(r, this.positionOf(r));
      const myPos = this.positionOf(p);
      $('hpos').innerHTML = `${myPos}<small>/${this.racers.length}</small>`;
      if (this.state === 'race') {
        const T = this.stats;
        if (T.lastPos && myPos < T.lastPos) T.overtakes += T.lastPos - myPos;
        T.lastPos = myPos;
        if (myPos === 1) T.leadT += this.dtLast || 0;
      }
      this.questHud();
      $('hlap').textContent = `OKR. ${clamp(Math.floor(p.dist / this.L) + 1, 1, this.laps)}/${this.laps}`;
      $('htime').textContent = AH.fmtTime(p.finished ? p.finishTime : this.t);
      $('hspeed').textContent = Math.round(p.v * 3.6);
      $('hgauge').style.strokeDashoffset = 414.7 * (1 - clamp(p.v * 3.6 / 360, 0, 1));
      $('hngauge').setAttribute('stroke-dasharray', `${(p.nitro / 100) * 358} 477.5`);
      const nb = $('hnitro'); nb.firstChild.style.width = p.nitro + '%'; nb.classList.toggle('on', p.nitroOn);
      $('vnitro').style.opacity = p.nitroOn ? 1 : 0;
      $('vfly').style.opacity = p.flyT > 0 ? 1 : 0;
      document.querySelectorAll('#hboosts .bst').forEach(b => b.classList.toggle('active', (b.dataset.b === 'fly' && p.flyT > 0) || (b.dataset.b === 'nitro' && p.superT > 0)));
      // minimap
      const c = $('minimap'), g = c.getContext('2d'), mm = this.mm;
      g.clearRect(0, 0, mm.S, mm.S); g.drawImage(this.mmBg, 0, 0);
      const dot = (e, col, r) => { const q = e.model.group.position; g.beginPath(); g.arc(mm.S / 2 + (q.x - mm.cx) * mm.sc, mm.S / 2 + (q.z - mm.cz) * mm.sc, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = '#000'; g.stroke(); };
      for (const a of this.ai) dot(a, a.frozen > 0 ? '#5fe1ff' : '#ff1f5a', 8);
      dot(p, '#ffc21a', 11);
    }
    questHud(force) {
      const el = $('hquests'); if (!el) return;
      this.qT = (this.qT || 0) + (this.dtLast || 0);
      if (!force && this.qT < 0.25) return; this.qT = 0;
      const Q = AH.Quests, q = Q.state(), live = this.stats;
      const rows = q.active.map(a => { const v = Math.min(a.goal, Q.value(a, live)), done = v >= a.goal; return `<li class="${done ? 'ok' : ''}"><span>${Q.text(a)}</span><i><b style="width:${(v / a.goal * 100).toFixed(1)}%"></b></i><em class="num">${done ? '✓' : (Number.isInteger(v) ? v : v.toFixed(1)) + '/' + a.goal}</em></li>`; }).join('');
      const key = rows + q.level + q.done;
      if (key === this.qKey) return; this.qKey = key;
      el.querySelector('.qh').innerHTML = `<b>Zadania</b><span class="num">Poz. ${q.level} · ${q.done}/${Q.PER_LEVEL}</span>`;
      el.querySelector('ol').innerHTML = rows;
    }
    standings() {
      const est = (r) => r.finished ? r.finishTime : this.t + Math.max(0, this.laps * this.L - r.dist) / Math.max(r.v, 30);
      return this.racers.map(r => ({ r, time: est(r) })).sort((a, b) => a.time - b.time);
    }
    dispose() {
      const keep = new Set(Object.values(AH.geoCache).flatMap(o => Object.values(o)));
      this.scene.traverse(o => {
        if (o.geometry && !keep.has(o.geometry)) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
      });
      this.envRT.dispose();
      for (const m of Object.values(AH.mats)) if (m.envMap) { m.envMap = null; m.needsUpdate = true; }
      $('hmsg').innerHTML = ''; $('countdown').innerHTML = '';
    }
  }

  // ---------------- flow ----------------
  function startRace(idx, net = null) {
    Snd.init();
    if (race) { race.dispose(); race = null; }
    clearInterval(showResults.live);
    show('loading');
    $('loadtext').textContent = (net ? 'Wyścig online: ' : 'Ładowanie: ') + AH.CITIES[idx].name + '…';
    setTimeout(() => {
      try {
        race = new Race(idx, net);
      } catch (e) {
        console.error(e); $('loadtext').textContent = 'Błąd ładowania trasy: ' + e.message; return;
      }
      if (net) race.count = 1 + Math.max(0.4, (net.at - Date.now()) / 1000);
      $('touch').hidden = !isTouch;
      $('p-restart').hidden = !!net;
      race.hudBoosts();
      show('hud');
    }, 50);
  }
  // online events → current race / lobby
  for (const ev of ['state', 'finish', 'freeze']) AH.Net.on('net:' + ev, (p) => { if (race && race.online) race.onNet(ev, p); });
  AH.Net.on('net:start', (p) => { if (!AH.Net.party || !p || !Array.isArray(p.roster)) return; const idx = clamp(p.city | 0, 0, AH.CITIES.length - 1); startRace(idx, { roster: p.roster.slice(0, 6), at: +p.at || Date.now() + 3000, selfId: AH.Net.user.id }); });
  AH.Net.on('party', () => { if (mode === 'party') renderParty(); });
  function pause() { if (!race || race.state === 'finished') return; show('pause', true); $('p-mute').textContent = 'Dźwięk: ' + (AH.save.muted ? 'wył.' : 'wł.'); Snd.engine(false, 0, false, 0); }
  function resume() { show('hud'); last = performance.now(); }
  function quitToMenu() { clearInterval(showResults.live); if (race) { race.dispose(); race = null; } Snd.engine(false, 0, false, 0); renderer.toneMappingExposure = 1; setGarageCar(AH.save.sel); show('menu'); }
  $('pausebtn').onclick = pause;
  {
    const qp = $('hquests'), setQ = () => qp.classList.toggle('min', !!AH.save.qMin);
    setQ();
    qp.querySelector('.qh').onclick = () => { AH.save.qMin = !AH.save.qMin; AH.persist(); setQ(); };
  }
  $('p-resume').onclick = resume;
  $('p-restart').onclick = () => startRace(race.cityIdx);
  $('p-quit').onclick = quitToMenu;
  const gasLabel = () => 'Gaz: ' + (AH.save.autoGas === false ? 'klawisz W' : 'automatyczny');
  const toggleGas = () => { AH.save.autoGas = AH.save.autoGas === false; AH.persist(); document.querySelectorAll('[data-gas]').forEach(b => b.textContent = gasLabel()); };
  document.querySelectorAll('[data-gas]').forEach(b => { b.textContent = gasLabel(); b.onclick = toggleGas; });
  $('p-mute').onclick = () => { Snd.init(); Snd.setMuted(!AH.save.muted); $('p-mute').textContent = 'Dźwięk: ' + (AH.save.muted ? 'wył.' : 'wł.'); };

  function showResults(r) {
    const S = AH.save, city = r.city;
    const st = r.standings();
    const pos = st.findIndex(x => x.r === r.player);
    const basePts = [1000, 700, 500, 350, 250, 150][pos] * city.mult;
    const coinPts = r.stats.coins * 15 * r.player.st.coinMult;
    const tdPts = r.stats.takedowns * 150, nmPts = r.stats.near * 25;
    const raceTotal = Math.round(basePts + coinPts + tdPts + nmPts);
    // tasks: finish the race stats, settle up to three tasks
    const qs = Object.assign({}, r.stats, { finished: 1, podium: pos + 1 <= AH.PODIUM ? 1 : 0, win: pos === 0 ? 1 : 0, clean: r.stats.crashes === 0 ? 1 : 0, score: raceTotal, podiumNoNitro: pos + 1 <= AH.PODIUM && r.stats.nitroT < 0.05 ? 1 : 0, cityDone: 1, cityPodium: pos + 1 <= AH.PODIUM ? 1 : 0 });
    const qr = AH.Quests.finishRace(qs);
    const total = raceTotal + qr.pts;
    const unlockedBefore = AH.unlockedCount();
    // map progression: remember the best place in this city (podium unlocks the next one)
    S.cleared = S.cleared || {};
    if (!S.cleared[city.id] || pos + 1 < S.cleared[city.id]) S.cleared[city.id] = pos + 1;
    const time = r.player.finishTime;
    const rec = !S.best[city.id] || time < S.best[city.id];
    if (online()) {
      AH.Net.submitRace({ city: city.id, place: pos + 1, coins: r.stats.coins, takedowns: r.stats.takedowns, near: r.stats.near, time, used: r.boostLog.used, picked: r.boostLog.picked, quest: qr.pts })
        .then((out) => { const el = $('res-total'); if (el) el.textContent = `+${AH.fmt(out.reward)} pkt`; const n = $('res-saved'); if (n) n.textContent = 'Zapisano na koncie.'; renderTopbars(); })
        .catch((e) => { const n = $('res-saved'); if (n) n.textContent = 'Nie zapisano wyniku: ' + e.message; });
    } else {
      S.pts += total; S.races++; if (pos === 0) S.wins++;
      if (rec) S.best[city.id] = time;
      AH.persist();
    }
    AH.persist();
    const newCity = AH.unlockedCount() > unlockedBefore ? AH.CITIES[AH.unlockedCount() - 1] : null;
    const next = r.cityIdx + 1 < AH.CITIES.length ? r.cityIdx + 1 : null;
    $('resbox').innerHTML = `
      <div><span class="eyebrow">${city.name} · ${AH.fmtTime(time)}${rec ? ' · nowy rekord!' : ''}</span><h2>${pos === 0 ? 'Zwycięstwo!' : pos + 1 + '. miejsce'}</h2></div>
      <div class="standings">${st.map((x, i) => `<div class="srow ${x.r.isPlayer ? 'me' : ''}"><b>${i + 1}</b><span>${x.r.isPlayer ? 'Ty' : x.r.name} · ${x.r.cfg.name}</span><em class="num">${x.r.finished ? AH.fmtTime(x.time) : '~' + AH.fmtTime(x.time)}</em><em>${x.r.isPlayer ? '' : ''}</em></div>`).join('')}</div>
      <div class="rewards num">
        <div><span>Miejsce ${pos + 1} (×${city.mult})</span><b>+${AH.fmt(basePts)}</b></div>
        <div><span>Monety ×${r.stats.coins}</span><b>+${AH.fmt(coinPts)}</b></div>
        <div><span>Takedowny ×${r.stats.takedowns}</span><b>+${AH.fmt(tdPts)}</b></div>
        <div><span>O włos ×${r.stats.near}</span><b>+${AH.fmt(nmPts)}</b></div>
        ${qr.done.map(d => `<div class="qdone"><span>Zadanie: ${d.text}</span><b>+${AH.fmt(d.reward)}</b></div>`).join('')}
        ${qr.levelUps.map(l => `<div class="qdone lv"><span>Poziom ${l.level}!</span><b>+${AH.fmt(l.reward)}</b></div>`).join('')}
        <div class="tot"><span>Razem</span><b class="pts" id="res-total">+${AH.fmt(total)} pkt</b></div>
        ${online() ? '<em id="res-saved" class="xptext">Zapisywanie na koncie…</em>' : ''}
      </div>
      ${newCity ? `<div class="levelup">Odblokowano nową trasę: ${newCity.name}! Rywale będą tam szybsi.</div>` : (!r.online && pos + 1 > AH.PODIUM && r.cityIdx + 1 < AH.CITIES.length && !AH.cityUnlocked(r.cityIdx + 1) ? `<div class="rewards">Zajmij miejsce 1–3, żeby odblokować: ${AH.CITIES[r.cityIdx + 1].name}. Ulepsz auto w garażu, jeśli rywale uciekają.</div>` : '')}
      <div class="btns">${r.online ? `<button class="solid" id="r-lobby">Wróć do lobby</button>` : `
        <button class="solid" id="r-again">Jeszcze raz</button>
        ${next !== null && AH.cityUnlocked(next) ? `<button class="ghost" id="r-next">Dalej: ${AH.CITIES[next].name}</button>` : ''}`}
        <button class="ghost" id="r-garage">Garaż</button>
        <button class="ghost" id="r-menu">Menu</button>
      </div>`;
    show('results', true);
    $('touch').hidden = true;
    if (r.online) {
      $('r-lobby').onclick = () => { quitToMenu(); renderParty(); show('party'); };
      // keep the table live while friends are still finishing
      const t0 = Date.now();
      showResults.live = setInterval(() => {
        if (!race || race !== r || mode !== 'results' || Date.now() - t0 > 180000) { clearInterval(showResults.live); return; }
        const box = document.querySelector('#resbox .standings'); if (!box) return;
        box.innerHTML = r.standings().map((x, i) => `<div class="srow ${x.r.isPlayer ? 'me' : ''}"><b>${i + 1}</b><span>${x.r.isPlayer ? 'Ty' : x.r.name} · ${x.r.cfg.name}</span><em class="num">${x.r.finished ? AH.fmtTime(x.time) : 'w trasie…'}</em><em></em></div>`).join('');
      }, 1000);
    } else {
      $('r-again').onclick = () => startRace(r.cityIdx);
      if ($('r-next')) $('r-next').onclick = () => startRace(next);
    }
    $('r-garage').onclick = () => { quitToMenu(); viewCar = AH.save.sel; renderGarage(); show('garage'); };
    $('r-menu').onclick = quitToMenu;
  }

  // ---------------- loop ----------------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (race && (mode === 'hud' || mode === 'results')) {
      race.update(dt);
      renderer.render(race.scene, camera);
    } else if (race && (mode === 'pause' || mode === 'loading')) {
      if (mode === 'pause' && race.online) race.update(dt);
      if (mode === 'pause') renderer.render(race.scene, camera);
    } else {
      if (AH.Festival.ready) {
        AH.Festival.update(dt, SHOT[mode] || 'festival', camera);
        renderer.render(AH.Festival.scene, camera);
      }
    }
  }

  // ---------------- accounts ----------------
  let authMode = 'login', failCount = 0, lockUntil = 0, entering = false;
  function showAuth(m = 'login') {
    setAuthMode(m);
    const note = $('auth-note');
    if (!AH.Net.enabled) {
      note.hidden = false;
      note.textContent = 'Logowanie przez Google i e-mail włączy się po podłączeniu serwera gry. Do tego czasu zagraj jako gość: postęp zapisze się w tej przeglądarce.';
    } else note.hidden = true;
    $('auth-google').disabled = !AH.Net.enabled; $('auth-submit').disabled = !AH.Net.enabled; $('auth-forgot').hidden = !AH.Net.enabled || m !== 'login';
    $('auth-err').textContent = ''; $('auth-err').className = 'autherr';
    show('auth');
  }
  function setAuthMode(m) {
    authMode = m;
    $('tab-login').classList.toggle('on', m === 'login'); $('tab-register').classList.toggle('on', m === 'register');
    $('fld-nick').hidden = m !== 'register';
    $('pwmeter').hidden = m === 'login';
    $('auth-email').closest('.fld').hidden = m === 'recover';
    $('auth-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('auth-submit').textContent = m === 'login' ? 'Zaloguj się' : m === 'register' ? 'Załóż konto' : 'Ustaw nowe hasło';
    $('auth-forgot').hidden = m !== 'login' || !AH.Net.enabled;
    $('auth-google').hidden = m === 'recover';
  }
  const pwScore = (p) => { let k = 0; if (p.length >= 8) k++; if (p.length >= 12) k++; if (/[a-ząćęłńóśźż]/.test(p) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(p)) k++; if (/\d/.test(p)) k++; if (/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(p)) k++; return k; };
  $('auth-pass').addEventListener('input', () => {
    const k = pwScore($('auth-pass').value), m = $('pwmeter');
    m.style.setProperty('--w', (k / 5 * 100) + '%'); m.style.setProperty('--c', k <= 2 ? 'var(--hot)' : k === 3 ? 'var(--gold)' : 'var(--good)');
    m.querySelector('span').textContent = ['Za krótkie', 'Słabe', 'Słabe', 'Średnie', 'Mocne', 'Bardzo mocne'][k];
  });
  $('tab-login').onclick = () => showAuth('login');
  $('tab-register').onclick = () => showAuth('register');
  $('auth-eye').onclick = () => { const i = $('auth-pass'); i.type = i.type === 'password' ? 'text' : 'password'; $('auth-eye').textContent = i.type === 'password' ? 'Pokaż' : 'Ukryj'; };
  const authErr = (t, ok) => { $('auth-err').textContent = t; $('auth-err').className = 'autherr' + (ok ? ' ok' : ''); };
  $('auth-google').onclick = async () => { try { authErr('Przekierowanie do Google…', true); await AH.Net.signInGoogle(); } catch (e) { authErr(e.message); } };
  $('auth-forgot').onclick = async () => {
    const email = $('auth-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authErr('Wpisz najpierw swój e-mail.');
    try { await AH.Net.resetPassword(email); authErr('Wysłaliśmy link do zmiany hasła. Sprawdź skrzynkę.', true); } catch (e) { authErr(e.message); }
  };
  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!AH.Net.enabled) return;
    if (Date.now() < lockUntil) return authErr(`Za dużo nieudanych prób. Spróbuj za ${Math.ceil((lockUntil - Date.now()) / 1000)} s.`);
    const email = $('auth-email').value.trim(), pass = $('auth-pass').value, nick = $('auth-nick').value.trim();
    if (authMode !== 'recover' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authErr('Podaj poprawny adres e-mail.');
    if (pass.length < 8) return authErr('Hasło musi mieć co najmniej 8 znaków.');
    if (authMode !== 'login' && pwScore(pass) < 3) return authErr('Hasło jest za słabe: dodaj wielkie litery, cyfry albo znaki specjalne.');
    if (authMode === 'register' && !/^[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ .-]{3,20}$/.test(nick)) return authErr('Nick: 3–20 znaków (litery, cyfry, spacja, _ . -).');
    $('auth-submit').disabled = true;
    try {
      if (authMode === 'login') { await AH.Net.signIn(email, pass); failCount = 0; await enterOnline(); }
      else if (authMode === 'register') {
        const r = await AH.Net.signUp(email, pass, nick);
        if (r.needsConfirm) { authErr('Konto założone. Kliknij link aktywacyjny w mailu, a potem się zaloguj.', true); setAuthMode('login'); }
        else await enterOnline();
      } else {
        const { error } = await AH.Net.sb.auth.updateUser({ password: pass }); if (error) throw new Error(AH.Net.msg(error));
        authErr('Hasło zmienione.', true); await enterOnline();
      }
    } catch (err) {
      if (authMode === 'login' && ++failCount >= 5) { lockUntil = Date.now() + 30000; failCount = 0; }
      authErr(err.message);
    } finally { $('auth-submit').disabled = false; }
  });
  $('auth-guest').onclick = () => { AH.save.guest = true; AH.persist(); setGarageCar(AH.save.sel, true); show('menu'); };
  async function enterOnline() {
    if (entering) return; entering = true;
    try {
      const prefs = { muted: AH.save.muted, autoGas: AH.save.autoGas };
      AH.save = AH.migrate(Object.assign(AH.load(), prefs));
      await AH.Net.loadProfile();
      setGarageCar(AH.save.sel, true);
      show('menu'); toast('Witaj, ' + (AH.Net.nickname || 'kierowco') + '!');
    } catch (e) { authErr(e.message); show('auth'); }
    finally { entering = false; }
  }
  async function logout() {
    if (race) quitToMenu();
    try { await AH.Net.signOut(); } catch (e) { /* ignore */ }
    AH.save = AH.migrate(AH.load()); setGarageCar(AH.save.sel, true); renderTopbars(); toast('Wylogowano.'); showAuth('login');
  }
  AH.Net.on('auth', ({ event }) => {
    if (event === 'PASSWORD_RECOVERY') showAuth('recover');
    else if (event === 'SIGNED_IN' && mode === 'auth' && authMode !== 'recover') enterOnline();
  });

  // ---------------- party lobby ----------------
  let partyCity = 0;
  async function renderParty() {
    const box = $('partybody'), N = AH.Net;
    if (!N.enabled) {
      box.innerHTML = `<div class="ppanel"><h3>Gra online jest jeszcze wyłączona</h3><p>Party ze znajomymi zadziała po podłączeniu serwera gry (konta i kanały na żywo). Na razie możesz ścigać się z komputerem.</p><button class="solid" data-go-race>Wyścig solo</button></div>`;
      box.querySelector('[data-go-race]').onclick = () => { renderCities(); show('cities'); };
      return;
    }
    if (!N.user) {
      box.innerHTML = `<div class="ppanel"><h3>Zaloguj się, by grać ze znajomymi</h3><p>Party wymaga konta: dzięki temu tylko osoby z kodem i zalogowane mogą dołączyć.</p><button class="solid" data-login2>Zaloguj się</button></div>`;
      box.querySelector('[data-login2]').onclick = () => showAuth('login');
      return;
    }
    const P = N.party;
    if (!P) {
      box.innerHTML = `<div class="partygrid">
        <div class="ppanel"><h3>Utwórz party</h3><p>Dostaniesz 6‑znakowy kod. Podaj go znajomym, a oni wpiszą go u siebie. Do 6 graczy.</p><button class="solid" id="pt-create">Utwórz party</button></div>
        <div class="ppanel"><h3>Dołącz kodem</h3><p>Wpisz kod od znajomego.</p><form class="codein" id="pt-joinf"><input id="pt-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234" aria-label="Kod party"><button class="solid" type="submit">Dołącz</button></form></div>
      </div><p class="autherr" id="pt-err"></p>`;
      $('pt-create').onclick = async () => { try { $('pt-create').disabled = true; await N.createParty(); renderParty(); } catch (e) { $('pt-err').textContent = e.message; $('pt-create').disabled = false; } };
      $('pt-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      $('pt-joinf').addEventListener('submit', async (e) => { e.preventDefault(); try { await N.joinParty($('pt-code').value); renderParty(); } catch (err) { $('pt-err').textContent = err.message; } });
      return;
    }
    const list = [...P.members.values()].sort((a, b) => a.t - b.t), host = N.isHost(), hex = (c) => '#' + new THREE.Color(c || 0x888888).getHexString();
    box.innerHTML = `<div class="partygrid">
      <div class="ppanel"><span class="eyebrow">Kod party</span><div class="bigcode"><b>${P.code}</b><button class="ghost small" id="pt-copy">Kopiuj</button></div>
        <p>Znajomi wpisują ten kod w „Ze znajomymi → Dołącz kodem”.</p>
        <div class="members">${list.map(m => `<div class="member"><span class="dot" style="background:${hex(m.color)}"></span><span><b>${m.name}</b> · ${AH.carById(m.car).name}</span>${m.id === P.hostId ? '<em class="host">HOST</em>' : m.ready ? '<em class="rdy">GOTOWY</em>' : '<em>czeka</em>'}</div>`).join('')}</div>
        <div class="btns">${host ? '' : `<button class="ghost" id="pt-ready">${P.ready ? 'Nie jestem gotowy' : 'Jestem gotowy'}</button>`}<button class="ghost" id="pt-leave">Opuść party</button></div>
      </div>
      <div class="ppanel">${host ? `<h3>Wybierz trasę</h3><div class="citypick">${AH.CITIES.map((c, i) => `<button class="${i === partyCity ? 'on' : ''}" data-pc="${i}">${c.name}</button>`).join('')}</div>
        <button class="solid" id="pt-start" ${list.length < 2 ? 'disabled' : ''}>${list.length < 2 ? 'Czekam na znajomych…' : 'Start wyścigu (' + list.length + ' graczy)'}</button>
        <p>Auto i lakier bierzesz z garażu. Ruch uliczny jest u każdego lokalny; boost Zamrożenie działa na znajomych.</p>`
        : `<h3>Czekamy na hosta</h3><p>Host wybiera miasto i startuje. Zaznacz „Jestem gotowy”, a potem zostań na tym ekranie.</p>`}</div>
    </div><p class="autherr" id="pt-err"></p>`;
    $('pt-copy').onclick = async () => { try { await navigator.clipboard.writeText(P.code); toast('Skopiowano kod ' + P.code); } catch (e) { toast('Kod: ' + P.code); } };
    $('pt-leave').onclick = async () => { await N.leaveParty(); renderParty(); };
    if ($('pt-ready')) $('pt-ready').onclick = () => { N.setReady(!P.ready); };
    box.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { partyCity = +b.dataset.pc; renderParty(); });
    if ($('pt-start')) $('pt-start').onclick = () => {
      const roster = [...P.members.values()].sort((a, b) => a.t - b.t).slice(0, 6).map(m => ({ id: m.id, name: m.name, car: m.car, color: m.color, finish: m.finish, rim: m.rim, neon: m.neon }));
      const payload = { city: partyCity, at: Date.now() + 4500, roster };
      N.send('start', payload);
      startRace(partyCity, { roster, at: payload.at, selfId: N.user.id });
    };
  }

  // ---------------- boot ----------------
  requestAnimationFrame(frame);
  (async () => {
    const bar = $('loadbar'), txt = $('loadtext');
    txt.textContent = 'Budujemy festiwal…'; bar.style.width = '8%';
    await new Promise(r => setTimeout(r, 30));
    AH.Festival.init(makeEnvMap);
    bar.style.width = '30%'; txt.textContent = 'Ładujemy auta…';
    await AH.loadModels((f) => { bar.style.width = (30 + f * 65) + '%'; });
    bar.style.width = '100%';
    if (AH.Festival.parkCars) AH.Festival.parkCars();
    setGarageCar(AH.save.sel, true);
    AH.Festival.snap('home');
    renderTopbars();
    if (AH.Net.init()) {
      try { if (await AH.Net.restore()) { await enterOnline(); return; } } catch (e) { console.warn(e); }
    }
    if (AH.save.guest) show('menu'); else showAuth('login');
  })();
  window.AH_DEBUG = { get race() { return race; }, startRace, show, garage, renderer, camera, setMode: (m) => { mode = m; }, snap: (m) => AH.Festival.snap(SHOT[m || mode] || 'festival') };
})();
