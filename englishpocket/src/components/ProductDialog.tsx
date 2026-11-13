import { useEffect, useRef, useState } from 'react'
import { PRODUCT_LOOKS } from '../data/products'
import { useI18n } from '../i18n/I18n'
import { useShop } from '../lib/shop'
import { Price } from '../sections/Collection'
import { Book } from './Book'
import { MagneticButton } from './Magnetic'
import { useTilt } from './useTilt'

/** Product details in a native modal <dialog> (focus trap, Esc, inert background for free). */
export function ProductDialog() {
  const { t, lang } = useI18n()
  const shop = useShop()
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const tilt = useTilt<HTMLDivElement>(16)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (shop.detail) {
      setShown(shop.detail)
      if (!d.open) d.showModal()
      document.body.classList.add('noscroll')
    } else if (d.open) {
      d.dataset.closing = ''
      const id = window.setTimeout(() => {
        d.close()
        delete d.dataset.closing
        document.body.classList.remove('noscroll')
      }, 380)
      return () => window.clearTimeout(id)
    }
  }, [shop.detail])

  const idx = PRODUCT_LOOKS.findIndex((l) => l.slug === shown)
  const look = PRODUCT_LOOKS[idx]
  if (!look && !shop.detail) return <dialog ref={ref} className="hidden" />

  const data = look ? shop.products[look.slug] : undefined
  const sellable = Boolean(data?.available && data.price_amount > 0)
  const inCart = look ? shop.has(look.slug) : false
  const go = (dir: number) => shop.openDetail(PRODUCT_LOOKS[(idx + dir + PRODUCT_LOOKS.length) % PRODUCT_LOOKS.length].slug)
  const description = (lang === 'pl' && data?.description) || (look ? t.products[look.slug] : '')

  return (
    <dialog
      ref={ref}
      aria-labelledby="pd-title"
      onCancel={(e) => {
        e.preventDefault()
        if (zoom) setZoom(null)
        else shop.openDetail(null)
      }}
      onClick={(e) => e.target === ref.current && shop.openDetail(null)}
      className="product-dialog fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-navy/50 backdrop:backdrop-blur-sm sm:p-6"
    >
      {look && (
        <div className="pd-panel relative mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-ivory sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:rounded-[32px] md:flex-row">
          {/* Visual */}
          <div
            ref={tilt.ref}
            {...tilt.handlers}
            className="group relative flex min-h-[18rem] shrink-0 items-center justify-center overflow-hidden md:min-h-0 md:w-[46%]"
            style={{ background: `radial-gradient(120% 90% at 30% 20%, #fff8, transparent 60%), ${look.tile}` }}
          >
            <span aria-hidden className="absolute top-6 left-7 font-display text-[7rem] leading-none font-extrabold tracking-[-0.06em] text-navy/[0.07]">
              {look.no}
            </span>
            <div className="[perspective:1200px]">
              <div
                key={look.slug}
                className="pd-book transition-transform duration-500 ease-out-expo"
                style={{ transform: 'rotateX(var(--rx, 4deg)) rotateY(calc(var(--ry, 0deg) - 22deg))', transformStyle: 'preserve-3d' }}
              >
                <Book
                  look={look}
                  style={{ ['--w' as string]: 'clamp(9rem,20vw,15rem)', ['--h' as string]: 'clamp(12rem,26.6vw,20rem)', ['--d' as string]: '2.2rem' }}
                />
              </div>
            </div>
            <div className="absolute right-4 bottom-4 flex gap-2">
              <button type="button" onClick={() => go(-1)} aria-label={t.shop.prev} className="grid size-11 place-items-center rounded-full bg-white/80 text-navy backdrop-blur transition hover:bg-white">
                ←
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t.shop.next} className="grid size-11 place-items-center rounded-full bg-white/80 text-navy backdrop-blur transition hover:bg-white">
                →
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="relative flex-1 overflow-y-auto p-6 sm:p-8 md:p-12">
            <button
              type="button"
              onClick={() => shop.openDetail(null)}
              aria-label={t.shop.close}
              className="sticky top-0 float-right -mt-2 -mr-2 grid size-11 place-items-center rounded-full bg-navy text-ivory transition hover:rotate-90"
            >
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <p className="font-display text-xs font-bold tracking-[0.18em] text-muted uppercase">{look.no} — EnglishPocket PDF</p>
            <h2 id="pd-title" key={look.slug} className="pd-reveal mt-3 font-display text-[clamp(2rem,4vw,3.4rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-navy">
              {data?.name || look.name}
            </h2>
            <p className="pd-reveal mt-4 text-lg leading-relaxed text-muted">{description}</p>

            <dl className="pd-reveal mt-8 flex flex-wrap gap-2 text-sm">
              <div className="min-w-[9rem] rounded-2xl border border-line bg-paper px-4 py-3">
                <dt className="text-muted">{t.shop.format}</dt>
                <dd className="mt-1 font-semibold text-navy">{t.shop.formatValue}</dd>
              </div>
              {data?.level && (
                <div className="min-w-[9rem] rounded-2xl border border-line bg-paper px-4 py-3">
                  <dt className="text-muted">{t.shop.level}</dt>
                  <dd className="mt-1 font-semibold text-navy">{data.level}</dd>
                </div>
              )}
              {data?.page_count ? (
                <div className="min-w-[9rem] rounded-2xl border border-line bg-paper px-4 py-3">
                  <dt className="text-muted">PDF</dt>
                  <dd className="mt-1 font-semibold text-navy">{t.shop.pages(data.page_count)}</dd>
                </div>
              ) : null}
            </dl>

            {data?.details?.length ? (
              <div className="pd-reveal mt-8">
                <h3 className="font-display text-lg font-bold text-navy">{t.shop.contents}</h3>
                <ul className="mt-3 space-y-2">
                  {data.details.map((d) => (
                    <li key={d} className="flex gap-3 text-navy/85">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="pd-reveal mt-8">
              <h3 className="font-display text-lg font-bold text-navy">{t.shop.previews}</h3>
              {data?.preview_images?.length ? (
                <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
                  {data.preview_images.map((src, i) => (
                    <li key={src} className="snap-start">
                      <button type="button" onClick={() => setZoom(src)} className="block overflow-hidden rounded-xl border border-line bg-white shadow-card transition hover:-translate-y-1">
                        <img src={src} alt={`${data.name} — ${t.shop.previews.toLowerCase()} ${i + 1}`} loading="lazy" className="h-44 w-auto" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">{t.shop.noPreview}</p>
              )}
            </div>

            <div className="pd-reveal mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6">
              <Price slug={look.slug} className="!text-[2.2rem]" />
              <div className="flex flex-wrap gap-2">
                <MagneticButton
                  variant="ghost"
                  arrow={false}
                  disabled={!sellable}
                  onClick={() => (inCart ? shop.setCartOpen(true) : shop.add(look.slug))}
                  className="!min-h-12 !px-6 !text-sm"
                >
                  {!sellable ? t.shop.unavailable : inCart ? `✓ ${t.shop.added}` : t.shop.add}
                </MagneticButton>
                <MagneticButton
                  disabled={!sellable}
                  onClick={() => {
                    shop.add(look.slug)
                    shop.openDetail(null)
                    window.setTimeout(() => shop.setCartOpen(true), 400)
                  }}
                  className="!min-h-12 !px-6 !text-sm"
                >
                  {t.shop.buy}
                </MagneticButton>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">{t.shop.digital}</p>
          </div>

          {zoom && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy/85 p-6" onClick={() => setZoom(null)}>
              <img src={zoom} alt="" className="max-h-full max-w-full rounded-xl shadow-object" />
              <button type="button" autoFocus onClick={() => setZoom(null)} aria-label={t.shop.close} className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-ivory text-navy">
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
