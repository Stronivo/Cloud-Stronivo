'use strict';
// Asphalt Horizon — accounts (Google / e-mail + password), server-side progress and online parties.
// Backend: Supabase Auth + Postgres RPC (validated, RLS-protected) + Realtime private channels.
// Without configuration everything degrades to guest/offline mode.

AH.Net = (() => {
  const cfg = window.AH_CONFIG || {};
  const N = {
    sb: null, enabled: false, user: null, nickname: null,
    party: null,          // { code, channel, members: Map(id → meta), hostId }
    listeners: {},
    reason: '',
  };
  const emit = (ev, data) => (N.listeners[ev] || []).forEach(f => { try { f(data); } catch (e) { console.error(e); } });
  N.on = (ev, f) => { (N.listeners[ev] = N.listeners[ev] || []).push(f); };

  N.init = () => {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) { N.reason = 'config'; return false; }
    if (!window.supabase || !window.supabase.createClient) { N.reason = 'lib'; return false; }
    try {
      N.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
        realtime: { params: { eventsPerSecond: 20 } },
      });
      N.enabled = true;
      N.sb.auth.onAuthStateChange((event, session) => {
        N.user = session ? session.user : null;
        if (session) N.sb.realtime.setAuth(session.access_token);
        emit('auth', { event, user: N.user });
      });
      return true;
    } catch (e) { N.reason = 'init'; console.error(e); return false; }
  };

  const msg = (e) => {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e);
    const map = {
      'Invalid login credentials': 'Nieprawidłowy e-mail lub hasło.',
      'Email not confirmed': 'Potwierdź adres e-mail (link w skrzynce), a potem się zaloguj.',
      'User already registered': 'Konto z tym e-mailem już istnieje. Zaloguj się.',
      rate_limited: 'Za dużo prób. Odczekaj kilka minut.',
      party_not_found: 'Nie ma party z tym kodem (albo wygasło).',
      party_full: 'To party jest pełne (maks. 6 graczy).',
      too_fast: 'Wynik wysłany zbyt szybko po poprzednim. Spróbuj za chwilę.',
      not_enough_points: 'Za mało punktów.',
      invalid_code: 'Kod ma 6 znaków (litery i cyfry).',
    };
    for (const k in map) if (m.includes(k)) return map[k];
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Brak połączenia z serwerem gry.';
    if (/Password should be at least/i.test(m)) return 'Hasło musi mieć co najmniej 8 znaków.';
    return m;
  };
  N.msg = msg;

  // ---------- auth ----------
  N.restore = async () => {
    if (!N.enabled) return null;
    const { data } = await N.sb.auth.getSession();
    N.user = data.session ? data.session.user : null;
    if (data.session) N.sb.realtime.setAuth(data.session.access_token);
    return N.user;
  };
  N.signInGoogle = async () => {
    const redirectTo = location.origin + location.pathname;
    const { error } = await N.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw new Error(msg(error));
  };
  N.signIn = async (email, password) => {
    const { data, error } = await N.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(msg(error));
    N.user = data.user; return data.user;
  };
  N.signUp = async (email, password, nickname) => {
    const { data, error } = await N.sb.auth.signUp({ email, password, options: { data: { nickname }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw new Error(msg(error));
    return { user: data.user, needsConfirm: !data.session };
  };
  N.resetPassword = async (email) => {
    const { error } = await N.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(msg(error));
  };
  N.signOut = async () => { await N.leaveParty().catch(() => {}); await N.sb.auth.signOut(); N.user = null; };

  // ---------- server-authoritative progress ----------
  const rpc = async (fn, args) => {
    const { data, error } = await N.sb.rpc(fn, args || {});
    if (error) throw new Error(msg(error));
    return data;
  };
  // map server profile → local save shape
  N.applyProfile = (p) => {
    if (!p) return;
    const S = AH.save;
    S.pts = p.pts; S.sel = p.sel; S.cleared = p.cleared || {}; S.races = p.races; S.wins = p.wins;
    S.owned = {}; (p.owned || []).forEach(id => (S.owned[id] = true));
    S.ups = p.ups || {}; S.boosts = p.boosts || {}; S.best = p.best || {}; S.cosm = p.cosm || {};
    N.nickname = p.nickname;
    AH.persist();
  };
  N.loadProfile = async () => { const p = await rpc('ah_get_profile'); N.applyProfile(p); return p; };
  N.setNickname = async (nick) => N.applyProfile(await rpc('ah_set_nickname', { p_nickname: nick }));
  N.purchase = async (kind, item, sub = null, n = 1) => N.applyProfile(await rpc('ah_purchase', { p_kind: kind, p_item: item, p_sub: sub, p_n: n }));
  N.selectCar = async (id) => N.applyProfile(await rpc('ah_select_car', { p_car: id }));
  N.setCosmetics = async (id, c) => N.applyProfile(await rpc('ah_set_cosmetics', { p_car: id, p_cosm: c }));
  N.submitRace = async (r) => {
    const out = await rpc('ah_submit_race', {
      p_city: r.city, p_place: r.place, p_coins: r.coins, p_takedowns: r.takedowns, p_near: r.near,
      p_time: Math.round(r.time * 100) / 100, p_used: r.used, p_picked: r.picked, p_quest: Math.max(0, Math.round(r.quest || 0)),
    });
    N.applyProfile(out.profile);
    return out;
  };

  // ---------- parties (Realtime private channel per party) ----------
  N.createParty = async () => { const code = await rpc('ah_create_party'); await N.connectParty(code); return code; };
  N.joinParty = async (code) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error(msg('invalid_code'));
    const r = await rpc('ah_join_party', { p_code: code });
    if (r && r.error) throw new Error(msg(r.error));
    await N.connectParty(code);
    return code;
  };
  N.leaveParty = async () => {
    if (!N.party) return;
    const p = N.party; N.party = null;
    try { await p.channel.untrack(); await N.sb.removeChannel(p.channel); } catch (e) { /* ignore */ }
    try { await rpc('ah_leave_party'); } catch (e) { /* ignore */ }
    emit('party', null);
  };
  N.myMeta = () => {
    const car = AH.carById(AH.save.sel), cs = AH.cosm(car.id);
    return { id: N.user.id, name: N.nickname || 'Kierowca', car: car.id, color: cs.color, finish: cs.finish, rim: cs.rim, neon: cs.neon === undefined ? null : cs.neon, ready: N.party ? !!N.party.ready : false, t: N.party ? N.party.joinedAt : Date.now() };
  };
  N.connectParty = async (code) => {
    if (N.party) { try { await N.sb.removeChannel(N.party.channel); } catch (e) { /* ignore */ } }
    const { data } = await N.sb.auth.getSession();
    if (data.session) N.sb.realtime.setAuth(data.session.access_token);
    const ch = N.sb.channel('party:' + code, { config: { private: true, presence: { key: N.user.id }, broadcast: { self: false } } });
    const party = N.party = { code, channel: ch, members: new Map(), ready: false, joinedAt: Date.now() };
    const sync = () => {
      const st = ch.presenceState(); party.members = new Map();
      for (const k in st) { const m = st[k][st[k].length - 1]; if (m && m.id) party.members.set(m.id, m); }
      const list = [...party.members.values()].sort((a, b) => a.t - b.t);
      party.hostId = list.length ? list[0].id : N.user.id;
      emit('party', party);
    };
    ch.on('presence', { event: 'sync' }, sync);
    for (const ev of ['start', 'state', 'finish', 'freeze', 'lobby']) ch.on('broadcast', { event: ev }, ({ payload }) => emit('net:' + ev, payload));
    await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('Nie udało się połączyć z party.')), 10000);
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(to); await ch.track(N.myMeta()); res(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(to); rej(new Error('Brak dostępu do kanału party.')); }
      });
    });
    sync();
    return party;
  };
  N.retrack = () => { if (N.party) N.party.channel.track(N.myMeta()); };
  N.setReady = (v) => { if (!N.party) return; N.party.ready = v; N.retrack(); };
  N.isHost = () => !!(N.party && N.user && N.party.hostId === N.user.id);
  N.send = (event, payload) => { if (N.party) N.party.channel.send({ type: 'broadcast', event, payload }); };

  return N;
})();
