/**
 * Visual identity of the five packages. Prices, page counts, contents and
 * previews come ONLY from the database (/api/products) — matched by slug.
 */
export type ProductLook = {
  slug: string
  no: string
  name: string
  short: string // short label on the book spine
  accent: string // cover colour
  ink: string // text colour on the cover
  tile: string // soft background of the product tile
  motif: 'exam' | 'grammar' | 'work' | 'talk' | 'words'
  word: { en: string; pl: string } // decorative word on the cover
}

export const PRODUCT_LOOKS: ProductLook[] = [
  {
    slug: 'e8-exam',
    tile: '#DCE6FF',
    no: '01',
    name: 'E8 Exam',
    short: 'E8',
    accent: '#4978FF',
    ink: '#FFFFFF',
    motif: 'exam',
    word: { en: 'ready', pl: 'gotowy' },
  },
  {
    slug: 'grammar-mastery',
    tile: '#E6E1FA',
    no: '02',
    name: 'Grammar Mastery',
    short: 'Grammar',
    accent: '#17243A',
    ink: '#FFD978',
    motif: 'grammar',
    word: { en: 'structure', pl: 'struktura' },
  },
  {
    slug: 'professional-english',
    tile: '#ECE8FF',
    no: '03',
    name: 'Professional English for Work',
    short: 'Work',
    accent: '#DCD5FF',
    ink: '#17243A',
    motif: 'work',
    word: { en: 'meeting', pl: 'spotkanie' },
  },
  {
    slug: 'everyday-communication',
    tile: '#FFF1C9',
    no: '04',
    name: 'Everyday Communication',
    short: 'Everyday',
    accent: '#FFD978',
    ink: '#17243A',
    motif: 'talk',
    word: { en: 'small talk', pl: 'luźna rozmowa' },
  },
  {
    slug: 'vocabulary-expansion',
    tile: '#D7F1EE',
    no: '05',
    name: 'Vocabulary Expansion',
    short: 'Vocab',
    accent: '#2FB5A8',
    ink: '#FFFFFF',
    motif: 'words',
    word: { en: 'curious', pl: 'ciekawy' },
  },
]

export type ProductData = {
  id: string
  slug: string
  name: string
  description: string | null
  details: string[]
  level: string | null
  page_count: number | null
  price_amount: number
  currency: string
  preview_images: string[]
  available: boolean
}

export const formatPrice = (amount: number, currency = 'pln', lang = 'pl') =>
  new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(
    amount / 100,
  )
