import { useEffect, useState } from 'react'
import { CartDrawer } from './components/CartDrawer'
import { Navbar } from './components/Navbar'
import { ProductDialog } from './components/ProductDialog'
import { privacy, terms } from './data/legal'
import { useI18n } from './i18n/I18n'
import { ScrollTrigger } from './lib/gsap'
import { useShop } from './lib/shop'
import { LegalPage } from './pages/LegalPage'
import { OrderPage } from './pages/OrderPage'
import { About } from './sections/About'
import { Collection } from './sections/Collection'
import { Demo } from './sections/Demo'
import { Final } from './sections/Final'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Story } from './sections/Story'
import { Why } from './sections/Why'
import { MagneticLink } from './components/Magnetic'

const path = window.location.pathname.replace(/\/+$/, '') || '/'

export default function App() {
  const { t, lang } = useI18n()
  const shop = useShop()
  const [notice, setNotice] = useState<string | null>(null)
  const home = path === '/'

  // returning from a cancelled Stripe checkout
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('koszyk') === 'anulowano') {
      setNotice('cancelled')
      shop.setCartOpen(true)
      url.searchParams.delete('koszyk')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // text length changes with the language → recalculate scroll animations
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120)
    return () => window.clearTimeout(id)
  }, [lang])

  useEffect(() => {
    if (home) document.title = 'EnglishPocket — Angielski bez kursu. Bez presji. Bez limitów.'
  }, [home])

  let page
  if (home)
    page = (
      <main id="tresc">
        <Hero />
        <Story />
        <Collection />
        <HowItWorks />
        <Why />
        <About />
        <Demo />
        <Final />
      </main>
    )
  else if (path === '/zamowienie') page = <OrderPage />
  else if (path === '/regulamin') page = <LegalPage doc={terms()} />
  else if (path === '/polityka-prywatnosci') page = <LegalPage doc={privacy()} />
  else
    page = (
      <main id="tresc" className="container-x flex min-h-[80svh] flex-col items-center justify-center pt-32 text-center">
        <p className="font-display text-[clamp(6rem,20vw,14rem)] leading-none font-extrabold tracking-[-0.07em] text-blue">404</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold">{t.notFound.title}</h1>
        <p className="mt-3 text-muted">{t.notFound.body}</p>
        <div className="mt-10">
          <MagneticLink href="/" variant="dark">{t.notFound.back}</MagneticLink>
        </div>
      </main>
    )

  return (
    <>
      <a href="#tresc" className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-full bg-navy px-5 py-3 font-semibold text-ivory transition focus:translate-y-0">
        {t.meta.skip}
      </a>
      <Navbar home={home} />
      {page}
      <Footer home={home} />
      <ProductDialog />
      <CartDrawer notice={notice === 'cancelled' ? t.cart.cancelled : null} />
    </>
  )
}
