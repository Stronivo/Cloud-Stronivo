'use strict';
// Asphalt Horizon — tasks ("zadania"). Three tasks are active at a time and stay fixed for a whole race, so a
// race can never complete more than three. Progress carries over between races. Every three completed tasks
// raise the driver level, which pays a bonus.
(() => {
  const PER_LEVEL = 3, ACTIVE = 3;
  const cityName = (id) => (AH.CITIES.find(c => c.id === id) || {}).name || id;
  const plural = (n, a, b, c) => (n === 1 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? b : c);
  const r1 = (x) => Math.max(1, Math.round(x));
  // stat: key in the per-race stats object. once: must be reached within a single race (no carry-over).
  // goal(L): target at driver level L. city: picks one unlocked city.
  const T = [
    { id: 'coins', stat: 'coins', goal: L => r1(30 + L * 6), text: g => `Zbierz ${g} monet` },
    { id: 'coins1', stat: 'coins', once: true, goal: L => r1(18 + L * 3), text: g => `Zbierz ${g} monet w jednym wyścigu` },
    { id: 'near', stat: 'near', goal: L => r1(8 + L * 2), text: g => `Mijaj ruch „o włos” ${g} razy` },
    { id: 'near1', stat: 'near', once: true, goal: L => r1(5 + L), text: g => `${g} mijanek „o włos” w jednym wyścigu` },
    { id: 'td', stat: 'takedowns', goal: L => r1(2 + L * 0.5), text: g => `Zrób ${g} ${plural(g, 'takedown', 'takedowny', 'takedownów')}` },
    { id: 'td1', stat: 'takedowns', once: true, goal: L => r1(1 + L * 0.3), text: g => `${g} ${plural(g, 'takedown', 'takedowny', 'takedownów')} w jednym wyścigu` },
    { id: 'drift', stat: 'driftT', goal: L => r1(15 + L * 3), text: g => `Driftuj łącznie ${g} s` },
    { id: 'drift1', stat: 'longDrift', once: true, goal: L => r1(2.5 + L * 0.35), text: g => `Jeden drift dłuższy niż ${g} s` },
    { id: 'nitroT', stat: 'nitroT', goal: L => r1(20 + L * 4), text: g => `Jedź na nitro łącznie ${g} s` },
    { id: 'nmax', stat: 'nitroMax', goal: L => r1(1 + L * 0.3), text: g => `Odpal NITRO MAX ${g} ${plural(g, 'raz', 'razy', 'razy')}` },
    { id: 'gems', stat: 'gems', goal: L => r1(3 + L), text: g => `Zbierz ${g} ${plural(g, 'diament', 'diamenty', 'diamentów')} nitro` },
    { id: 'gems1', stat: 'gems', once: true, goal: L => r1(2 + L * 0.4), text: g => `${g} ${plural(g, 'diament', 'diamenty', 'diamentów')} nitro w jednym wyścigu` },
    { id: 'jumps', stat: 'jumps', goal: L => r1(3 + L), text: g => `Skocz z rampy ${g} ${plural(g, 'raz', 'razy', 'razy')}` },
    { id: 'air', stat: 'airT', goal: L => r1(5 + L), text: g => `Spędź ${g} s w powietrzu` },
    { id: 'top', stat: 'top', once: true, goal: L => Math.min(330, 200 + L * 6), text: g => `Rozpędź się do ${g} km/h` },
    { id: 'fast', stat: 'fastT', goal: L => r1(25 + L * 6), text: g => `Jedź ponad 200 km/h przez ${g} s` },
    { id: 'lead', stat: 'leadT', goal: L => r1(25 + L * 6), text: g => `Prowadź w wyścigu przez ${g} s` },
    { id: 'over', stat: 'overtakes', goal: L => r1(5 + L), text: g => `Wyprzedź rywali ${g} ${plural(g, 'raz', 'razy', 'razy')}` },
    { id: 'freeze', stat: 'frozen', goal: L => r1(2 + L * 0.5), text: g => `Zamroź ${g} ${plural(g, 'rywala', 'rywali', 'rywali')}` },
    { id: 'fly', stat: 'flyUsed', goal: L => r1(1 + L * 0.3), text: g => `Użyj lotu ${g} ${plural(g, 'raz', 'razy', 'razy')}` },
    { id: 'pick', stat: 'picked', goal: L => r1(2 + L * 0.5), text: g => `Zbierz ${g} ${plural(g, 'ładunek', 'ładunki', 'ładunków')} (lód lub lot)` },
    { id: 'races', stat: 'finished', goal: L => r1(2 + L * 0.3), text: g => `Ukończ ${g} ${plural(g, 'wyścig', 'wyścigi', 'wyścigów')}` },
    { id: 'podium', stat: 'podium', goal: L => r1(1 + L * 0.3), text: g => `Stań na podium ${g} ${plural(g, 'raz', 'razy', 'razy')}` },
    { id: 'win', stat: 'win', goal: L => r1(1 + L * 0.2), text: g => `Wygraj ${g} ${plural(g, 'wyścig', 'wyścigi', 'wyścigów')}` },
    { id: 'clean', stat: 'clean', once: true, goal: () => 1, text: () => 'Ukończ wyścig bez kolizji z ruchem' },
    { id: 'start', stat: 'perfect', goal: L => r1(1 + L * 0.2), text: g => `Idealny start (nitro na „START”) ×${g}` },
    { id: 'pts1', stat: 'score', once: true, goal: L => r1(900 + L * 250), text: g => `Zdobądź ${AH.fmt(g)} pkt w jednym wyścigu` },
    { id: 'noNitro', stat: 'podiumNoNitro', once: true, goal: () => 1, text: () => 'Podium bez użycia nitro' },
    { id: 'city', stat: 'cityDone', city: true, goal: () => 1, text: (g, c) => `Ukończ wyścig: ${cityName(c)}` },
    { id: 'cityPod', stat: 'cityPodium', city: true, once: true, goal: () => 1, text: (g, c) => `Podium w mieście ${cityName(c)}` },
  ];
  const byId = Object.fromEntries(T.map(t => [t.id, t]));

  const Q = AH.Quests = { TEMPLATES: T, PER_LEVEL };
  const S = () => AH.save;
  Q.state = () => {
    const s = S();
    if (!s.quest || !Array.isArray(s.quest.active)) s.quest = { level: 1, done: 0, total: 0, active: [], seq: 1 };
    const q = s.quest;
    q.active = q.active.filter(a => byId[a.id]);
    while (q.active.length < ACTIVE) q.active.push(Q.roll(q));
    return q;
  };
  Q.roll = (q) => {
    const used = new Set(q.active.map(a => a.id)), recent = new Set(q.recent || []);
    const open = AH.CITIES.filter((c, i) => AH.cityUnlocked(i));
    const opts = T.filter(t => !used.has(t.id) && !recent.has(t.id) && (!t.city || open.length > 1));
    const pool = opts.length ? opts : T.filter(t => !used.has(t.id));
    const seed = (q.seq = (q.seq || 1) + 1) * 2654435761 + (q.level || 1) * 97;
    const rnd = AH.rng(seed);
    const t = pool[Math.floor(rnd() * pool.length)];
    const c = t.city ? open[Math.floor(rnd() * open.length)].id : null;
    const L = q.level || 1;
    return { id: t.id, city: c, goal: t.goal(L), prog: 0, reward: Math.round((200 + L * 80) / 10) * 10 };
  };
  Q.text = (a) => byId[a.id].text(a.goal, a.city);
  // progress of a task including the race in progress (st = live race stats or null)
  Q.value = (a, st) => {
    const t = byId[a.id];
    if (t.city && st && st.city !== a.city) return a.prog;
    const v = st ? +st[t.stat] || 0 : 0;
    return t.once ? Math.max(a.prog, v) : a.prog + v;
  };
  Q.isDone = (a, st) => Q.value(a, st) >= a.goal;
  Q.levelReward = (L) => 750 + L * 250;
  // call once when a race ends. Completes up to three tasks and refills them for the next race.
  Q.finishRace = (st) => {
    const q = Q.state(), out = { done: [], levelUps: [], pts: 0 };
    q.active = q.active.map(a => {
      const t = byId[a.id];
      if (!t.city || st.city === a.city) a.prog = Math.min(a.goal, Q.value(a, st));
      if (a.prog >= a.goal) {
        out.done.push({ text: Q.text(a), reward: a.reward }); out.pts += a.reward;
        q.done++; q.total = (q.total || 0) + 1;
        q.recent = [a.id].concat(q.recent || []).slice(0, 8);
        if (q.done >= PER_LEVEL) { q.done -= PER_LEVEL; q.level++; const b = Q.levelReward(q.level); out.levelUps.push({ level: q.level, reward: b }); out.pts += b; }
        return null;
      }
      return a;
    }).filter(Boolean);
    while (q.active.length < ACTIVE) q.active.push(Q.roll(q));
    return out;
  };
  Q.byId = byId;
})();
