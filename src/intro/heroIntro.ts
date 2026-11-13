/**
 * Hero plug-in animation engine.
 *
 * Self-contained on purpose (no imports, no outer references): scripts/prerender.mjs
 * inlines `startHeroIntro.toString()` at the end of the prerendered HTML, so the
 * animation starts as soon as the document is parsed — without waiting for the
 * React bundle to download and hydrate. Hero also calls it after mounting (dev
 * server, or if the inline copy failed); the window flag keeps it single-run.
 *
 * It drives the static SVG markup rendered by <HeroCable/> through data attributes
 * and never touches anything React re-renders.
 */
export function startHeroIntro(): void {
  const w = window as unknown as { __stronivoIntro?: boolean }
  if (w.__stronivoIntro) return
  const hero = document.getElementById('start')
  const svg = hero?.querySelector<SVGSVGElement>('svg[data-hero-cable]')
  if (!hero || !svg) return
  w.__stronivoIntro = true

  type Pt = { x: number; y: number }
  type Pose = { c1: Pt; c2: Pt; mid: Pt; tip: Pt; angle: number }
  type Layout = { W: number; H: number; s: number; mobile: boolean; start: Pt; port: Pt; disc: Pose; appr: Pose; conn: Pose }

  const PLUG_LEN = 150
  const PLUG_INSERT = 24
  const TIMING = { delay: 250, approach: 1150, insert: 340 }
  // Phones: same choreography, shorter — the headline appears sooner.
  const TIMING_MOBILE = { delay: 80, approach: 720, insert: 260 }

  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
  const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a))
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)
  const f = (n: number) => Math.round(n * 10) / 10
  const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`

  const q = <T extends Element>(sel: string) => svg.querySelector(sel) as T
  const tube = ['shadow', 'outer', 'body', 'sheen'].map((k) => q<SVGPathElement>(`[data-c="${k}"]`))
  const [shadow, outer, body, sheen] = tube
  const pulse = q<SVGPathElement>('[data-c="pulse"]')
  const pulseGlow = q<SVGPathElement>('[data-c="glow"]')
  const plug = q<SVGGElement>('[data-c="plug"]')
  const port = q<SVGGElement>('[data-c="port"]')
  const trace = q<SVGPathElement>('[data-c="trace"]')
  const stream = q<SVGPathElement>('[data-c="stream"]')
  const flash = q<SVGCircleElement>('[data-c="flash"]')
  const anchor = () => hero.querySelector<HTMLElement>('[data-hero-anchor]')
  // SVG filters are expensive to repaint every frame; phones render without them.
  const filtered = Array.from(svg.querySelectorAll<SVGElement>('[filter]'))
  filtered.forEach((el) => (el.dataset.f = el.getAttribute('filter') ?? ''))

  const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
    c1: lerpPt(a.c1, b.c1, t),
    c2: lerpPt(a.c2, b.c2, t),
    mid: lerpPt(a.mid, b.mid, t),
    tip: lerpPt(a.tip, b.tip, t),
    angle: lerp(a.angle, b.angle, t),
  })

  /** The last segment ends tangent to the plug so it always looks attached. */
  const cablePath = (pose: Pose, start: Pt, s: number) => {
    const dx = Math.cos(pose.angle)
    const dy = Math.sin(pose.angle)
    const end = { x: pose.tip.x - PLUG_LEN * s * dx, y: pose.tip.y - PLUG_LEN * s * dy }
    const k = 190 * s
    const c4 = { x: end.x - k * dx, y: end.y - k * dy }
    return `M${P(start)} C${P(pose.c1)} ${P(pose.c2)} ${P(pose.mid)} S${P(c4)} ${P(end)}`
  }

  /** Reads layout only — call before any DOM writes in the same frame. */
  const computeLayout = (): Layout => {
    const hr = hero.getBoundingClientRect()
    const ar = anchor()?.getBoundingClientRect() ?? null
    const W = hr.width
    const H = hr.height
    const mobile = W < 768

    if (mobile) {
      // Phones: the plug connects in a band right above the headline.
      const s = 0.5
      const top = ar ? ar.top - hr.top : H * 0.3
      const Y = top - 58
      const port = { x: W - 100, y: Y }
      const conn: Pose = {
        c1: { x: W * 0.16, y: Y + 34 },
        c2: { x: W * 0.26, y: Y + 62 },
        mid: { x: W * 0.43, y: Y + 26 },
        tip: { x: port.x + PLUG_INSERT * s, y: port.y },
        angle: 0,
      }
      return {
        W,
        H,
        s,
        mobile,
        start: { x: -30, y: Y + 20 },
        port,
        conn,
        appr: { ...conn, tip: { x: port.x - 46, y: port.y } },
        disc: {
          c1: { x: W * 0.15, y: Y + 44 },
          c2: { x: W * 0.28, y: Y + 70 },
          mid: { x: W * 0.42, y: Y + 46 },
          tip: { x: port.x - 64, y: Y + 40 },
          angle: 0.35,
        },
      }
    }

    const s = clamp(W / 1440, 0.72, 1.12)
    let port = { x: W * 0.78, y: H * 0.34 }
    if (ar) {
      port = {
        x: Math.min(ar.right - hr.left + (PLUG_LEN - PLUG_INSERT + 44) * s, W - 196 * s),
        y: ar.top - hr.top + ar.height * 0.5,
      }
    }
    const conn: Pose = {
      c1: { x: W * 0.16, y: H * 0.8 },
      c2: { x: W * 0.24, y: H * 1.06 },
      mid: { x: W * 0.5, y: H * 0.9 },
      tip: { x: port.x + PLUG_INSERT * s, y: port.y },
      angle: 0,
    }
    return {
      W,
      H,
      s,
      mobile,
      start: { x: -60, y: H + 40 },
      port,
      conn,
      appr: { ...conn, tip: { x: port.x - 74 * s, y: port.y } },
      disc: {
        c1: { x: W * 0.14, y: H * 0.9 },
        c2: { x: W * 0.26, y: H * 1.12 },
        mid: { x: W * 0.47, y: H * 1.0 },
        tip: { x: port.x - 120 * s, y: H * 0.9 },
        angle: 0.5,
      },
    }
  }

  let L = computeLayout()

  /** Writes only. Size-dependent attributes (viewBox, port, stroke widths, filters). */
  const placeStatic = () => {
    const s = L.s
    const wTube = 14 * s
    svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`)
    svg.toggleAttribute('data-mobile', L.mobile)
    port.setAttribute('transform', `translate(${P(L.port)}) scale(${s})`)
    flash.setAttribute('cx', `${L.port.x}`)
    flash.setAttribute('cy', `${L.port.y}`)
    shadow.setAttribute('stroke-width', `${wTube * 1.3}`)
    shadow.setAttribute('stroke-opacity', L.mobile ? '0.3' : '0.55')
    outer.setAttribute('stroke-width', `${wTube + 2}`)
    body.setAttribute('stroke-width', `${wTube - 1}`)
    sheen.setAttribute('stroke-width', `${Math.max(1.5, wTube * 0.22)}`)
    pulseGlow.setAttribute('stroke-width', `${12 * s}`)
    pulse.setAttribute('stroke-width', `${Math.max(2, 3 * s)}`)
    filtered.forEach((el) => (L.mobile ? el.removeAttribute('filter') : el.setAttribute('filter', el.dataset.f ?? '')))
    // digital trace leaving the port to the right edge of the screen
    const x0 = L.port.x + 172 * s
    const y0 = L.port.y
    const step = 26 * s
    const d = L.mobile ? `M${x0} ${y0} H${L.W + 30}` : `M${x0} ${y0} H${x0 + 40 * s} l${step} ${-step} H${L.W + 10}`
    trace.setAttribute('d', d)
    stream.setAttribute('d', d)
    svg.setAttribute('data-ready', '')
  }

  const draw = (pose: Pose, withPulse: boolean) => {
    const d = cablePath(pose, L.start, L.s)
    for (const p of tube) p.setAttribute('d', d)
    // the pulse layers only need geometry while an impulse is travelling
    if (withPulse) {
      pulse.setAttribute('d', d)
      pulseGlow.setAttribute('d', d)
    }
    plug.setAttribute('transform', `translate(${P(pose.tip)}) rotate(${((pose.angle * 180) / Math.PI).toFixed(2)}) scale(${L.s})`)
  }

  const setPulse = (k: number) => {
    // pathLength is normalised to 1000; the dash is 80 long
    const off = `${80 - k * 1080}`
    const op = k <= 0 || k >= 1 ? '0' : '1'
    pulse.style.strokeDashoffset = off
    pulseGlow.style.strokeDashoffset = off
    pulse.style.opacity = op
    pulseGlow.style.opacity = op
  }

  let connected = false
  const markConnected = () => {
    if (connected) return
    connected = true
    hero.classList.add('is-connected')
    document.documentElement.classList.add('intro-done')
  }

  const relayout = () => {
    L = computeLayout()
    placeStatic()
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    placeStatic()
    draw(L.conn, true)
    setPulse(0)
    markConnected()
    new ResizeObserver(() => {
      relayout()
      draw(L.conn, true)
    }).observe(hero)
    return
  }

  let raf = 0
  let running = false
  let t0 = -1
  let pulseAt = -1
  let mx = 0,
    my = 0,
    smx = 0,
    smy = 0

  const frame = (now: number) => {
    raf = 0
    if (t0 < 0) t0 = now
    const T = L.mobile ? TIMING_MOBILE : TIMING
    const t = now - t0 - T.delay
    const A = T.approach
    const B = T.insert
    let pose: Pose

    if (t < A) {
      const k = easeInOutCubic(range(t, 0, A))
      pose = lerpPose(L.disc, L.appr, k)
      // slack cable wobble that settles as the plug lines up
      const wob = Math.sin(t / 150) * 18 * L.s * (1 - k)
      pose.mid = { x: pose.mid.x, y: pose.mid.y + wob }
      pose.c1 = { x: pose.c1.x, y: pose.c1.y - wob * 0.6 }
    } else if (t < A + B) {
      pose = lerpPose(L.appr, L.conn, easeOutQuint(range(t, A, A + B)))
    } else {
      markConnected()
      if (pulseAt < 0) pulseAt = now + 60
      smx += (mx - smx) * 0.06
      smy += (my - smy) * 0.06
      const idle = now / 1000
      const settle = range(t, A + B, A + B + 900)
      const ring = Math.sin(t / 90) * 6 * L.s * (1 - settle) // small recoil after the click
      pose = {
        ...L.conn,
        c1: { x: L.conn.c1.x + smx * 14, y: L.conn.c1.y + Math.cos(idle * 0.8) * 8 * L.s + smy * 10 },
        c2: { x: L.conn.c2.x, y: L.conn.c2.y + Math.sin(idle * 0.6) * 10 * L.s },
        mid: { x: L.conn.mid.x + smx * 22, y: L.conn.mid.y + Math.sin(idle * 0.9) * 10 * L.s + smy * 18 + ring },
      }
    }

    const k = pulseAt > 0 ? (now - pulseAt) / 1250 : -1
    draw(pose, k > 0 && k < 1)
    if (pulseAt > 0) {
      setPulse(k)
      if (k >= 1) pulseAt = now + 3800 // next impulse
    }
    if (running) raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (running) return
    running = true
    raf = requestAnimationFrame(frame)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
    raf = 0
  }

  placeStatic()
  draw(L.disc, true)
  setPulse(0)

  new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(hero)
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
    },
    { passive: true },
  )
  // ResizeObserver callbacks run after layout, so reading here does not force a reflow.
  new ResizeObserver(relayout).observe(hero)
  // fonts change the heading width → re-anchor the port when they arrive
  document.fonts?.ready.then(() => requestAnimationFrame(relayout))
  // Safety net: never keep the page hidden if rAF is throttled
  window.setTimeout(markConnected, 3200)
}
