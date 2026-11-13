/**
 * Brand data. Contact details, company data and social profiles are read from
 * environment variables (VITE_*) so nothing is invented in the code. Empty
 * values are simply not rendered.
 */
const env = (k: string) => ((import.meta.env as Record<string, string | undefined>)[k] ?? '').trim()

export const BRAND = { name: 'EnglishPocket' }

export const CONTACT = {
  email: env('VITE_CONTACT_EMAIL'),
}

export const COMPANY = {
  name: env('VITE_COMPANY_NAME'),
  address: env('VITE_COMPANY_ADDRESS'),
  nip: env('VITE_COMPANY_NIP'),
}

export const SOCIALS = [
  { label: 'Instagram', href: env('VITE_SOCIAL_INSTAGRAM') },
  { label: 'TikTok', href: env('VITE_SOCIAL_TIKTOK') },
  { label: 'Facebook', href: env('VITE_SOCIAL_FACEBOOK') },
  { label: 'YouTube', href: env('VITE_SOCIAL_YOUTUBE') },
].filter((s) => s.href)

export const SECTIONS = [
  { id: 'start', key: 'home' },
  { id: 'materialy', key: 'materials' },
  { id: 'jak-to-dziala', key: 'how' },
  { id: 'o-nas', key: 'about' },
  { id: 'kontakt', key: 'contact' },
] as const
