export type Pt = { x: number; y: number }

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
/** Map v from [a,b] to 0..1, clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a))

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)
export const easeOutBack = (t: number) => {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const f = (n: number) => Math.round(n * 10) / 10
export const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`
