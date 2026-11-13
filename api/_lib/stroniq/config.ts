/**
 * Stroniq — agent settings. Values can be overridden with environment variables (Vercel →
 * Settings → Environment Variables) without touching the code.
 */
const env = (k: string) => (process.env[k] ?? '').trim()
const int = (k: string, d: number) => {
  const n = Number.parseInt(env(k), 10)
  return Number.isFinite(n) && n > 0 ? n : d
}

export const STRONIQ = {
  /** Claude model. Default: claude-opus-5-5. A cheaper option is claude-haiku-5-5 (see STRONIQ.md). */
  model: env('STRONIQ_MODEL') || 'claude-opus-5-5',
  /** Thinking depth / token spend. "low" suits short sales chat; raise only if answers get worse. */
  effort: (['low', 'medium', 'high'].includes(env('STRONIQ_EFFORT')) ? env('STRONIQ_EFFORT') : 'low') as 'low' | 'medium' | 'high',
  /** Upper bound for one reply (includes the model's internal thinking). */
  maxOutputTokens: int('STRONIQ_MAX_OUTPUT_TOKENS', 2048),

  // ---- cost & abuse limits ----
  /** Only the last N messages are sent to the model (older context is dropped). */
  maxHistoryMessages: int('STRONIQ_MAX_HISTORY', 16),
  /** Max characters of a single visitor message. */
  maxUserChars: 800,
  /** Max characters of one assistant message echoed back by the client. */
  maxAssistantChars: 3000,
  /** Max visitor messages in one conversation, then the widget suggests contacting the team. */
  maxUserTurns: int('STRONIQ_MAX_TURNS', 30),
  /** Per IP: chat requests per window. */
  chatPerIp: int('STRONIQ_RATE_PER_IP', 20),
  chatWindowSec: 10 * 60,
  /** Per IP: submitted inquiries per hour. */
  leadsPerIp: 3,
  leadsWindowSec: 60 * 60,
  /** Global safety cap on chat requests per day (needs Upstash to be exact across instances). */
  chatPerDay: int('STRONIQ_DAILY_LIMIT', 2000),
} as const

/** Origins allowed to call the endpoints (comma-separated in ALLOWED_ORIGINS). */
export function allowedOrigins(): string[] {
  const list = (env('ALLOWED_ORIGINS') || 'https://www.stronivo.com,https://stronivo.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // the current Vercel deployment (previews) is always allowed
  if (env('VERCEL_URL')) list.push(`https://${env('VERCEL_URL')}`)
  if (env('VERCEL_BRANCH_URL')) list.push(`https://${env('VERCEL_BRANCH_URL')}`)
  if (env('VERCEL_ENV') !== 'production') list.push('http://localhost:5173', 'http://localhost:4173')
  return list
}

/** Models that support server-side refusal fallbacks (fallbacks: "default"). */
export const SUPPORTS_FALLBACKS = (model: string) =>
  ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5'].includes(model)
