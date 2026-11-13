/**
 * Stroniq fallback — inquiry wizard that works WITHOUT any AI API.
 * Used automatically when the AI assistant is not configured or unavailable.
 * Everything here is static: questions, options and the summary are built locally;
 * nothing leaves the browser until the visitor submits the inquiry with consent.
 */

export type WizardStep = {
  key: 'industry' | 'siteType' | 'features' | 'style' | 'budget' | 'timeline'
  question: string
  options: { label: string; value?: string; hint?: string }[]
  multi?: boolean
  /** free text typed in the composer is accepted as the answer */
  freeText?: boolean
}

export const WIZARD_INTRO =
  'Cześć! 👋 Pomogę Ci przygotować zapytanie o stronę internetową. Odpowiedz na 6 krótkich pytań — na końcu zobaczysz podsumowanie i sam zdecydujesz, czy je wysłać do zespołu Stronivo.'

export const WIZARD_STEPS: WizardStep[] = [
  {
    key: 'industry',
    question: '1/6 · Czym zajmuje się Twoja firma? Wybierz branżę albo wpisz ją poniżej.',
    freeText: true,
    options: [
      { label: 'Gastronomia' },
      { label: 'Usługi lokalne' },
      { label: 'Budownictwo / remonty' },
      { label: 'Uroda i zdrowie' },
      { label: 'Handel' },
      { label: 'Twórca / freelancer' },
    ],
  },
  {
    key: 'siteType',
    question: '2/6 · Jakiej strony potrzebujesz?',
    options: [
      { label: 'Landing page', value: 'landing_page', hint: 'jedna strona z jednym celem, np. zapytania o usługę' },
      { label: 'Strona firmowa', value: 'strona_firmowa', hint: 'kilka podstron: o firmie, oferta, kontakt' },
      { label: 'Strona restauracji / kawiarni', value: 'strona_restauracji', hint: 'menu, zdjęcia, godziny, dojazd, rezerwacje' },
      { label: 'Portfolio', value: 'portfolio', hint: 'prezentacja prac i realizacji' },
      { label: 'Odświeżenie obecnej strony', value: 'odswiezenie_strony', hint: 'nowy wygląd i lepsza wygoda' },
      { label: 'Nie wiem — doradźcie', value: 'inne', hint: 'zespół zaproponuje rozwiązanie' },
    ],
  },
  {
    key: 'features',
    question: '3/6 · Jakie funkcje są potrzebne? Zaznacz dowolne i kliknij „Dalej”.',
    multi: true,
    freeText: true,
    options: [
      { label: 'Formularz kontaktowy' },
      { label: 'Galeria zdjęć' },
      { label: 'Menu / cennik usług' },
      { label: 'Rezerwacje / zapisy' },
      { label: 'Mapa i dojazd' },
      { label: 'Blog / aktualności' },
      { label: 'Wersje językowe' },
      { label: 'Social media' },
    ],
  },
  {
    key: 'style',
    question: '4/6 · Jaki styl strony Ci odpowiada?',
    freeText: true,
    options: [
      { label: 'Nowoczesny i minimalistyczny' },
      { label: 'Elegancki / premium' },
      { label: 'Ciepły i przyjazny' },
      { label: 'Odważny i kreatywny' },
      { label: 'Nie wiem — zaproponujcie' },
    ],
  },
  {
    key: 'budget',
    question: '5/6 · Jaki masz orientacyjny budżet? (to Twoja informacja dla zespołu — możesz jej nie podawać)',
    freeText: true,
    options: [
      { label: 'Wolę nie podawać' },
      { label: 'Do 2 000 zł' },
      { label: '2 000–5 000 zł' },
      { label: '5 000–10 000 zł' },
      { label: 'Powyżej 10 000 zł' },
    ],
  },
  {
    key: 'timeline',
    question: '6/6 · Kiedy strona powinna być gotowa?',
    freeText: true,
    options: [{ label: 'Jak najszybciej' }, { label: 'W ciągu miesiąca' }, { label: '1–3 miesiące' }, { label: 'Bez pośpiechu' }],
  },
]

export type WizardAnswers = Partial<Record<WizardStep['key'], string | string[]>>
export type WizardState = { step: number; answers: WizardAnswers; pending: string[] }

export const WIZARD_START: WizardState = { step: 0, answers: {}, pending: [] }

const SITE_LABELS: Record<string, string> = Object.fromEntries(
  WIZARD_STEPS[1].options.map((o) => [o.value as string, o.label]),
)

/** Builds the same inquiry shape the AI assistant produces, so /api/lead handles both. */
export function wizardInquiry(a: WizardAnswers) {
  const text = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? '')).trim()
  const siteType = text(a.siteType) || 'inne'
  const features = Array.isArray(a.features) ? a.features : a.features ? [a.features] : []
  const industry = text(a.industry) || 'nie podano'
  const style = text(a.style) || 'nie podano'
  const budget = /nie podawać/i.test(text(a.budget)) ? 'nie podano' : text(a.budget) || 'nie podano'
  const timeline = text(a.timeline) || 'nie podano'
  const siteLabel = SITE_LABELS[siteType] ?? 'strona internetowa'
  const summary =
    `Branża: ${industry}. Rodzaj projektu: ${siteLabel.toLowerCase()}. ` +
    `${features.length ? `Potrzebne funkcje: ${features.join(', ')}. ` : ''}` +
    `Preferowany styl: ${style.toLowerCase()}. Budżet: ${budget}. Termin: ${timeline.toLowerCase()}.`
  return {
    site_type: siteType,
    industry,
    goal: 'nie podano',
    scope: `Styl: ${style}`,
    features,
    budget,
    timeline,
    summary,
  }
}
