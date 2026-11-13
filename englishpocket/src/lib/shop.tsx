import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ProductData } from '../data/products'

type Status = 'loading' | 'ready' | 'offline'
type CheckoutError = 'consent' | 'not_configured' | 'unavailable' | 'generic' | null

type Shop = {
  status: Status
  products: Record<string, ProductData>
  cart: string[]
  add: (slug: string) => void
  remove: (slug: string) => void
  has: (slug: string) => boolean
  cartOpen: boolean
  setCartOpen: (v: boolean) => void
  checkout: (slugs: string[], consent: boolean) => Promise<void>
  paying: boolean
  error: CheckoutError
  setError: (e: CheckoutError) => void
  detail: string | null
  openDetail: (slug: string | null) => void
}

const ShopContext = createContext<Shop | null>(null)
const KEY = 'ep-cart'

function readCart(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 10) : []
  } catch {
    return []
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [products, setProducts] = useState<Record<string, ProductData>>({})
  const [cart, setCart] = useState<string[]>(readCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<CheckoutError>(null)
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/products', { headers: { Accept: 'application/json' } })
      .then(async (r) => {
        const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null
        if (!alive) return
        if (r.ok && data?.ok && Array.isArray(data.products)) {
          const map: Record<string, ProductData> = {}
          for (const p of data.products as ProductData[]) map[p.slug] = p
          setProducts(map)
          setStatus('ready')
        } else setStatus('offline')
      })
      .catch(() => alive && setStatus('offline'))
    return () => {
      alive = false
    }
  }, [])

  // drop items that are no longer sellable once real data arrives
  useEffect(() => {
    if (status !== 'ready') return
    setCart((c) => c.filter((s) => products[s]?.available && products[s].price_amount > 0))
  }, [status, products])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart])

  const add = useCallback((slug: string) => setCart((c) => (c.includes(slug) ? c : [...c, slug])), [])
  const remove = useCallback((slug: string) => setCart((c) => c.filter((s) => s !== slug)), [])

  const checkout = useCallback(async (slugs: string[], consent: boolean) => {
    setError(null)
    if (!consent) return setError('consent')
    setPaying(true)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs, consent: true }),
      })
      const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null
      if (r.ok && data?.url) {
        window.location.assign(data.url)
        return
      }
      setError(data?.error === 'not_configured' ? 'not_configured' : data?.error === 'unavailable' ? 'unavailable' : 'generic')
    } catch {
      setError('generic')
    }
    setPaying(false)
  }, [])

  const value = useMemo<Shop>(
    () => ({
      status,
      products,
      cart,
      add,
      remove,
      has: (s) => cart.includes(s),
      cartOpen,
      setCartOpen,
      checkout,
      paying,
      error,
      setError,
      detail,
      openDetail: setDetail,
    }),
    [status, products, cart, add, remove, cartOpen, checkout, paying, error, detail],
  )
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const c = useContext(ShopContext)
  if (!c) throw new Error('useShop outside provider')
  return c
}
