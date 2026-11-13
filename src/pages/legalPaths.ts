/** Kept separate from LegalPage so the router can check paths without loading the page code. */
export const LEGAL_PAGES = {
  '/polityka-prywatnosci': { title: 'Polityka Prywatności Stronivo', doc: 'Polityka prywatności' },
  '/informacje-prawne': { title: 'Informacje prawne', doc: 'Informacje prawne' },
} as const

export type LegalPath = keyof typeof LEGAL_PAGES
export const isLegalPath = (p: string): p is LegalPath => p in LEGAL_PAGES
