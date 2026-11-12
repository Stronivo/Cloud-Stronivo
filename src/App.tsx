import { useCallback, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Cursor } from './components/Cursor'
import { Hero } from './sections/Hero'
import { Work } from './sections/Work'
import { Services } from './sections/Services'
import { Connect } from './sections/Connect'
import { Process } from './sections/Process'
import { About } from './sections/About'
import { Marquee } from './sections/Marquee'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { LegalPage, isLegalPath } from './pages/LegalPage'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const legal = isLegalPath(path) ? path : null
  const notFound = !legal && path !== '/'

  const introDone = useCallback(() => document.documentElement.classList.add('intro-done'), [])

  useEffect(() => {
    if (legal || notFound) introDone()
  }, [legal, notFound, introDone])

  return (
    <div className="grain">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[200] -translate-y-24 rounded-full bg-lime px-5 py-3 font-medium text-ink transition-transform focus:translate-y-0"
      >
        Przejdź do treści
      </a>
      <Cursor />
      <Navbar home={!legal && !notFound} />
      <main id="main" tabIndex={-1} className="outline-none">
        {legal ? (
          <LegalPage path={legal} />
        ) : notFound ? (
          <section className="container-x flex min-h-[80svh] flex-col justify-center pt-32">
            <p className="eyebrow">Błąd 404</p>
            <h1 className="mt-6 text-[clamp(2.6rem,8vw,7rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
              Ten kabel prowadzi donikąd.
            </h1>
            <a href="/" className="mt-10 inline-flex min-h-12 w-fit items-center rounded-full bg-lime px-6 font-medium text-ink">
              Wróć na stronę główną
            </a>
          </section>
        ) : (
          <>
            <Hero onIntroDone={introDone} />
            <Work />
            <Services />
            <Connect />
            <Process />
            <About />
            <Marquee />
            <Contact />
          </>
        )}
      </main>
      <Footer home={!legal && !notFound} />
    </div>
  )
}
