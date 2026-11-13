import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { CableDefs, CableTube, Plug, Port, PLUG_INSERT, PLUG_LEN } from './parts'
import { clamp, easeInOutCubic, easeOutQuint, lerp, lerpPt, P, range, type Pt } from '../../lib/math'

type Pose = { c1: Pt; c2: Pt; mid: Pt; tip: Pt; angle: number }
type Layout = {
  W: number
  H: number
  s: number
  mobile: boolean
  start: Pt
  port: Pt
  disc: Pose
  appr: Pose
  conn: Pose
}

const TIMING = { delay: 250, approach: 1150, insert: 340 }
// Phones: same choreography, shorter — the headline appears sooner (better LCP / Speed Index).
const TIMING_MOBILE = { delay: 80, approach: 720, insert: 260 }

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    c1: lerpPt(a.c1, b.c1, t),
    c2: lerpPt(a.c2, b.c2, t),
    mid: lerpPt(a.mid, b.mid, t),
    tip: lerpPt(a.tip, b.tip, t),
    angle: lerp(a.angle, b.angle, t),
  }
}

/** Build the cable path for a pose. The last segment ends tangent to the plug so it always looks attached. */
function cablePath(pose: Pose, start: Pt, s: number) {
  const dx = Math.cos(pose.angle)
  const dy = Math.sin(pose.angle)
  const end = { x: pose.tip.x - PLUG_LEN * s * dx, y: pose.tip.y - PLUG_LEN * s * dy }
  const k = 190 * s
  const c4 = { x: end.x - k * dx, y: end.y - k * dy }
  return `M${P(start)} C${P(pose.c1)} ${P(pose.c2)} ${P(pose.mid)} S${P(c4)} ${P(end)}`
}

function computeLayout(hero: HTMLElement, anchor: HTMLElement | null): Layout {
  const hr = hero.getBoundingClientRect()
  const W = hr.width
  const H = hr.height
  const mobile = W < 768

  if (mobile) {
    // Phones: the plug connects in a band right above the headline (Hero leaves room
    // for it), so the whole animation is in view as soon as the page opens.
    const s = 0.5
    const top = anchor ? anchor.getBoundingClientRect().top - hr.top : H * 0.3
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
  if (anchor) {
    const ar = anchor.getBoundingClientRect()
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

type Props = {
  heroRef: RefObject<HTMLElement | null>
  anchorRef: RefObject<HTMLElement | null>
  reduced: boolean
  onConnected: () => void
}

export function HeroCable({ heroRef, anchorRef, reduced, onConnected }: Props) {
  const id = useId().replace(/:/g, '')
  const svg = useRef<SVGSVGElement>(null)
  const shadow = useRef<SVGPathElement>(null)
  const outer = useRef<SVGPathElement>(null)
  const body = useRef<SVGPathElement>(null)
  const sheen = useRef<SVGPathElement>(null)
  const pulse = useRef<SVGPathElement>(null)
  const pulseGlow = useRef<SVGPathElement>(null)
  const plug = useRef<SVGGElement>(null)
  const port = useRef<SVGGElement>(null)
  const trace = useRef<SVGPathElement>(null)
  const traceStream = useRef<SVGPathElement>(null)
  const flash = useRef<SVGCircleElement>(null)
  const onConnectedRef = useRef(onConnected)
  useEffect(() => {
    onConnectedRef.current = onConnected
  }, [onConnected])

  useEffect(() => {
    const hero = heroRef.current
    const el = svg.current
    if (!hero || !el) return

    let L = computeLayout(hero, anchorRef.current)
    let raf = 0
    let running = false
    let t0 = -1
    let connected = false
    let pulseAt = -1
    let mx = 0, my = 0, smx = 0, smy = 0

    const placeStatic = () => {
      el.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`)
      port.current!.setAttribute('transform', `translate(${P(L.port)}) scale(${L.s})`)
      flash.current!.setAttribute('cx', `${L.port.x}`)
      flash.current!.setAttribute('cy', `${L.port.y}`)
      // digital trace leaving the port to the right edge of the screen
      const x0 = L.port.x + 172 * L.s
      const y0 = L.port.y
      const step = 26 * L.s
      const d = L.mobile
        ? `M${x0} ${y0} H${L.W + 10}`
        : `M${x0} ${y0} H${x0 + 40 * L.s} l${step} ${-step} H${L.W + 10}`
      trace.current!.setAttribute('d', d)
      traceStream.current!.setAttribute('d', d)
    }

    const draw = (pose: Pose) => {
      const d = cablePath(pose, L.start, L.s)
      for (const p of [shadow, outer, body, sheen, pulse, pulseGlow]) p.current!.setAttribute('d', d)
      plug.current!.setAttribute(
        'transform',
        `translate(${P(pose.tip)}) rotate(${((pose.angle * 180) / Math.PI).toFixed(2)}) scale(${L.s})`,
      )
    }

    const setPulse = (k: number) => {
      // pathLength is normalised to 1000; the dash is 80 long
      const off = 80 - k * 1080
      const op = k <= 0 || k >= 1 ? '0' : '1'
      for (const p of [pulse, pulseGlow]) {
        p.current!.style.strokeDashoffset = `${off}`
        p.current!.style.opacity = op
      }
    }

    const markConnected = () => {
      if (connected) return
      connected = true
      hero.classList.add('is-connected')
      onConnectedRef.current()
    }

    if (reduced) {
      placeStatic()
      draw(L.conn)
      setPulse(0)
      markConnected()
      const onResize = () => {
        L = computeLayout(hero, anchorRef.current)
        placeStatic()
        draw(L.conn)
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(hero)
      return () => ro.disconnect()
    }

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
          mid: {
            x: L.conn.mid.x + smx * 22,
            y: L.conn.mid.y + Math.sin(idle * 0.9) * 10 * L.s + smy * 18 + ring,
          },
        }
      }

      draw(pose)

      if (pulseAt > 0) {
        const k = (now - pulseAt) / 1250
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
    draw(L.disc)
    setPulse(0)

    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()))
    io.observe(hero)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const ro = new ResizeObserver(() => {
      L = computeLayout(hero, anchorRef.current)
      placeStatic()
    })
    ro.observe(hero)
    // fonts change the heading width → re-anchor the port when they arrive
    document.fonts?.ready.then(() => {
      L = computeLayout(hero, anchorRef.current)
      placeStatic()
    })

    // Safety net: never keep the page hidden if rAF is throttled
    const safety = window.setTimeout(markConnected, 3200)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      clearTimeout(safety)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
    }
  }, [heroRef, anchorRef, reduced])

  // Rendered at desktop width on the server, corrected before first paint on the client.
  const [vw, setVw] = useState(1440)
  useLayoutEffect(() => {
    const update = () => setVw(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const filters = vw >= 768
  const scale = filters ? clamp(vw / 1440, 0.72, 1.12) : 0.5

  return (
    <svg ref={svg} aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <CableDefs id={id} filters={filters} />
      {/* digital side: thin trace that comes alive once the plug is seated */}
      <path
        ref={trace}
        fill="none"
        stroke="#c6ff4d"
        strokeWidth="1.5"
        pathLength={1}
        strokeDasharray="1"
        className="[stroke-dashoffset:1] transition-[stroke-dashoffset] delay-300 duration-[1400ms] ease-out-expo group-[.is-connected]:[stroke-dashoffset:0]"
      />
      <path
        ref={traceStream}
        fill="none"
        stroke="#f5f7f2"
        strokeWidth="1.5"
        className="stream opacity-0 transition-opacity delay-1000 duration-700 group-[.is-connected]:opacity-70"
      />
      <CableTube id={id} filters={filters} width={14 * scale} shadowRef={shadow} outerRef={outer} bodyRef={body} sheenRef={sheen} />
      <path
        ref={pulseGlow}
        fill="none"
        stroke="#c6ff4d"
        strokeOpacity="0.35"
        strokeWidth={12 * scale}
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="80 1000"
        filter={filters ? `url(#${id}-glow)` : undefined}
        style={{ opacity: 0 }}
      />
      <path
        ref={pulse}
        fill="none"
        stroke="#e9ffb8"
        strokeWidth={Math.max(2, 3 * scale)}
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="80 1000"
        style={{ opacity: 0 }}
      />
      <Plug ref={plug} id={id} filters={filters} />
      <Port ref={port} id={id} filters={filters} />
      <circle
        ref={flash}
        r="70"
        fill="none"
        stroke="#c6ff4d"
        strokeWidth="2"
        className="connect-flash opacity-0"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  )
}
