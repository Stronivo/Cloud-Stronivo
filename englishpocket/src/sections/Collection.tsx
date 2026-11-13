import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { Book } from '../components/Book'
import { useTilt } from '../components/useTilt'
import { formatPrice, PRODUCT_LOOKS, type ProductLook } from '../data/products'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'
import { useShop } from '../lib/shop'

const LAYOUT = ['lg:col-span-8', 'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4']

export function Collection() {
  const { t, lang } = useI18n()
  const { status } = useShop()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      gsap.from(q('.col-title .mask-inner'), {
        yPercent: 110,
        duration: 1.2,
        stagger: 0.08,
        scrollTrigger: { trigger: q('.col-title')[0], start: 'top 85%' },
      })
      q<HTMLElement>('.product-tile').forEach((el, i) => {
        gsap.from(el, {
          y: 80,
          opacity: 0,
          duration: 1.2,
          delay: (i % 3) * 0.08,
          scrollTrigger: { trigger: el, start: 'top 90%' },
        })
        gsap.from(el.querySelector('.book-wrap'), {
          rotateY: -60,
          rotateX: 20,
          y: 60,
          duration: 1.6,
          delay: 0.1 + (i % 3) * 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  return (
    <section id="materialy" ref={root} className="relative scroll-mt-20 py-24 md:py-36">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow">
              <span className="text-blue">●</span> {t.shop.eyebrow} · 05
            </p>
            <h2 className="col-title mt-5 font-display text-[clamp(2.5rem,6.2vw,5.6rem)] leading-[0.95] font-extrabold tracking-[-0.05em]">
              {t.shop.title.split(' ').reduce<string[][]>((acc, w, i) => {
                const line = Math.floor(i / 3)
                ;(acc[line] ??= []).push(w)
                return acc
              }, []).map((ws, i) => (
                <span key={i} className="mask-line">
                  <span className="mask-inner block"><Tidy>{ws.join(' ')}</Tidy></span>
                </span>
              ))}
            </h2>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-muted lg:col-span-4">{t.shop.lead}</p>
        </div>

        {status === 'offline' && (
          <p role="status" className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-yellow bg-yellow/25 px-5 py-3 text-sm font-medium text-navy">
            <span aria-hidden className="size-2 rounded-full bg-[#E0A800]" />
            {t.shop.offline}
          </p>
        )}

        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          {PRODUCT_LOOKS.map((look, i) => (
            <li key={look.slug} className={`product-tile ${LAYOUT[i]} ${i === 0 ? 'md:col-span-2' : ''}`}>
              <ProductTile look={look} large={i === 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ProductTile({ look, large }: { look: ProductLook; large: boolean }) {
  const { t, lang } = useI18n()
  const shop = useShop()
  const { ref, handlers } = useTilt<HTMLDivElement>(12)
  const data = shop.products[look.slug]
  const sellable = Boolean(data?.available && data.price_amount > 0)
  const inCart = shop.has(look.slug)
  const name = data?.name || look.name
  const description = (lang === 'pl' && data?.description) || t.products[look.slug]

  return (
    <div
      ref={ref}
      {...handlers}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-navy/[0.07] bg-white/70 transition-[box-shadow,transform] duration-700 ease-out-expo hover:shadow-[0_40px_80px_-40px_rgb(23_36_58/0.35)] ${
        large ? 'lg:flex-row' : ''
      }`}
    >
      {/* Shelf with the book */}
      <div
        className={`relative flex items-center justify-center overflow-hidden ${large ? 'min-h-[22rem] lg:w-[46%] lg:min-h-[30rem]' : 'min-h-[19rem]'}`}
        style={{ background: `radial-gradient(120% 90% at 30% 20%, #fff8, transparent 60%), ${look.tile}` }}
      >
        <span aria-hidden className="absolute top-5 left-6 font-display text-[5.5rem] leading-none font-extrabold tracking-[-0.06em] text-navy/[0.07]">
          {look.no}
        </span>
        <span aria-hidden className="serif-accent absolute right-6 bottom-5 text-xl text-navy/30 transition-transform duration-700 ease-out-expo group-hover:-translate-y-1">
          {look.word.en} · <span className="text-navy/25">{look.word.pl}</span>
        </span>
        {/* responsive shadow */}
        <div
          aria-hidden
          className="absolute bottom-[12%] left-1/2 h-6 w-[46%] -translate-x-1/2 rounded-[50%] bg-navy/30 blur-xl transition-[transform,opacity] duration-700 ease-out-expo group-data-[hover]:opacity-60"
          style={{ transform: 'translateX(calc(-50% + var(--sx, 0px)))' }}
        />
        <div className="book-wrap [perspective:1100px]">
          <div
            className="transition-transform duration-700 ease-out-expo group-data-[hover]:duration-200 group-data-[hover]:ease-out"
            style={{ transform: 'rotateX(var(--rx, 6deg)) rotateY(calc(var(--ry, 0deg) - 24deg))', transformStyle: 'preserve-3d' }}
          >
            <Book
              look={look}
              className="transition-transform duration-700 ease-out-expo group-hover:[transform:translateZ(36px)_translateY(-10px)]"
              style={{ ['--w' as string]: large ? 'clamp(11rem,17vw,15rem)' : '10.5rem', ['--h' as string]: large ? 'clamp(14.6rem,22.6vw,20rem)' : '14rem', ['--d' as string]: large ? '2.3rem' : '1.7rem' }}
            />
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className={`relative flex flex-1 flex-col p-6 md:p-8 ${large ? 'lg:justify-center lg:p-12' : ''}`}>
        <p className="font-display text-xs font-bold tracking-[0.18em] text-muted uppercase">
          {look.no} — PDF{data?.level ? ` · ${data.level}` : ''}
          {data?.page_count ? ` · ${t.shop.pages(data.page_count)}` : ''}
        </p>
        <h3 className={`mt-3 font-display font-extrabold tracking-[-0.04em] text-navy ${large ? 'text-[clamp(2rem,3.4vw,3.2rem)] leading-[0.98]' : 'text-[1.7rem] leading-[1.05]'}`}>
          <button
            type="button"
            onClick={() => shop.openDetail(look.slug)}
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none [&:focus-visible]:after:rounded-[28px] [&:focus-visible]:after:outline-[2.5px] [&:focus-visible]:after:outline-blue [&:focus-visible]:after:outline-offset-[-4px] [&:focus-visible]:after:outline-solid"
            aria-label={t.shop.open(name)}
          >
            {name}
          </button>
        </h3>
        <p className="mt-3 max-w-md leading-relaxed text-muted">{description}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
          <Price slug={look.slug} />
          <div className="relative z-10 flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-sm font-semibold text-navy/60 transition-[opacity,transform] duration-500 ease-out-expo md:inline-flex md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100" aria-hidden>
              {t.shop.details} →
            </span>
            <button
              type="button"
              disabled={!sellable}
              onClick={() => {
                if (inCart) shop.setCartOpen(true)
                else shop.add(look.slug)
              }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-display text-sm font-bold transition-[background-color,color,transform] duration-300 disabled:cursor-not-allowed disabled:bg-navy/[0.06] disabled:text-navy/40 ${
                inCart ? 'bg-navy text-ivory' : 'bg-blue text-white hover:bg-blue-ink active:scale-95'
              }`}
            >
              {!sellable ? t.shop.unavailable : inCart ? `✓ ${t.shop.added}` : `+ ${t.shop.add}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Price({ slug, className = '' }: { slug: string; className?: string }) {
  const { t, lang } = useI18n()
  const { products, status } = useShop()
  const p = products[slug]
  if (status === 'loading')
    return (
      <span className={`inline-block h-8 w-24 animate-pulse rounded-lg bg-navy/[0.07] ${className}`}>
        <span className="sr-only">{t.shop.loading}</span>
      </span>
    )
  if (!p || !(p.price_amount > 0)) return <span className={`text-sm font-semibold text-muted ${className}`}>{t.shop.priceSoon}</span>
  return (
    <span className={`font-display text-[1.7rem] font-extrabold tracking-[-0.03em] text-navy ${className}`}>
      <Tidy>{formatPrice(p.price_amount, p.currency, lang)}</Tidy>
    </span>
  )
}
