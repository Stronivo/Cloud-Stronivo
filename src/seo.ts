import { COMPANY, CONTACT, SOCIALS } from './data/site'

/**
 * Single source of truth for per-page metadata.
 * Used at build time by scripts/prerender.mjs to write static HTML for every route.
 *
 * The production domain answers on www (stronivo.com → 308 → www.stronivo.com),
 * so every absolute URL uses the www host to avoid canonicals that redirect.
 */
export const SITE_URL = 'https://www.stronivo.com'

export type RouteMeta = {
  path: string
  /** file written into dist/ ("index.html", "polityka-prywatnosci.html", "404.html") */
  file: string
  title: string
  description: string
  canonical?: string
  robots?: string
  ogType?: 'website' | 'article'
  jsonLd?: object
}

const OG_IMAGE = `${SITE_URL}/og-image.jpg`

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Stronivo',
  url: `${SITE_URL}/`,
  email: CONTACT.email,
  logo: `${SITE_URL}/favicon.svg`,
  image: OG_IMAGE,
  slogan: 'Podłączamy Twoją firmę do internetu.',
  description:
    'Stronivo projektuje i tworzy nowoczesne strony internetowe dla firm, restauracji i kawiarni z Żor i Śląska: strony firmowe, landing page, odświeżanie stron oraz SEO i optymalizację.',
  areaServed: [
    { '@type': 'City', name: 'Żory' },
    { '@type': 'AdministrativeArea', name: 'Województwo śląskie' },
  ],
  knowsAbout: ['tworzenie stron internetowych', 'projektowanie stron internetowych', 'landing page', 'SEO'],
  sameAs: SOCIALS.map((s) => s.href),
  // Stronivo is a brand; services are provided by this company (see /informacje-prawne).
  parentOrganization: {
    '@type': 'Organization',
    legalName: COMPANY.name,
    taxID: COMPANY.nip,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.street.replace(/^ul\.\s*/, 'ul. '),
      postalCode: COMPANY.city.split(' ')[0],
      addressLocality: COMPANY.city.split(' ').slice(1).join(' '),
      addressCountry: 'PL',
    },
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Usługi Stronivo',
    itemListElement: [
      'Strony internetowe dla firm',
      'Landing page',
      'Odświeżanie stron internetowych',
      'SEO i optymalizacja stron',
    ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, areaServed: 'Żory, Śląsk' } })),
  },
}

const website = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'Stronivo',
  inLanguage: 'pl-PL',
  publisher: { '@id': `${SITE_URL}/#organization` },
}

const page = (path: string, name: string, extra: object = {}) => ({
  '@type': 'WebPage',
  '@id': `${SITE_URL}${path}#webpage`,
  url: `${SITE_URL}${path}`,
  name,
  inLanguage: 'pl-PL',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  ...extra,
})

export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    file: 'index.html',
    title: 'Tworzenie Stron Internetowych Żory | Stronivo',
    description:
      'Projektujemy nowoczesne strony internetowe dla małych firm, restauracji i kawiarni. Stronivo – strony dopasowane do Twojego biznesu. Poznaj ofertę!',
    canonical: `${SITE_URL}/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [organization, website, page('/', 'Tworzenie Stron Internetowych Żory | Stronivo', { about: { '@id': `${SITE_URL}/#organization` } })],
    },
  },
  {
    path: '/polityka-prywatnosci',
    file: 'polityka-prywatnosci.html',
    title: 'Polityka prywatności | Stronivo',
    description:
      'Polityka prywatności Stronivo: jakie dane przetwarzamy przy kontakcie przez formularz, w jakim celu, jak długo je przechowujemy i jakie prawa Ci przysługują.',
    canonical: `${SITE_URL}/polityka-prywatnosci`,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      ...page('/polityka-prywatnosci', 'Polityka prywatności | Stronivo', { dateModified: '2026-11-12' }),
    },
  },
  {
    path: '/informacje-prawne',
    file: 'informacje-prawne.html',
    title: 'Informacje prawne | Stronivo',
    description:
      'Informacje prawne Stronivo: dane przedsiębiorcy świadczącego usługi pod marką Stronivo, kontakt oraz linki do profili w mediach społecznościowych.',
    canonical: `${SITE_URL}/informacje-prawne`,
    ogType: 'article',
    jsonLd: { '@context': 'https://schema.org', ...page('/informacje-prawne', 'Informacje prawne | Stronivo') },
  },
  {
    path: '/404',
    file: '404.html',
    title: 'Nie znaleziono strony | Stronivo',
    description: 'Ta strona nie istnieje. Wróć na stronę główną Stronivo.',
    robots: 'noindex, follow',
  },
]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** <head> tags for one route. */
export function headTags(r: RouteMeta): string {
  const url = r.canonical ?? `${SITE_URL}${r.path}`
  const tags = [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    r.robots ? `<meta name="robots" content="${r.robots}" />` : '',
    r.canonical ? `<link rel="canonical" href="${r.canonical}" />` : '',
    `<meta property="og:type" content="${r.ogType ?? 'website'}" />`,
    `<meta property="og:locale" content="pl_PL" />`,
    `<meta property="og:site_name" content="Stronivo" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Logo Stronivo z limonkowym przewodem i hasłem: Podłączamy Twoją firmę do internetu." />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    r.jsonLd ? `<script type="application/ld+json">${JSON.stringify(r.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

export const routeForPath = (path: string) => ROUTES.find((r) => r.path === path) ?? ROUTES[ROUTES.length - 1]
