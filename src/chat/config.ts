/** Stroniq widget settings (UI side). Server-side settings live in api/_lib/stroniq/config.ts. */
export const CHAT = {
  name: 'Stroniq',
  role: 'Asystent AI Stronivo',
  greeting: 'Cześć! 👋 Jestem asystentem AI Stronivo. Pomogę Ci stworzyć idealną stronę internetową. W czym mogę pomóc?',
  /** "contact" is handled locally (always works, even when the AI is unavailable). */
  quickReplies: [
    { label: 'Chcę stronę internetową', send: 'Chcę stronę internetową.' },
    { label: 'Poznaj ofertę', send: 'Jaka jest oferta Stronivo?' },
    { label: 'Ile kosztuje strona?', send: 'Ile kosztuje strona internetowa?' },
    { label: 'Kontakt', action: 'contact' as const },
  ],
  endpoint: '/api/chat',
  leadEndpoint: '/api/lead',
  /** keep in sync with api/_lib/stroniq/config.ts */
  maxUserChars: 800,
  maxUserTurns: 30,
  /** conversation is kept only for the current browser tab (sessionStorage) */
  storageKey: 'stroniq:conversation:v1',
  email: 'kontakt@stronivo.com',
} as const
