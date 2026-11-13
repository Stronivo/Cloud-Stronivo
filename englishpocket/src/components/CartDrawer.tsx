import { useEffect, useRef, useState } from 'react'
import { formatPrice, PRODUCT_LOOKS } from '../data/products'
import { useI18n } from '../i18n/I18n'
import { useShop } from '../lib/shop'
import { Book } from './Book'
import { MagneticButton } from './Magnetic'

export function CartDrawer({ notice }: { notice?: string | null }) {
  const { t, lang } = useI18n()
  const shop = useShop()
  const ref = useRef<HTMLDialogElement>(null)
  const [digital, setDigital] = useState(false)
  const [terms, setTerms] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (shop.cartOpen && !d.open) {
      d.showModal()
      document.body.classList.add('noscroll')
    } else if (!shop.cartOpen && d.open) {
      d.dataset.closing = ''
      const id = window.setTimeout(() => {
        d.close()
        delete d.dataset.closing
        document.body.classList.remove('noscroll')
      }, 420)
      return () => window.clearTimeout(id)
    }
  }, [shop.cartOpen])

  const items = shop.cart.map((slug) => ({ look: PRODUCT_LOOKS.find((l) => l.slug === slug), data: shop.products[slug], slug })).filter((i) => i.look)
  const total = items.reduce((s, i) => s + (i.data?.price_amount ?? 0), 0)
  const currency = items[0]?.data?.currency ?? 'pln'
  const close = () => {
    shop.setCartOpen(false)
    shop.setError(null)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === ref.current && close()}
      className="cart-dialog fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-navy/45 backdrop:backdrop-blur-[3px]"
    >
      <div className="cart-panel ml-auto flex h-full w-full max-w-[29rem] flex-col bg-ivory shadow-object">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="cart-title" className="font-display text-2xl font-extrabold tracking-[-0.03em] text-navy">
            {t.cart.title} <span className="text-blue">({items.length})</span>
          </h2>
          <button type="button" onClick={close} aria-label={t.cart.close} className="grid size-11 place-items-center rounded-full border border-navy/15 text-navy transition hover:rotate-90 hover:border-navy">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {notice && (
          <p role="status" className="mx-6 mt-5 rounded-xl bg-lavender/60 px-4 py-3 text-sm font-medium text-navy">
            {notice}
          </p>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="relative h-24 w-32 rounded-b-[26px] rounded-t-[10px] bg-blue/90">
              <div className="absolute inset-2.5 rounded-b-[20px] rounded-t-[6px] border-2 border-dashed border-white/50" />
            </div>
            <p className="text-lg text-muted">{t.cart.empty}</p>
            <MagneticButton
              variant="dark"
              onClick={() => {
                close()
                document.getElementById('materialy')?.scrollIntoView()
              }}
            >
              {t.cart.emptyCta}
            </MagneticButton>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {items.map(({ look, data, slug }) => (
                <li key={slug} className="flex items-center gap-4 rounded-2xl border border-line bg-white/70 p-3 pr-4">
                  <div className="grid h-20 w-16 shrink-0 place-items-center [perspective:600px]">
                    <div style={{ transform: 'rotateY(-24deg)', transformStyle: 'preserve-3d' }}>
                      <Book look={look!} style={{ ['--w' as string]: '3.4rem', ['--h' as string]: '4.5rem', ['--d' as string]: '0.6rem' }} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold text-navy">{data?.name || look!.name}</p>
                    <p className="text-sm text-muted">PDF</p>
                  </div>
                  <p className="font-display font-bold text-navy">{data ? formatPrice(data.price_amount, data.currency, lang) : '—'}</p>
                  <button
                    type="button"
                    onClick={() => shop.remove(slug)}
                    aria-label={t.cart.remove(data?.name || look!.name)}
                    className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-navy/5 hover:text-navy"
                  >
                    <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <form
              className="border-t border-line bg-paper px-6 pt-5 pb-6"
              onSubmit={(e) => {
                e.preventDefault()
                shop.checkout(shop.cart, digital && terms)
              }}
              noValidate
            >
              <div className="flex items-baseline justify-between">
                <span className="text-muted">{t.cart.total}</span>
                <span className="font-display text-3xl font-extrabold tracking-[-0.03em] text-navy">{formatPrice(total, currency, lang)}</span>
              </div>

              <div className="mt-5 space-y-3 text-[0.82rem] leading-snug text-navy/80">
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" checked={digital} onChange={(e) => setDigital(e.target.checked)} className="mt-0.5 size-[1.15rem] shrink-0 accent-blue" />
                  <span>{t.cart.consent}</span>
                </label>
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 size-[1.15rem] shrink-0 accent-blue" />
                  <span>
                    {t.cart.terms}{' '}
                    <a href="/regulamin" target="_blank" className="font-semibold text-blue underline underline-offset-2">
                      {t.cart.termsLink}
                    </a>{' '}
                    {t.cart.and}{' '}
                    <a href="/polityka-prywatnosci" target="_blank" className="font-semibold text-blue underline underline-offset-2">
                      {t.cart.privacyLink}
                    </a>
                    .
                  </span>
                </label>
              </div>

              <div aria-live="polite" className="min-h-0">
                {shop.error && <p className="mt-4 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#A21C1C]">{t.cart.errors[shop.error]}</p>}
              </div>

              <MagneticButton type="submit" disabled={shop.paying || shop.status !== 'ready'} className="mt-5 w-full">
                {shop.paying ? t.cart.paying : t.cart.pay}
              </MagneticButton>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v7H3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                {t.cart.secure}
              </p>
            </form>
          </>
        )}
      </div>
    </dialog>
  )
}
