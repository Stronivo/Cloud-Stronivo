/**
 * Content of the site in one place.
 * Anything marked TODO must be confirmed by Stronivo before publishing.
 */

export const NAV = [
  { id: 'start', label: 'Strona główna', href: '#start' },
  { id: 'realizacje', label: 'Realizacje', href: '#realizacje' },
  { id: 'uslugi', label: 'Usługi', href: '#uslugi' },
  { id: 'o-nas', label: 'O nas', href: '#o-nas' },
  { id: 'kontakt', label: 'Kontakt', href: '#kontakt' },
] as const

export const CONTACT = {
  email: 'kontakt@stronivo.com',
  site: 'stronivo.com',
  siteUrl: 'https://www.stronivo.com',
}

/** The business that provides services under the Stronivo brand (data controller). */
export const COMPANY = {
  name: 'EASY BUSY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
  shortName: 'EASY BUSY Sp. z o.o.',
  nip: '8961591928',
  street: 'ul. Hebanowa 43',
  city: '55-093 Kiełczów',
}

export const SOCIALS = [
  { label: 'Instagram', handle: 'stronivowebs', href: 'https://www.instagram.com/stronivowebs/' },
  { label: 'TikTok', handle: '@stronivo', href: 'https://www.tiktok.com/@stronivo' },
  { label: 'Facebook', handle: 'Stronivo', href: 'https://www.facebook.com/share/1Cs2hBayeC/' },
] as const

export type Project = {
  slug: string
  name: string
  industry: string
  summary: string
  url: string
  domain: string
  accent: string
  /** describes the page in image alt text, e.g. "restauracji Bella Italia" */
  subject: string
  /** image base path; variants: -desktop-{900,1600}, -mobile-{200,400,600} in .avif and .webp */
  image: string
}

/**
 * Demonstration projects — concept sites built to show our approach,
 * not commissioned client work. They are labelled as such in the UI.
 */
export const PROJECTS: Project[] = [
  {
    slug: 'easy-busy',
    name: 'Easy Busy',
    industry: 'Budownictwo · roboty ziemne',
    summary:
      'Mocna, techniczna identyfikacja dla firmy zajmującej się stabilizacją gruntu. Pełnoekranowe zdjęcia maszyn, jasna oferta i szybka ścieżka do wyceny.',
    url: 'https://easybusy.lovable.app',
    domain: 'easybusy.lovable.app',
    accent: '#D9A23A',
    subject: 'firmy budowlanej Easy Busy',
    image: '/work/easybusy',
  },
  {
    slug: 'bella-italia',
    name: 'Bella Italia',
    industry: 'Gastronomia · restauracja',
    summary:
      'Ciepły, elegancki klimat włoskiej restauracji. Szeryfowa typografia, nastrojowe wnętrza i rezerwacja stolika zawsze pod ręką.',
    url: 'https://bellaitaliaweb.lovable.app',
    domain: 'bellaitaliaweb.lovable.app',
    accent: '#B4532F',
    subject: 'restauracji Bella Italia',
    image: '/work/bellaitalia',
  },
]

export const SERVICES = [
  {
    no: '01',
    title: 'Strony internetowe',
    short: 'Strony firmowe',
    body: 'Projektujemy szybkie, estetyczne i responsywne strony dopasowane do charakteru Twojej firmy.',
    tags: ['Projekt UI', 'Responsywność', 'CMS na życzenie'],
  },
  {
    no: '02',
    title: 'Landing page',
    short: 'Landing page',
    body: 'Tworzymy strony nastawione na konkretny cel — kontakt, zapytania i pozyskiwanie klientów.',
    tags: ['Jeden cel', 'Mocne CTA', 'Formularze'],
  },
  {
    no: '03',
    title: 'Odświeżanie stron',
    short: 'Redesign',
    body: 'Nadajemy istniejącym witrynom nowoczesny wygląd i poprawiamy komfort użytkowania.',
    tags: ['Redesign', 'UX', 'Nowa typografia'],
  },
  {
    no: '04',
    title: 'SEO i optymalizacja',
    short: 'SEO',
    body: 'Dbamy o techniczne podstawy widoczności w wyszukiwarkach, szybkość działania i prawidłowe wyświetlanie na urządzeniach.',
    tags: ['Core Web Vitals', 'Meta i Open Graph', 'Dostępność'],
  },
] as const

export const STEPS = [
  { no: '01', title: 'Rozmowa', body: 'Poznajemy Twoją firmę, cele i oczekiwania.' },
  { no: '02', title: 'Projekt', body: 'Tworzymy koncepcję wizualną dopasowaną do marki.' },
  { no: '03', title: 'Realizacja', body: 'Budujemy stronę, dopracowujemy szczegóły i testujemy działanie.' },
  {
    no: '04',
    title: 'Publikacja',
    body: 'Uruchamiamy gotową witrynę i pomagamy rozpocząć jej funkcjonowanie w internecie.',
  },
] as const
