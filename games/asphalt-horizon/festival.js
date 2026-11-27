'use strict';
// Asphalt Horizon — the open-world festival scene behind every menu.
// Golden-hour coast: sea, beach, palms, hills and mountains, a coastal road with the player's car,
// and the festival grounds (entrance arch, Ferris wheel, tents, flags, stage, parked cars).
AH.Festival = (() => {
  const F = { scene: new THREE.Scene(), car: null, t: 0, orbit: 0.75, dragging: false, ready: false, anim: [] };
  const S = F.scene;
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: lin(c), roughness: 0.85, metalness: 0.02 }, o));

  // ---------- noise ----------
  const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, z, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, z * f); f *= 2.03; a *= 0.5; } return s; };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- world layout ----------
  const roadZ = (x) => 5 * Math.sin(x * 0.005) + 3 * Math.sin(x * 0.013);
  const shoreZ = (x) => -48 + 16 * Math.sin(x * 0.006) + 8 * Math.sin(x * 0.019 + 1);
  const ROAD_Y = 1.3;
  const FEST = { x0: -175, x1: -35, z0: 22, z1: 125 };
  function height(x, z) {
    const d = z - shoreZ(x);
    let h;
    if (d < 0) h = Math.max(-9, d * 0.18);
    else {
      h = Math.min(d * 0.055, 1.6);                                          // beach
      h += (fbm(x * 0.0045, z * 0.0045) - 0.35) * 46 * sm(35, 220, d);          // hills
      const ridge = 1 - Math.abs(fbm(x * 0.0016 + 7, z * 0.0016 + 3) * 2 - 1);
      h += Math.pow(ridge, 2.2) * 330 * sm(260, 820, d);                        // mountains
    }
    // flatten road corridor and festival grounds
    const dr = Math.abs(z - roadZ(x));
    h = h + (ROAD_Y - 0.05 - h) * (1 - sm(9, 30, dr));
    const inF = Math.min(sm(FEST.x0 - 30, FEST.x0, x), 1 - sm(FEST.x1, FEST.x1 + 30, x), sm(FEST.z0 - 25, FEST.z0, z), 1 - sm(FEST.z1, FEST.z1 + 30, z));
    h = h + (1.4 - h) * inF;
    return h;
  }

  function build(makeEnvMap) {
    // sky + fog + light
    const SKY = { top: '#2c6cc4', mid: '#8ec4ef', bot: '#ffd9a6', sun: '#ffcf8a' };
    const sunDir = new THREE.Vector3(-0.62, 0.16, -0.77).normalize();
    S.fog = new THREE.Fog(lin('#f3c9a0'), 260, 2600);
    const skyM = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(SKY.top) }, mid: { value: new THREE.Color(SKY.mid) }, bot: { value: new THREE.Color(SKY.bot) }, sunDir: { value: sunDir }, sunCol: { value: new THREE.Color(SKY.sun) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, mid, bot, sunDir, sunCol; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = mix(bot, mid, smoothstep(-0.02, 0.22, h)); c = mix(c, top, smoothstep(0.22, 0.75, h));
        float sd = max(dot(normalize(vP), sunDir), 0.0); c += sunCol * (pow(sd, 600.0) * 4.0 + pow(sd, 18.0) * 0.45 + pow(sd, 3.0) * 0.12);
        gl_FragColor = vec4(c, 1.0); }`,
    });
    F.sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyM); S.add(F.sky);
    F.env = makeEnvMap(SKY.top, SKY.mid, '#c9a27a', [{ w: 30, h: 14, c: 0xfff0d0, pos: sunDir.clone().multiplyScalar(90).toArray() }, { w: 80, h: 30, c: 0xcfe6ff, pos: [0, 90, 0] }]);
    S.environment = F.env.texture;
    S.add(new THREE.HemisphereLight(lin('#bfe0ff'), lin('#8a7a52'), 0.95));
    const sun = F.sun = new THREE.DirectionalLight(lin('#ffd9a8'), 2.6);
    sun.position.copy(sunDir).multiplyScalar(80); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 200;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    S.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(lin('#cfe2ff'), 0.9); fill.position.set(30, 25, 40); S.add(fill);

    // clouds
    const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cg = cc.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = 24 + Math.random() * 80, y = 44 + Math.random() * 40, r = 14 + Math.random() * 26; const gr = cg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128); }
    const ct = new THREE.CanvasTexture(cc);
    for (let i = 0; i < 34; i++) {
      const a = -Math.PI * 0.95 + Math.random() * Math.PI * 1.9, d = 1500 + Math.random() * 1400;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, color: lin(i % 3 ? '#fff0e0' : '#ffd8c0'), transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      sp.position.set(Math.cos(a) * d, 180 + Math.random() * 380, Math.sin(a) * d); const s = 500 + Math.random() * 700; sp.scale.set(s, s * 0.42, 1); S.add(sp);
    }

    // terrain with vertex colours
    const W = 3600, D = 2600, SX = 240, SZ = 170;
    const tg = new THREE.PlaneGeometry(W, D, SX, SZ); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, D / 2 - 700);
    const pos = tg.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const SAND = lin('#e9d2a0'), GRASS = lin('#79ae4e'), GRASS2 = lin('#a5c15a'), FOREST = lin('#3f7a3a'), ROCK = lin('#8a8178'), SNOW = lin('#f6f7fa'), WET = lin('#c9b07c');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = height(x, z); pos.setY(i, h);
      const d = z - shoreZ(x), n = fbm(x * 0.02, z * 0.02, 3);
      if (d < 2) c.copy(WET); else if (d < 26 && h < 2.2) c.copy(SAND);
      else if (h > 175 + n * 40) c.copy(SNOW);
      else if (h > 90 + n * 30) c.copy(ROCK).lerp(FOREST, sm(140, 90, h) * 0.3);
      else c.copy(GRASS).lerp(GRASS2, n).lerp(FOREST, sm(0.45, 0.62, fbm(x * 0.008 + 5, z * 0.008)) * 0.85);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    terrain.receiveShadow = true; S.add(terrain);

    // sea with moving normal map
    const nc = document.createElement('canvas'); nc.width = nc.height = 256; const ng = nc.getContext('2d'), nd = ng.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const hx = fbm(x / 32 + 0.1, y / 32, 3) - fbm(x / 32 - 0.1, y / 32, 3), hy = fbm(x / 32, y / 32 + 0.1, 3) - fbm(x / 32, y / 32 - 0.1, 3), k = (y * 256 + x) * 4;
      nd.data[k] = 128 + hx * 500; nd.data[k + 1] = 128 + hy * 500; nd.data[k + 2] = 255; nd.data[k + 3] = 255;
    }
    ng.putImageData(nd, 0, 0);
    const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(140, 70);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 4000), new THREE.MeshStandardMaterial({ color: lin('#1a8fb4'), roughness: 0.12, metalness: 0.35, normalMap: nt, normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 1.2 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -1500); S.add(sea);
    const shallow = new THREE.Mesh(new THREE.PlaneGeometry(9000, 120), new THREE.MeshBasicMaterial({ color: lin('#5fd6d0'), transparent: true, opacity: 0.35, depthWrite: false }));
    shallow.rotation.x = -Math.PI / 2; shallow.position.set(0, 0.05, -62); S.add(shallow);
    F.anim.push((t) => { nt.offset.set(t * 0.004, t * 0.002); });

    // coastal road
    {
      const pts = []; for (let x = -1600; x <= 1600; x += 8) pts.push([x, roadZ(x)]);
      const v = [], uv = [], idx = []; const HW = 6.5;
      pts.forEach(([x, z], i) => {
        const [x2, z2] = pts[Math.min(i + 1, pts.length - 1)], [x0, z0] = pts[Math.max(i - 1, 0)];
        const tx = x2 - x0, tz = z2 - z0, l = Math.hypot(tx, tz), nx = -tz / l, nz = tx / l;
        v.push(x - nx * HW, ROAD_Y, z - nz * HW, x + nx * HW, ROAD_Y, z + nz * HW); uv.push(0.12, i * 0.4, 0.88, i * 0.4);
        if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k]; ix[k] = ix[k + 1]; ix[k + 1] = t; } g.computeVertexNormals(); }
      const rt = AH.tex.road().clone(); rt.needsUpdate = true; rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
      const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.82 }));
      road.receiveShadow = true; S.add(road);
      // guard rail on the sea side
      const rail = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.35, 0.12), std('#d8dde2', { metalness: 0.6, roughness: 0.4 }), 400);
      const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), std('#8a9096'), 400);
      const d = new THREE.Object3D(); let n = 0;
      for (let x = -800; x < 800 && n < 400; x += 4) { const z = roadZ(x) - HW - 1.2, a = Math.atan2(roadZ(x + 2) - roadZ(x - 2), 4); d.position.set(x, ROAD_Y + 0.55, z); d.rotation.set(0, -a, 0); d.updateMatrix(); rail.setMatrixAt(n, d.matrix); d.position.y = ROAD_Y + 0.35; d.updateMatrix(); post.setMatrixAt(n, d.matrix); n++; }
      rail.count = post.count = n; rail.castShadow = true; S.add(rail, post);
    }

    // vegetation
    {
      const palms = [], pines = [], round = [], rocks = [];
      const r = AH.rng(4242);
      for (let i = 0; i < 260; i++) { const x = -900 + r() * 1800, z = shoreZ(x) + 6 + r() * 34; if (Math.abs(z - roadZ(x)) > 10 && Math.abs(x) > 10) palms.push([x, z, 0.8 + r() * 0.5]); }
      for (let i = 0; i < 1600; i++) {
        const x = -1400 + r() * 2800, z = 40 + r() * 900, h = height(x, z);
        if (Math.abs(z - roadZ(x)) < 16 || h > 120 || (x > FEST.x0 - 20 && x < FEST.x1 + 20 && z > FEST.z0 - 10 && z < FEST.z1 + 20)) continue;
        if (fbm(x * 0.008 + 5, z * 0.008) > 0.5 || r() < 0.18) (h > 30 || r() < 0.4 ? pines : round).push([x, h, z, 0.8 + r() * 0.8]);
      }
      for (let i = 0; i < 80; i++) { const x = -900 + r() * 1800, z = shoreZ(x) - 4 + r() * 8; rocks.push([x, z, 0.6 + r() * 2.2]); }
      const d = new THREE.Object3D();
      const inst = (geo, mat, list, place) => { const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((p, i) => { place(d, p); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
      // palm: curved trunk + fronds
      const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 3, 0), new THREE.Vector3(1.4, 6, 0), new THREE.Vector3(2.4, 8.2, 0)]);
      const trunk = new THREE.TubeGeometry(trunkCurve, 12, 0.22, 6, false);
      const fr = []; for (let k = 0; k < 8; k++) { const g = new THREE.PlaneGeometry(4.2, 0.9, 4, 1); g.translate(2.1, 0, 0); const p = g.attributes.position; for (let j = 0; j < p.count; j++) p.setZ(j, -Math.pow(p.getX(j) / 4.2, 2) * 1.6); g.rotateX(-Math.PI / 2); g.rotateZ(-0.25); g.rotateY(k / 8 * Math.PI * 2); g.translate(2.4, 8.2, 0); fr.push(g.toNonIndexed()); }
      const fronds = mergeSimple(fr);
      inst(trunk, std('#8a6a4a'), palms, (o, [x, z, s]) => { o.position.set(x, height(x, z) - 0.2, z); o.rotation.set(0, x * 0.7, 0); o.scale.setScalar(s); });
      inst(fronds, std('#4f9a3a', { side: THREE.DoubleSide }), palms, (o, [x, z, s]) => { o.position.set(x, height(x, z) - 0.2, z); o.rotation.set(0, x * 0.7, 0); o.scale.setScalar(s); });
      const pine = mergeSimple([new THREE.ConeGeometry(2.4, 6, 7).translate(0, 5, 0).toNonIndexed(), new THREE.ConeGeometry(1.8, 5, 7).translate(0, 8, 0).toNonIndexed(), new THREE.CylinderGeometry(0.25, 0.35, 3, 5).translate(0, 1.5, 0).toNonIndexed()]);
      inst(pine, std('#2f6a3a', { flatShading: true }), pines, (o, [x, h, z, s]) => { o.position.set(x, h - 0.3, z); o.rotation.set(0, s * 9, 0); o.scale.setScalar(s * 1.4); });
      const tree = mergeSimple([new THREE.IcosahedronGeometry(3, 0).translate(0, 6, 0).toNonIndexed(), new THREE.CylinderGeometry(0.3, 0.4, 4, 5).translate(0, 2, 0).toNonIndexed()]);
      inst(tree, std('#5f9a3c', { flatShading: true }), round, (o, [x, h, z, s]) => { o.position.set(x, h - 0.3, z); o.rotation.set(0, s * 7, 0); o.scale.setScalar(s * 1.3); });
      inst(new THREE.DodecahedronGeometry(1, 0), std('#9a8f84', { flatShading: true }), rocks, (o, [x, z, s]) => { o.position.set(x, height(x, z), z); o.rotation.set(s, s * 3, 0); o.scale.set(s, s * 0.6, s); });
    }

    // festival grounds
    {
      const PAL = ['#ff2d87', '#ff8a00', '#ffd23f', '#1fd1f9', '#7b5cff', '#2bd67b'];
      const fx = -95, fz = 70;
      // tarmac lot
      const lot = new THREE.Mesh(new THREE.PlaneGeometry(130, 90), std('#4a4d54', { roughness: 0.9 })); lot.rotation.x = -Math.PI / 2; lot.position.set(fx, 1.42, fz); lot.receiveShadow = true; S.add(lot);
      // Ferris wheel
      const wheel = new THREE.Group(); wheel.position.set(fx - 40, 34, fz + 30);
      const steel = std('#f2f4f7', { metalness: 0.7, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 0.5, 8, 72), steel); wheel.add(ring);
      const ring2 = ring.clone(); ring2.position.z = 3; wheel.add(ring2);
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 5), steel); sp.position.set(Math.cos(a) * 15, Math.sin(a) * 15, 1.5); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
        const gon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), std(PAL[k % PAL.length], { roughness: 0.5 })); gon.position.set(Math.cos(a) * 30, Math.sin(a) * 30 - 1.6, 1.5); gon.userData.a = a; wheel.add(gon);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshBasicMaterial({ color: lin(PAL[(k + 2) % PAL.length]) })); bulb.position.set(Math.cos(a) * 30.6, Math.sin(a) * 30.6, -0.4); wheel.add(bulb);
      }
      S.add(wheel);
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 38, 6), steel); leg.position.set(fx - 40 + s * 9, 17, fz + 31.5); leg.rotation.z = s * 0.26; S.add(leg); }
      F.anim.push((t) => { wheel.rotation.z = t * 0.04; wheel.children.forEach(ch => { if (ch.userData.a !== undefined) ch.rotation.z = -wheel.rotation.z; }); });
      // striped tents
      const stripes = (a, b) => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; };
      for (let i = 0; i < 12; i++) {
        const x = fx - 50 + (i % 6) * 18, z = fz - 10 + Math.floor(i / 6) * 26, col = PAL[i % PAL.length];
        const tent = new THREE.Group(); tent.position.set(x, 1.4, z); tent.rotation.y = i * 0.4;
        const top = new THREE.Mesh(new THREE.ConeGeometry(6, 4.5, 8, 1, true), new THREE.MeshStandardMaterial({ map: stripes(col, '#ffffff'), roughness: 0.7, side: THREE.DoubleSide })); top.position.y = 5.6; tent.add(top);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 3.4, 8, 1, true), std('#f8f4ec', { side: THREE.DoubleSide })); wall.position.y = 1.7; tent.add(wall);
        const pen = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), std(col)); pen.position.y = 8.4; tent.add(pen);
        tent.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); S.add(tent);
      }
      // stage with LED screen
      const screen = document.createElement('canvas'); screen.width = 512; screen.height = 256; const sg = screen.getContext('2d');
      const gr = sg.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#ff2d87'); gr.addColorStop(0.5, '#ff8a00'); gr.addColorStop(1, '#ffd23f'); sg.fillStyle = gr; sg.fillRect(0, 0, 512, 256);
      sg.fillStyle = '#fff'; sg.font = 'italic 900 54px Archivo, Arial'; sg.textAlign = 'center'; sg.fillText('ASPHALT', 256, 112); sg.fillText('HORIZON', 256, 170); sg.font = '700 24px Archivo, Arial'; sg.fillText('FESTIWAL · 2026', 256, 214);
      const st = new THREE.CanvasTexture(screen); st.encoding = THREE.sRGBEncoding;
      const stage = new THREE.Group(); stage.position.set(fx + 40, 1.4, fz + 35); stage.rotation.y = -0.6;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(26, 1.6, 12), std('#22252c')); deck.position.y = 0.8; stage.add(deck);
      const led = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshBasicMaterial({ map: st })); led.position.set(0, 9, -5); stage.add(led);
      for (const s of [-1, 1]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(1, 16, 1), steel); tw.position.set(s * 12, 8, -5); stage.add(tw); }
      const truss = new THREE.Mesh(new THREE.BoxGeometry(25, 1, 1), steel); truss.position.set(0, 15.5, -5); stage.add(truss);
      stage.traverse(o => { if (o.isMesh) o.castShadow = true; }); S.add(stage);
      // pennant strings
      const tri = new THREE.ConeGeometry(0.5, 1.1, 3); tri.rotateX(Math.PI); const triMats = PAL.map(c => std(c, { side: THREE.DoubleSide }));
      for (let s = 0; s < 6; s++) {
        const x0 = fx - 60 + s * 22, z0 = fz - 24, x1 = x0 + 20, z1 = fz + 30;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 5), steel); pole.position.set(x0, 6.4, z0); S.add(pole);
        for (let k = 1; k < 16; k++) { const f = k / 16, y = 10.8 - Math.sin(f * Math.PI) * 2.2; const m = new THREE.Mesh(tri, triMats[(k + s) % PAL.length]); m.position.set(x0 + (x1 - x0) * f, y, z0 + (z1 - z0) * f); S.add(m); }
      }
      // entrance arch over the coastal road (behind the hero car)
      const arch = new THREE.Group(); const ax = -95; arch.position.set(ax, ROAD_Y, roadZ(ax)); arch.rotation.y = -Math.atan2(roadZ(ax + 1) - roadZ(ax - 1), 2);
      const pillarTex = stripes('#ff2d87', '#ff8a00'); pillarTex.repeat.set(1, 6); pillarTex.rotation = Math.PI / 2;
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), new THREE.MeshStandardMaterial({ map: pillarTex, roughness: 0.6 })); p.position.set(0, 6, s * 9); p.castShadow = true; arch.add(p); }
      const ban = document.createElement('canvas'); ban.width = 1024; ban.height = 128; const bg = ban.getContext('2d');
      const bgr = bg.createLinearGradient(0, 0, 1024, 0); bgr.addColorStop(0, '#ff2d87'); bgr.addColorStop(0.5, '#ff8a00'); bgr.addColorStop(1, '#ffd23f'); bg.fillStyle = bgr; bg.fillRect(0, 0, 1024, 128);
      bg.fillStyle = '#fff'; bg.font = 'italic 900 78px Archivo, Arial'; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.fillText('ASPHALT HORIZON FESTIWAL', 512, 68);
      const bt = new THREE.CanvasTexture(ban); bt.encoding = THREE.sRGBEncoding; bt.anisotropy = 8;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 19.6), [std('#ffffff'), std('#ffffff'), std('#ffffff'), std('#ffffff'), new THREE.MeshBasicMaterial({ map: bt }), new THREE.MeshBasicMaterial({ map: bt })]);
      beam.position.y = 12; beam.rotation.y = Math.PI / 2; beam.castShadow = true;
      const beamWrap = new THREE.Group(); beamWrap.add(beam); beamWrap.rotation.y = -Math.PI / 2; arch.add(beamWrap);
      S.add(arch);
      // parked festival cars
      const styles = ['coupe', 'wedge', 'hyper', 'muscle', 'hatch', 'proto', 'coupe', 'wedge'];
      styles.forEach((st, i) => {
        const m = AH.buildCar(st, parseInt(PAL[i % PAL.length].slice(1), 16), { noFlames: true });
        m.group.position.set(fx + 10 + (i % 4) * 7, 1.42, fz - 30 + Math.floor(i / 4) * 12); m.group.rotation.y = Math.PI * (i < 4 ? 1 : 0) + 0.15;
        m.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); S.add(m.group);
      });
      // light towers with soft beams
      const beamM = new THREE.MeshBasicMaterial({ color: lin('#ffe3b0'), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const x = fx - 60 + i * 40, z = fz + 52; const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 22, 6), steel); tw.position.set(x, 12, z); S.add(tw); const cone = new THREE.Mesh(new THREE.ConeGeometry(10, 80, 16, 1, true), beamM); cone.position.set(x, 62, z); cone.rotation.z = (i - 1.5) * 0.18; S.add(cone); F.anim.push((t) => { cone.rotation.z = Math.sin(t * 0.3 + i) * 0.35; }); }
    }
    F.ready = true;
  }

  function mergeSimple(list) {
    let n = 0; list.forEach(g => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    list.forEach(g => { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return m;
  }

  // ---------- public API ----------
  F.init = (makeEnvMap) => { if (!F.ready) build(makeEnvMap); };
  F.setCar = (model) => {
    if (F.car) S.remove(F.car.group);
    F.car = model;
    const g = model.group; g.position.set(0, ROAD_Y, roadZ(0)); g.rotation.y = Math.PI / 2 + Math.atan2(roadZ(1) - roadZ(-1), 2) * -1;
    g.traverse(o => { if (o.isMesh && o.material !== AH.carMats.blob) o.castShadow = true; });
    S.add(g);
  };
  const camPos = new THREE.Vector3(9, 2, 9), camLook = new THREE.Vector3(0, 1, 0), tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  F.SHOTS = {
    // hero shot: low 3/4 front, sea and sunset behind the car
    home: (t) => { const a = 0.5 + Math.sin(t * 0.07) * 0.14; tmpP.set(Math.cos(a) * 8.8, ROAD_Y + 1.15 + Math.sin(t * 0.11) * 0.15, Math.sin(a) * 8.8 + 0.6); tmpL.set(0.2, ROAD_Y + 0.8, 0); },
    garage: (t) => { if (!F.dragging) F.orbit += 0.0018; const a = F.orbit; tmpP.set(Math.cos(a) * 6.3, ROAD_Y + 1.5, Math.sin(a) * 6.3); tmpL.set(0, ROAD_Y + 0.55, 0); },
    festival: (t) => { const a = Math.sin(t * 0.05) * 6; tmpP.set(-10 + a, 16, 42); tmpL.set(-120, 22, 78); },
    map: (t) => { tmpP.set(60, 90, -40 + Math.sin(t * 0.04) * 10); tmpL.set(-60, 30, 300); },
  };
  F.update = (dt, shot, camera) => {
    F.t += dt;
    (F.SHOTS[shot] || F.SHOTS.home)(F.t);
    const k = 1 - Math.exp(-dt * 2.2);
    camPos.lerp(tmpP, k); camLook.lerp(tmpL, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    if (camera.fov !== 40) { camera.fov = 40; camera.updateProjectionMatrix(); }
    F.sky.position.copy(camera.position);
    if (F.car) {
      const g = F.car.group.position; F.sun.target.position.copy(g); F.sun.position.copy(g).add(new THREE.Vector3(-0.62, 0.16 + 0.35, -0.77).multiplyScalar(60));
      for (const w of F.car.wheels) w.rotation.x = 0;
    }
    for (const f of F.anim) f(F.t);
  };
  F.snap = (shot) => { (F.SHOTS[shot] || F.SHOTS.home)(F.t); camPos.copy(tmpP); camLook.copy(tmpL); };
  return F;
})();
