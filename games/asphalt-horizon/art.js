'use strict';
// Asphalt Horizon — illustrated event artwork and the festival region map (inline SVG, no image files).
AH.Art = (() => {
  const R = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const uid = (() => { let n = 0; return (p) => p + (++n); })();

  // ---- shared pieces ----------------------------------------------------
  const sky = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const sunGlow = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".25" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const clouds = (r, n, y0, y1, op = 0.55, col = '#fff') => Array.from({ length: n }, () => {
    const x = r() * 1700 - 50, y = y0 + r() * (y1 - y0), w = 120 + r() * 260;
    return `<g opacity="${(op * (0.5 + r() * 0.5)).toFixed(2)}" fill="${col}"><ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 9}"/><ellipse cx="${x + w * 0.15}" cy="${y - w / 14}" rx="${w / 4}" ry="${w / 10}"/><ellipse cx="${x - w * 0.18}" cy="${y - w / 22}" rx="${w / 5}" ry="${w / 12}"/></g>`;
  }).join('');
  const mountains = (r, base, amp, col, n = 9, op = 1) => {
    let d = `M-20 ${base}`;
    for (let i = 0; i <= n; i++) { const x = -20 + i * (1640 / n); d += ` L${x + (r() - 0.5) * 60} ${base - amp * (0.35 + r() * 0.65)} L${x + 1640 / n / 2} ${base - amp * (0.15 + r() * 0.3)}`; }
    return `<path d="${d} L1620 ${base} L1620 900 L-20 900Z" fill="${col}" opacity="${op}"/>`;
  };
  // perspective road to a vanishing point, with dashed centre line
  const road = (vx, vy, col = '#2b2f38', edge = '#f4f1ea', bend = 0) => {
    const dash = Array.from({ length: 9 }, (_, i) => {
      const t0 = Math.pow(i / 9, 1.8), t1 = Math.pow((i + 0.45) / 9, 1.8);
      const p = (t) => [vx + (800 - vx) * t + bend * t * (1 - t), vy + (900 - vy) * t];
      const [ax, ay] = p(t0), [bx, by] = p(t1), w0 = 2 + t0 * 14, w1 = 2 + t1 * 14;
      return `<path d="M${ax - w0 / 2} ${ay} L${ax + w0 / 2} ${ay} L${bx + w1 / 2} ${by} L${bx - w1 / 2} ${by}Z" fill="${edge}" opacity=".9"/>`;
    }).join('');
    return `<path d="M${vx - 4} ${vy} Q${vx + bend * 0.5 - 200} ${vy + 260} -120 900 L1720 900 Q${vx + bend * 0.5 + 220} ${vy + 260} ${vx + 4} ${vy}Z" fill="${col}"/>
      <path d="M${vx - 4} ${vy} Q${vx + bend * 0.5 - 200} ${vy + 260} -120 900" stroke="${edge}" stroke-width="10" fill="none" opacity=".85"/>
      <path d="M${vx + 4} ${vy} Q${vx + bend * 0.5 + 220} ${vy + 260} 1720 900" stroke="${edge}" stroke-width="10" fill="none" opacity=".85"/>${dash}`;
  };
  // rear 3/4 sports car silhouette with glowing tail lights (accent colour body)
  const car = (x, y, s, body, light = '#ff2b3a') => `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="70" rx="250" ry="26" fill="#000" opacity=".45"/>
    <path d="M-230 40 C-235 0 -200 -20 -150 -28 L-95 -78 C-60 -100 60 -100 95 -78 L150 -28 C200 -20 235 0 230 40 L230 58 L-230 58Z" fill="${body}"/>
    <path d="M-88 -70 C-55 -90 55 -90 88 -70 L120 -30 L-120 -30Z" fill="#0b1220" opacity=".85"/>
    <path d="M-80 -66 C-50 -82 50 -82 80 -66" stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none"/>
    <path d="M-215 2 L-120 -8 L-118 8 L-212 18Z" fill="${light}"/><path d="M215 2 L120 -8 L118 8 L212 18Z" fill="${light}"/>
    <rect x="-130" y="-6" width="260" height="6" fill="${light}" opacity=".8"/>
    <ellipse cx="-215" cy="10" rx="70" ry="22" fill="${light}" opacity=".25"/><ellipse cx="215" cy="10" rx="70" ry="22" fill="${light}" opacity=".25"/>
    <rect x="-200" y="40" width="80" height="34" rx="10" fill="#0a0a0c"/><rect x="120" y="40" width="80" height="34" rx="10" fill="#0a0a0c"/>
    <path d="M-150 30 L150 30 L130 50 L-130 50Z" fill="#111"/><circle cx="-60" cy="44" r="9" fill="#999"/><circle cx="60" cy="44" r="9" fill="#999"/>
    <path d="M-235 -10 C-120 -40 120 -40 235 -10" stroke="#fff" stroke-opacity=".25" stroke-width="5" fill="none"/>
  </g>`;
  const grade = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".25"/><stop offset=".55" stop-color="${a}" stop-opacity="0"/><stop offset="1" stop-color="${b}" stop-opacity=".35"/></linearGradient>`;
  const wrap = (body, defs) => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

  // ---- city scenes -----------------------------------------------------
  const scenes = {
    sf() {
      const r = R(11), s = uid('s'), g = uid('g'), w = uid('w'), gr = uid('gr');
      const tower = (x, h) => `<g fill="#c8442c"><rect x="${x - 26}" y="${520 - h}" width="16" height="${h + 40}"/><rect x="${x + 10}" y="${520 - h}" width="16" height="${h + 40}"/>${[0.15, 0.4, 0.65].map(f => `<rect x="${x - 26}" y="${520 - h + h * f}" width="52" height="12"/>`).join('')}</g>`;
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="1180" cy="470" r="380" fill="url(#${g})"/><circle cx="1180" cy="470" r="62" fill="#fff4d6"/>
        ${clouds(r, 9, 120, 380, 0.5, '#ffe2c4')}
        ${mountains(r, 520, 140, '#7d5a8c', 8, 0.75)}${mountains(r, 535, 80, '#5b4675', 11, 0.9)}
        <rect y="520" width="1600" height="380" fill="url(#${w})"/>
        ${Array.from({ length: 26 }, () => `<rect x="${r() * 1600}" y="${530 + r() * 90}" width="${40 + r() * 120}" height="2" fill="#ffd9a8" opacity=".55"/>`).join('')}
        <path d="M-50 470 Q320 600 690 360 Q1000 600 1650 470" stroke="#c8442c" stroke-width="7" fill="none"/>
        <path d="M-50 500 L1650 500" stroke="#b33a26" stroke-width="22"/>
        ${Array.from({ length: 60 }, (_, i) => { const x = -50 + i * 29; const y = x < 690 ? 470 + (x + 50) / 740 * 0 : 0; return ''; }).join('')}
        ${tower(300, 300)}${tower(1080, 300)}
        <path d="M274 222 Q690 520 1054 222" stroke="#c8442c" stroke-width="6" fill="none"/><path d="M326 222 Q690 520 1106 222" stroke="#c8442c" stroke-width="6" fill="none"/>
        ${Array.from({ length: 34 }, (_, i) => { const x = 300 + i * 23; const t = (x - 300) / 780; const y = 222 + 4 * 150 * t * (1 - t) * 0.98; return `<line x1="${x}" y1="${y}" x2="${x}" y2="492" stroke="#c8442c" stroke-width="2" opacity=".8"/>`; }).join('')}
        <path d="M0 560 Q400 520 900 600 T1600 560 L1600 900 L0 900Z" fill="#e8c38a" opacity=".9"/>
        ${road(820, 560, '#30343d', '#f6efe2', -180)}
        ${car(800, 760, 0.62, '#1b2a6b')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#3e4e9c'], [0.45, '#f28a5a'], [0.62, '#ffd09a']]) + sunGlow(g, '#ffc27a') + sky(w, [[0, '#f6a36c'], [0.3, '#2c5a86'], [1, '#13314f']]) + grade(gr, '#ff6aa0', '#1a2a6b'));
    },
    ny() {
      const r = R(23), s = uid('s'), gr = uid('gr');
      const towers = Array.from({ length: 34 }, (_, i) => { const w = 50 + r() * 60, x = i * 48 - 40 + r() * 20, h = 160 + r() * 330; return { x, w, h }; });
      const win = (t) => Array.from({ length: Math.floor(t.h / 22) * Math.floor(t.w / 16) }, (_, k) => { const cols = Math.floor(t.w / 16); const cx = t.x + 6 + (k % cols) * 16, cy = 600 - t.h + 10 + Math.floor(k / cols) * 22; return r() < 0.45 ? `<rect x="${cx}" y="${cy}" width="7" height="10" fill="${r() < 0.8 ? '#ffd27a' : '#8fd4ff'}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>` : ''; }).join('');
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        ${Array.from({ length: 140 }, () => `<circle cx="${r() * 1600}" cy="${r() * 380}" r="${(r() * 1.6 + 0.4).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`).join('')}
        <circle cx="300" cy="170" r="54" fill="#f4f0ff" opacity=".9"/>
        <g fill="#1a1838">${towers.map(t => `<rect x="${t.x}" y="${600 - t.h}" width="${t.w}" height="${t.h + 10}"/>`).join('')}</g>
        ${towers.map(win).join('')}
        <g fill="#2a2754"><rect x="700" y="130" width="120" height="480"/><rect x="725" y="80" width="70" height="60"/><rect x="745" y="40" width="30" height="50"/><rect x="757" y="-30" width="6" height="80"/></g>
        <rect x="700" y="150" width="120" height="10" fill="#ff3a8a"/><rect x="725" y="96" width="70" height="8" fill="#5fe1ff"/>
        <g fill="#2f2c5c"><rect x="1080" y="200" width="100" height="410"/><path d="M1080 200 L1130 60 L1180 200Z"/><path d="M1095 200 L1130 100 L1165 200" fill="none" stroke="#ffe7a8" stroke-width="3"/><path d="M1105 200 L1130 130 L1155 200" fill="none" stroke="#ffe7a8" stroke-width="3"/><rect x="1128" y="10" width="4" height="60"/></g>
        <g transform="translate(150 470)" fill="#5fb59a"><rect x="-26" y="40" width="52" height="90" fill="#8b8270"/><path d="M-16 40 L-12 -40 L12 -40 L16 40Z"/><circle cx="0" cy="-52" r="12"/><path d="M8 -50 L28 -118 L36 -116 L18 -48Z"/><circle cx="32" cy="-128" r="9" fill="#ffc94a"/><circle cx="32" cy="-128" r="30" fill="#ffc94a" opacity=".25"/></g>
        ${[['NITRO COLA', '#ff2d87', 420, 330], ['HORIZON', '#1fd1f9', 960, 300], ['SPEED 24/7', '#ffd23f', 1300, 360]].map(([t, c, x, y]) => `<g><rect x="${x}" y="${y}" width="170" height="64" fill="#0b0a1c" stroke="${c}" stroke-width="4"/><text x="${x + 85}" y="${y + 42}" font-family="Archivo, Arial" font-weight="800" font-style="italic" font-size="26" fill="${c}" text-anchor="middle">${t}</text><rect x="${x - 10}" y="${y - 10}" width="190" height="84" fill="${c}" opacity=".12"/></g>`).join('')}
        ${road(800, 600, '#191a2a', '#f1f1ff', 120)}
        <path d="M0 640 L520 600 L520 900 L0 900Z" fill="#ff2d87" opacity=".08"/><path d="M1600 640 L1080 600 L1080 900 L1600 900Z" fill="#1fd1f9" opacity=".08"/>
        ${car(800, 770, 0.62, '#ffc915')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#05061a'], [0.55, '#2a1b5a'], [0.75, '#6b2a6b']]) + grade(gr, '#6a3cff', '#ff2d87'));
    },
    waw() {
      const r = R(37), s = uid('s'), gr = uid('gr'), rv = uid('rv');
      const pal = ['#e8b04a', '#d2604a', '#7fae8a', '#e6d27a', '#9bb6d6', '#f0a878', '#c8746a', '#f2e0b0'];
      const houses = Array.from({ length: 22 }, (_, i) => { const w = 58 + r() * 22, x = -20 + i * 76, h = 150 + r() * 70, c = pal[Math.floor(r() * pal.length)]; return `<g><rect x="${x}" y="${720 - h}" width="${w}" height="${h + 40}" fill="${c}"/><path d="M${x - 4} ${720 - h} L${x + w / 2} ${720 - h - 46} L${x + w + 4} ${720 - h}Z" fill="#9a3a28"/>${Array.from({ length: 6 }, (_, k) => `<rect x="${x + 10 + (k % 2) * (w - 30)}" y="${720 - h + 20 + Math.floor(k / 2) * 42}" width="12" height="22" fill="#2f3b4a" opacity=".75"/>`).join('')}</g>`; }).join('');
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="1300" cy="150" r="70" fill="#fff8e0" opacity=".9"/><circle cx="1300" cy="150" r="200" fill="#fff4cc" opacity=".25"/>
        ${clouds(r, 10, 80, 330, 0.85)}
        <g fill="#cfc0a0"><rect x="640" y="380" width="320" height="300"/><rect x="700" y="260" width="200" height="140"/><rect x="740" y="180" width="120" height="100"/><rect x="765" y="120" width="70" height="80"/><rect x="785" y="70" width="30" height="60"/><path d="M790 70 L800 -20 L810 70Z"/><rect x="798" y="-60" width="4" height="50" fill="#c9a24a"/>
        <rect x="610" y="520" width="380" height="160"/><rect x="560" y="600" width="480" height="80"/></g>
        ${Array.from({ length: 44 }, (_, k) => `<rect x="${652 + (k % 11) * 28}" y="${400 + Math.floor(k / 11) * 60}" width="10" height="30" fill="#8a7a5a" opacity=".6"/>`).join('')}
        <circle cx="800" cy="215" r="16" fill="#f6efe0" stroke="#8a7a5a" stroke-width="3"/>
        <path d="M0 640 Q500 610 1600 650 L1600 900 L0 900Z" fill="url(#${rv})"/>
        ${houses}
        <g transform="translate(1250 520)"><rect x="-16" y="120" width="32" height="40" fill="#9e9a90"/><rect x="-6" y="-80" width="12" height="200" fill="#b06b5a"/><rect x="-10" y="-96" width="20" height="16" fill="#d8d0c0"/><path d="M-4 -96 L0 -128 L4 -96Z" fill="#6b5a3a"/></g>
        ${road(800, 640, '#3a3d44', '#f8f6ef', -80)}
        ${car(800, 770, 0.62, '#e3203a')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#2a72d8'], [0.6, '#8cc4f5'], [0.8, '#e2f0fd']]) + sky(rv, [[0, '#5d8fbf'], [1, '#2f5f8a']]) + grade(gr, '#ffffff', '#e3203a'));
    },
    rome() {
      const r = R(53), s = uid('s'), g = uid('g'), gr = uid('gr');
      const arches = (y, n, w, h) => Array.from({ length: n }, (_, i) => { const x = 360 + i * (880 / n); return `<path d="M${x + 6} ${y + h} L${x + 6} ${y + h * 0.45} Q${x + w / 2} ${y} ${x + w - 6} ${y + h * 0.45} L${x + w - 6} ${y + h}Z" fill="#7a4a22" opacity=".75"/>`; }).join('');
      const cypress = (x, y, h) => `<path d="M${x} ${y} C${x - 14} ${y - h * 0.4} ${x - 8} ${y - h * 0.85} ${x} ${y - h} C${x + 8} ${y - h * 0.85} ${x + 14} ${y - h * 0.4} ${x} ${y}Z" fill="#2e4628"/>`;
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="300" cy="420" r="420" fill="url(#${g})"/><circle cx="300" cy="420" r="70" fill="#fff1c8"/>
        ${clouds(r, 8, 100, 330, 0.55, '#ffe8c0')}
        ${mountains(r, 560, 110, '#c9906a', 9, 0.6)}
        <path d="M340 600 L340 300 Q800 210 1260 300 L1260 600Z" fill="#dcb77e"/>
        <path d="M1260 300 Q1300 320 1300 360 L1300 600 L1260 600Z" fill="#c69f68"/>
        ${arches(330, 18, 46, 70)}${arches(420, 18, 46, 74)}${arches(510, 18, 46, 80)}
        <path d="M340 300 Q800 210 1260 300" stroke="#efd7a6" stroke-width="10" fill="none"/>
        <path d="M1160 290 L1200 260 L1260 300 L1260 340 L1180 320Z" fill="#f7e5bd"/>
        ${[120, 180, 1380, 1450, 1520, 240].map((x, i) => cypress(x, 640, 220 + (i % 3) * 40)).join('')}
        <g fill="#3d5a30"><ellipse cx="60" cy="520" rx="110" ry="40"/><rect x="54" y="520" width="12" height="110" fill="#5a4030"/></g>
        ${road(800, 640, '#4a4240', '#fbf0de', 160)}
        ${car(800, 770, 0.62, '#16c96a')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#5a86c8'], [0.5, '#f5bf78'], [0.7, '#ffe3b0']]) + sunGlow(g, '#ffcf86') + grade(gr, '#ffb04a', '#7a2f1c'));
    },
    paris() {
      const r = R(71), s = uid('s'), gr = uid('gr'), et = uid('et');
      const lattice = Array.from({ length: 26 }, (_, i) => { const y = 120 + i * 18, hw = i < 8 ? 10 + i * 3 : i < 16 ? 34 + (i - 8) * 6 : 82 + (i - 16) * 14; return `<line x1="${800 - hw}" y1="${y}" x2="${800 + hw}" y2="${y + 18}" stroke="#ffd27a" stroke-width="1.5" opacity=".7"/><line x1="${800 + hw}" y1="${y}" x2="${800 - hw}" y2="${y + 18}" stroke="#ffd27a" stroke-width="1.5" opacity=".7"/>`; }).join('');
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        ${Array.from({ length: 70 }, () => `<circle cx="${r() * 1600}" cy="${r() * 300}" r="${(r() * 1.4 + 0.3).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`).join('')}
        ${clouds(r, 7, 200, 420, 0.35, '#ffb3a0')}
        <path d="M800 40 L806 120 L840 340 L900 470 L960 620 L910 620 C880 560 850 530 800 530 C750 530 720 560 690 620 L640 620 L700 470 L760 340 L794 120Z" fill="url(#${et})"/>
        ${lattice}
        <rect x="740" y="330" width="120" height="14" fill="#5e4330"/><rect x="772" y="200" width="56" height="10" fill="#5e4330"/>
        ${Array.from({ length: 90 }, () => { const y = 80 + r() * 520, f = (y - 40) / 580, hw = 8 + f * f * 150; return `<circle cx="${800 + (r() * 2 - 1) * hw}" cy="${y}" r="1.8" fill="#fff6d0" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`; }).join('')}
        <path d="M800 50 L-40 20 L-40 60Z" fill="#fff1c0" opacity=".08"/><path d="M800 50 L1640 90 L1640 130Z" fill="#fff1c0" opacity=".08"/>
        <g fill="#3a2f5a">${Array.from({ length: 16 }, (_, i) => { const x = i * 104 - 30, h = 120 + r() * 50; return `<rect x="${x}" y="${640 - h}" width="96" height="${h + 20}"/><path d="M${x} ${640 - h} L${x + 12} ${640 - h - 26} L${x + 84} ${640 - h - 26} L${x + 96} ${640 - h}Z" fill="#4a5070"/>${Array.from({ length: 8 }, (_, k) => `<rect x="${x + 10 + (k % 4) * 22}" y="${640 - h + 16 + Math.floor(k / 4) * 40}" width="10" height="18" fill="#ffd9a0" opacity="${r() < 0.6 ? 0.85 : 0.2}"/>`).join('')}`; }).join('')}</g>
        <g transform="translate(1330 420)" fill="#e8dcc8"><rect x="-90" y="0" width="40" height="220"/><rect x="50" y="0" width="40" height="220"/><rect x="-100" y="-50" width="200" height="60"/><rect x="-104" y="-58" width="208" height="12"/></g>
        ${road(800, 650, '#262537', '#f3eef8', -140)}
        ${car(800, 770, 0.62, '#8a2bff')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#141a46'], [0.45, '#6b4a8e'], [0.72, '#ff9c7c']]) + sky(et, [[0, '#d99a4a'], [1, '#6b4a2a']]) + grade(gr, '#ff9c7c', '#24205a'));
    },
    rio() {
      const r = R(19), s = uid('s'), sea = uid('sea'), gr = uid('gr'), g = uid('g');
      const towers = Array.from({ length: 22 }, (_, i) => { const x = 380 + i * 52, h = 90 + r() * 120; return `<rect x="${x}" y="${620 - h}" width="46" height="${h}" fill="${['#f4f1ea', '#e2ecf0', '#f2e6c8'][i % 3]}"/>${Array.from({ length: Math.floor(h / 22) }, (_, k) => `<rect x="${x + 4}" y="${620 - h + 6 + k * 22}" width="38" height="5" fill="#9ab8c8" opacity=".7"/>`).join('')}`; }).join('');
      const palm = (x, y, h) => `<path d="M${x} ${y} Q${x + 10} ${y - h / 2} ${x + 4} ${y - h}" stroke="#7a5a3a" stroke-width="8" fill="none"/>${[-60, -20, 20, 60, 100, 140].map(a => `<path d="M${x + 4} ${y - h} q${Math.cos(a * Math.PI / 180) * 60} ${-Math.sin(a * Math.PI / 180) * 30 - 10} ${Math.cos(a * Math.PI / 180) * 90} ${Math.abs(Math.cos(a * Math.PI / 180)) * 30}" stroke="#2f7a3a" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')}`;
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="1250" cy="230" r="300" fill="url(#${g})"/>
        ${clouds(r, 6, 90, 260, 0.6)}
        <path d="M0 520 C120 520 170 240 260 230 C330 225 360 470 420 520Z" fill="#4f6a4a"/>
        <path d="M1080 520 C1130 520 1170 260 1240 250 C1300 245 1330 470 1400 520Z" fill="#5f7466"/>
        <path d="M1380 520 C1420 380 1470 330 1530 330 C1580 340 1600 430 1620 520Z" fill="#6a7a6a"/>
        <path d="M600 520 C660 300 720 170 800 160 C880 170 940 300 1000 520Z" fill="#3f6a3a"/>
        <g fill="#f4f1ea" transform="translate(800 120)"><rect x="-6" y="0" width="12" height="44"/><rect x="-46" y="10" width="92" height="9"/><circle cx="0" cy="-6" r="7"/><rect x="-10" y="44" width="20" height="8"/></g>
        <path d="M0 520 L1600 520 L1600 610 L0 610Z" fill="url(#${sea})"/>
        ${Array.from({ length: 14 }, () => `<path d="M${r() * 1600} ${540 + r() * 60} q20 -6 40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>`).join('')}
        <path d="M0 610 Q800 570 1600 610 L1600 660 L0 660Z" fill="#f2dfae"/>
        ${towers}
        ${palm(140, 700, 260)}${palm(1450, 700, 280)}${palm(1300, 690, 200)}
        <path d="M0 660 L1600 660 L1600 700 L0 700Z" fill="#f2efe8"/>
        ${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 80} 680 q20 -14 40 0 t40 0" stroke="#1c1c1c" stroke-width="6" fill="none"/>`).join('')}
        ${road(800, 660, '#33363e', '#f8f6ef', 120)}
        ${car(800, 770, 0.62, '#ffd23f')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#1f7fe0'], [0.5, '#7cc8f5'], [0.58, '#e6f7ff']]) + sky(sea, [[0, '#2ab0d0'], [1, '#1f8fb0']]) + sunGlow(g, '#fff4c8') + grade(gr, '#ffd23f', '#0a6b3a'));
    },
    bcn() {
      const r = R(23), s = uid('s'), gr = uid('gr'), g = uid('g');
      const spire = (x, b, h, w) => `<path d="M${x - w} ${b} L${x - w * 0.3} ${b - h} Q${x} ${b - h - w * 1.4} ${x + w * 0.3} ${b - h} L${x + w} ${b}Z" fill="#c9b48a"/>${Array.from({ length: Math.floor(h / 26) }, (_, k) => `<circle cx="${x}" cy="${b - 14 - k * 26}" r="${w * 0.25}" fill="#8a7454"/>`).join('')}<circle cx="${x}" cy="${b - h - w * 0.9}" r="${w * 0.5}" fill="#d94f3a"/>`;
      const blocks = Array.from({ length: 14 }, (_, i) => { const x = i * 120 - 20, h = 150 + r() * 40; return `<path d="M${x} 640 L${x} ${640 - h} L${x + 20} ${620 - h} L${x + 92} ${620 - h} L${x + 112} ${640 - h} L${x + 112} 640Z" fill="${['#e8d2a8', '#dcc49a', '#f0e0c0'][i % 3]}"/>${Array.from({ length: 10 }, (_, k) => `<rect x="${x + 10 + (k % 5) * 20}" y="${650 - h + Math.floor(k / 5) * 50}" width="10" height="26" fill="#6a5040" opacity=".7"/><rect x="${x + 6 + (k % 5) * 20}" y="${676 - h + Math.floor(k / 5) * 50}" width="18" height="4" fill="#3a3a3a"/>`).join('')}`; }).join('');
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="300" cy="300" r="320" fill="url(#${g})"/>
        ${clouds(r, 6, 80, 280, 0.5, '#fff0d8')}
        ${mountains(r, 520, 90, '#9a8a6a', 8, 0.55)}
        <g>${spire(640, 520, 230, 18)}${spire(700, 520, 250, 18)}${spire(900, 520, 250, 18)}${spire(960, 520, 230, 18)}${spire(800, 520, 380, 30)}${spire(740, 520, 300, 20)}${spire(860, 520, 300, 20)}
        <rect x="600" y="440" width="400" height="90" fill="#b8a27a"/><path d="M1040 200 L1046 520 M1040 200 L1180 200" stroke="#f2c230" stroke-width="7"/></g>
        <path d="M1280 520 C1280 380 1300 300 1330 300 C1360 300 1380 380 1380 520Z" fill="#4a8ad0" opacity=".9"/>
        ${blocks}
        ${road(800, 650, '#3a3a40', '#f8f6ef', -100)}
        ${car(800, 770, 0.62, '#c0392b')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#3a86d8'], [0.5, '#9fd0f4'], [0.7, '#ffe6c2']]) + sunGlow(g, '#ffd890') + grade(gr, '#ffb347', '#c0392b'));
    },
    milan() {
      const r = R(29), s = uid('s'), gr = uid('gr');
      const spires = Array.from({ length: 40 }, (_, i) => { const x = 420 + i * 19, b = i % 5 ? 420 : 380; return `<path d="M${x - 4} ${b} L${x} ${b - 40 - (i % 3) * 10} L${x + 4} ${b}Z" fill="#f4efe4"/>`; }).join('');
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        ${clouds(r, 7, 90, 280, 0.5)}
        <g fill="#a7b4c2" opacity=".7"><rect x="1200" y="230" width="70" height="300"/><path d="M1300 530 L1300 260 Q1360 220 1400 280 L1400 530Z"/><rect x="1440" y="300" width="60" height="230"/></g>
        <path d="M400 640 L400 420 L1200 420 L1200 640Z" fill="#f1ece2"/>
        <path d="M600 420 L800 300 L1000 420Z" fill="#e8ded0"/>
        ${spires}
        <rect x="790" y="180" width="20" height="120" fill="#f1ece2"/><path d="M790 180 L800 110 L810 180Z" fill="#f1ece2"/><circle cx="800" cy="104" r="8" fill="#e8b84a"/>
        ${Array.from({ length: 5 }, (_, i) => `<path d="M${470 + i * 150} 640 L${470 + i * 150} 520 Q${510 + i * 150} 470 ${550 + i * 150} 520 L${550 + i * 150} 640Z" fill="#6a5a4a"/>`).join('')}
        <path d="M0 640 L0 560 L300 560 L300 640Z" fill="#e8c47a"/><path d="M1300 640 L1300 570 L1600 570 L1600 640Z" fill="#d8a86a"/>
        ${road(800, 660, '#5a5550', '#f8f6ef', 60)}
        ${car(800, 770, 0.62, '#f3d27a')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#5f8fd0'], [0.5, '#c4d8ec'], [0.7, '#f6e4c6']]) + grade(gr, '#f3d27a', '#5a4a8a'));
    },
    msk() {
      const r = R(37), s = uid('s'), gr = uid('gr');
      const onion = (x, b, h, w, c1, c2) => `<rect x="${x - w * 0.6}" y="${b - h}" width="${w * 1.2}" height="${h}" fill="#c8584a"/><path d="M${x - w} ${b - h} C${x - w * 1.3} ${b - h - w * 1.2} ${x - w * 0.2} ${b - h - w * 1.6} ${x} ${b - h - w * 2.4} C${x + w * 0.2} ${b - h - w * 1.6} ${x + w * 1.3} ${b - h - w * 1.2} ${x + w} ${b - h}Z" fill="${c1}"/><path d="M${x - w * 0.5} ${b - h - w * 0.3} L${x} ${b - h - w * 2.2} M${x + w * 0.5} ${b - h - w * 0.3} L${x} ${b - h - w * 2.2}" stroke="${c2}" stroke-width="7"/><rect x="${x - 2}" y="${b - h - w * 2.4 - 24}" width="4" height="24" fill="#e8b84a"/>`;
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        ${clouds(r, 9, 80, 300, 0.7)}
        <g fill="#8fa8c8" opacity=".7"><path d="M1260 520 L1270 160 L1300 140 L1310 520Z"/><path d="M1330 520 L1340 200 L1380 190 L1390 520Z"/><path d="M1410 520 L1420 260 L1450 250 L1460 520Z"/></g>
        <rect x="0" y="520" width="1600" height="120" fill="#a83226"/>
        ${Array.from({ length: 80 }, (_, i) => `<path d="M${i * 20} 520 l0 -14 l6 -6 l6 6 l0 14Z" fill="#a83226"/>`).join('')}
        <rect x="150" y="300" width="70" height="230" fill="#a83226"/><path d="M140 300 L185 200 L230 300Z" fill="#2f5a3a"/><path d="M185 170 l8 14 l16 2 l-12 10 l4 16 l-16 -8 l-16 8 l4 -16 l-12 -10 l16 -2Z" fill="#ff2020"/>
        ${onion(800, 520, 140, 34, '#d9433a', '#3a8a4a')}${onion(700, 520, 70, 26, '#2f6ab8', '#f2efe6')}${onion(900, 520, 70, 26, '#f2c230', '#2f8a6a')}${onion(620, 520, 40, 20, '#3a8a4a', '#d9433a')}${onion(980, 520, 40, 20, '#e86a3a', '#f2c230')}
        <path d="M0 640 L1600 640 L1600 680 L0 680Z" fill="#eef2f6"/>
        ${Array.from({ length: 120 }, () => `<circle cx="${r() * 1600}" cy="${r() * 900}" r="${(1 + r() * 2.5).toFixed(1)}" fill="#fff" opacity=".8"/>`).join('')}
        ${road(800, 660, '#4a4e58', '#ffffff', -60)}
        ${car(800, 770, 0.62, '#a3222a')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#5f88c4'], [0.5, '#bcd2ea'], [0.7, '#eef3fa']]) + grade(gr, '#e8f1fa', '#a3222a'));
    },
    cairo() {
      const r = R(41), s = uid('s'), gr = uid('gr'), g = uid('g'), sd = uid('sd');
      const pyr = (x, b, w, c1, c2) => `<path d="M${x - w} ${b} L${x} ${b - w * 0.64} L${x + w * 0.3} ${b}Z" fill="${c1}"/><path d="M${x} ${b - w * 0.64} L${x + w} ${b} L${x + w * 0.3} ${b}Z" fill="${c2}"/>`;
      const palm = (x, y, h) => `<path d="M${x} ${y} Q${x - 8} ${y - h / 2} ${x} ${y - h}" stroke="#7a5a3a" stroke-width="7" fill="none"/>${[-40, 0, 40, 140, 180, 220].map(a => `<path d="M${x} ${y - h} q${Math.cos(a * Math.PI / 180) * 50} ${-Math.sin(a * Math.PI / 180) * 20 - 14} ${Math.cos(a * Math.PI / 180) * 80} 24" stroke="#4a7a2a" stroke-width="9" fill="none" stroke-linecap="round"/>`).join('')}`;
      return wrap(`<rect width="1600" height="900" fill="url(#${s})"/>
        <circle cx="1100" cy="380" r="360" fill="url(#${g})"/><circle cx="1100" cy="380" r="64" fill="#fff0c8"/>
        <path d="M0 560 Q400 520 800 545 T1600 540 L1600 900 L0 900Z" fill="url(#${sd})"/>
        ${pyr(420, 560, 300, '#e0bd80', '#b8925a')}${pyr(900, 560, 260, '#d9b57a', '#ae8850')}${pyr(1240, 560, 140, '#d2ac70', '#a8824a')}
        <path d="M580 600 L580 570 L640 560 L660 540 L690 540 L700 570 L760 575 L760 600Z" fill="#c8a060"/>
        <rect x="0" y="600" width="1600" height="40" fill="#2f6f7a"/>
        ${palm(140, 690, 220)}${palm(260, 680, 180)}${palm(1400, 690, 240)}${palm(1500, 680, 170)}
        ${road(800, 650, '#5a4a3a', '#fbf0de', 140)}
        ${car(800, 770, 0.62, '#ffcf7a')}
        <rect width="1600" height="900" fill="url(#${gr})"/>`,
        sky(s, [[0, '#3f7fd0'], [0.45, '#f0c98a'], [0.62, '#ffe2b0']]) + sky(sd, [[0, '#e8c48a'], [1, '#c89a5a']]) + sunGlow(g, '#ffd890') + grade(gr, '#ffcf7a', '#b3541e'));
    },
  };
  const cache = {};
  const city = (id) => cache[id] || (cache[id] = scenes[id] ? scenes[id]() : '');

  // ---- festival region map ----------------------------------------------
  // Pins (0-1000 x 0-1000) for the five festival zones; HQ in the middle.
  const PINS = { sf: [215, 470], rio: [290, 650], bcn: [380, 830], ny: [820, 330], waw: [540, 250], milan: [640, 400], rome: [480, 740], msk: [700, 170], cairo: [760, 760], paris: [880, 560], hq: [520, 500] };
  function map() {
    const r = R(97), oc = uid('oc'), ld = uid('ld'), mt = uid('mt');
    const land = 'M150 330 C120 220 260 120 420 140 C520 90 690 80 820 150 C930 170 980 270 930 360 C990 450 960 560 900 640 C930 740 820 860 680 840 C580 900 420 880 360 800 C250 790 140 700 160 600 C90 520 100 420 150 330Z';
    const trees = Array.from({ length: 160 }, () => { const x = 560 + r() * 260, y = 120 + r() * 160; return `<circle cx="${x}" cy="${y}" r="${(5 + r() * 6).toFixed(1)}" fill="${r() < 0.5 ? '#3f8a3a' : '#2f6e30'}"/>`; }).join('')
      + Array.from({ length: 90 }, () => { const x = 300 + r() * 160, y = 600 + r() * 140; return `<circle cx="${x}" cy="${y}" r="${(4 + r() * 5).toFixed(1)}" fill="${r() < 0.5 ? '#5a9a3a' : '#3e7a2e'}"/>`; }).join('');
    const peaks = Array.from({ length: 16 }, (_, i) => { const x = 300 + (i % 8) * 34 + r() * 20, y = 210 + Math.floor(i / 8) * 46 + r() * 20, h = 50 + r() * 40; return `<path d="M${x - h * 0.6} ${y + h * 0.5} L${x} ${y - h * 0.5} L${x + h * 0.6} ${y + h * 0.5}Z" fill="url(#${mt})"/><path d="M${x - h * 0.18} ${y - h * 0.2} L${x} ${y - h * 0.5} L${x + h * 0.18} ${y - h * 0.2} L${x + 6} ${y - h * 0.14} L${x} ${y - h * 0.22}Z" fill="#fff"/>`; }).join('');
    const dunes = Array.from({ length: 14 }, (_, i) => `<path d="M${660 + (i % 4) * 60} ${700 + Math.floor(i / 4) * 34} q30 -18 60 0" stroke="#d58a3a" stroke-width="5" fill="none" opacity=".6"/>`).join('');
    const MAIN = ['sf', 'rio', 'bcn', 'ny', 'waw', 'milan', 'rome', 'msk', 'cairo', 'paris'];
    const roads = [...MAIN.map(id => ['hq', id]), ...MAIN.slice(1).map((id, k) => [MAIN[k], id])].map(([a, b], i) => {
      const [x1, y1] = PINS[a], [x2, y2] = PINS[b], mx = (x1 + x2) / 2 + (i % 2 ? 40 : -40), my = (y1 + y2) / 2 + (i % 3 ? -30 : 30);
      return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#fff" stroke-width="${i < 10 ? 9 : 6}" fill="none" stroke-linecap="round" opacity=".95"/><path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#f2b23a" stroke-width="${i < 10 ? 3 : 2}" fill="none" stroke-dasharray="${i < 10 ? '0' : '10 10'}" opacity=".9"/>`;
    }).join('');
    const waves = Array.from({ length: 60 }, () => { const x = r() * 1000, y = r() * 1000; return `<path d="M${x} ${y} q8 -6 16 0 t16 0" stroke="#fff" stroke-width="2" fill="none" opacity=".25"/>`; }).join('');
    return `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" class="worldmap" aria-label="Mapa regionu festiwalu">
      <defs>${sky(oc, [[0, '#2fb6d6'], [1, '#1576a8']])}${sky(ld, [[0, '#9fd068'], [1, '#6fae4a']])}${sky(mt, [[0, '#9a8f86'], [1, '#6a5f58']])}
        <filter id="sh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#06304a" flood-opacity=".45"/></filter></defs>
      <rect width="1000" height="1000" fill="url(#${oc})"/>${waves}
      <path d="${land}" fill="#f3dfa6" transform="translate(500 500) scale(1.035) translate(-500 -500)" filter="url(#sh)"/>
      <path d="${land}" fill="url(#${ld})"/>
      <path d="M640 660 C700 640 820 660 860 720 C840 790 740 810 680 790 C640 760 620 700 640 660Z" fill="#f0c27a"/>${dunes}
      <ellipse cx="640" cy="470" rx="48" ry="30" fill="#3fa6d0"/><path d="M640 440 C600 380 560 330 520 260" stroke="#3fa6d0" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M560 150 C600 90 760 80 820 150 C840 200 790 240 720 235 C640 240 570 215 560 150Z" fill="#f4f8fc" opacity=".95"/>
      ${Array.from({ length: 30 }, () => `<circle cx="${590 + r() * 200}" cy="${120 + r() * 100}" r="${(3 + r() * 4).toFixed(1)}" fill="#2f5a40"/><circle cx="${590 + r() * 200}" cy="${120 + r() * 100}" r="2" fill="#fff"/>`).join('')}
      ${trees}${peaks}
      <path d="M215 470 C180 470 140 470 110 480" stroke="#c8442c" stroke-width="6"/><rect x="150" y="456" width="6" height="22" fill="#c8442c"/><rect x="128" y="458" width="6" height="22" fill="#c8442c"/>
      ${roads}
      <g transform="translate(${PINS.hq[0]} ${PINS.hq[1]})"><circle r="34" fill="#ff2d87" opacity=".25"/><circle r="22" fill="#ff2d87" stroke="#fff" stroke-width="5"/><path d="M-9 -7 L9 -7 L5 9 L-5 9Z" fill="#fff"/><text y="54" text-anchor="middle" class="maplbl hq">FESTIWAL</text></g>
      <g transform="translate(905 905)" opacity=".85"><circle r="34" fill="none" stroke="#fff" stroke-width="3"/><path d="M0 -30 L8 0 L0 30 L-8 0Z" fill="#fff"/><text y="-40" text-anchor="middle" class="maplbl">N</text></g>
      <text x="60" y="80" class="maptitle">WYBRZEŻE HORIZON</text>
    </svg>`;
  }
  return { city, map, PINS };
})();
