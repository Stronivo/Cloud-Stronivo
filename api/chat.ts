/**
 * Vercel Function: /api/chat — Stroniq, the Stronivo AI assistant.
 *
 *   GET  → { available } — whether the assistant is configured (no secrets exposed).
 *   POST → { messages: [{ role: "user" | "assistant", content: string }] }
 *          streams NDJSON lines: {t:"text",v} · {t:"reset"} · {t:"inquiry",v} · {t:"error",code} · {t:"done"}
 *
 * Required: ANTHROPIC_API_KEY (server-side only, never sent to the browser).
 * Optional: STRONIQ_MODEL, STRONIQ_EFFORT, ALLOWED_ORIGINS, UPSTASH_REDIS_REST_URL/TOKEN and the
 * limits in api/_lib/stroniq/config.ts. See STRONIQ.md.
 *
 * Privacy: conversations are not stored and their content is never logged; only token usage
 * numbers are logged for cost monitoring.
 */
import Anthropic from '@anthropic-ai/sdk'
import { STRONIQ, SUPPORTS_FALLBACKS } from './_lib/stroniq/config.js'
import { PREPARE_INQUIRY_TOOL, SYSTEM_PROMPT, sanitizeInquiry } from './_lib/stroniq/prompt.js'
import { clientIp, json, originAllowed, rateLimit, readJson } from './_lib/guard.js'

export const maxDuration = 30

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export function GET(): Response {
  return json({ available: Boolean(process.env.ANTHROPIC_API_KEY), assistant: 'Stroniq' })
}

/** Validates the client-sent history and trims it to the configured window. */
function cleanHistory(raw: unknown): ChatTurn[] | 'too_long' | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { messages?: unknown }).messages)) return null
  const list = (raw as { messages: unknown[] }).messages
  if (list.length === 0 || list.length > STRONIQ.maxUserTurns * 2 + 2) return null
  const turns: ChatTurn[] = []
  for (const m of list) {
    if (!m || typeof m !== 'object') return null
    const { role, content } = m as { role?: unknown; content?: unknown }
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null
    const text = content.trim()
    if (!text) continue
    if (role === 'user' && text.length > STRONIQ.maxUserChars) return 'too_long'
    const clipped = role === 'assistant' ? text.slice(0, STRONIQ.maxAssistantChars) : text
    // merge consecutive same-role turns (keeps strict user/assistant alternation)
    const last = turns[turns.length - 1]
    if (last && last.role === role) last.content += `\n\n${clipped}`
    else turns.push({ role, content: clipped })
  }
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') return null
  if (turns.filter((t) => t.role === 'user').length > STRONIQ.maxUserTurns) return 'too_long'
  // keep the most recent window, starting on a user turn
  let window = turns.slice(-STRONIQ.maxHistoryMessages)
  while (window.length && window[0].role !== 'user') window = window.slice(1)
  return window
}

export async function POST(req: Request): Promise<Response> {
  if (!originAllowed(req)) return json({ error: 'forbidden' }, 403)
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503)

  const ip = clientIp(req)
  if (!(await rateLimit('chat-ip', ip, STRONIQ.chatPerIp, STRONIQ.chatWindowSec)))
    return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(STRONIQ.chatWindowSec) })
  if (!(await rateLimit('chat-day', 'all', STRONIQ.chatPerDay, 24 * 60 * 60)))
    return json({ error: 'busy' }, 503)

  const history = cleanHistory(await readJson(req, 64 * 1024))
  if (history === 'too_long') return json({ error: 'too_long' }, 413)
  if (!history) return json({ error: 'bad_request' }, 400)

  const client = new Anthropic({ maxRetries: 1, timeout: 25_000 })
  const useFallbacks = SUPPORTS_FALLBACKS(STRONIQ.model)

  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
      try {
        const stream = client.beta.messages.stream(
          {
            model: STRONIQ.model,
            max_tokens: STRONIQ.maxOutputTokens,
            // stable prefix (tools + system) → cached after the first request
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            tools: [PREPARE_INQUIRY_TOOL],
            output_config: { effort: STRONIQ.effort },
            messages: history,
            ...(useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
          },
          { signal: req.signal },
        )

        let sentText = false
        for await (const event of stream) {
          if (event.type === 'content_block_start' && (event.content_block as { type: string }).type === 'fallback') {
            // the primary model declined mid-answer and the fallback model takes over: restart the text
            send({ t: 'reset' })
            sentText = false
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ t: 'text', v: event.delta.text })
            sentText = true
          }
        }

        const final = await stream.finalMessage()
        console.log(
          `[stroniq] model=${final.model} stop=${final.stop_reason} in=${final.usage.input_tokens} ` +
            `cache_read=${final.usage.cache_read_input_tokens ?? 0} cache_write=${final.usage.cache_creation_input_tokens ?? 0} ` +
            `out=${final.usage.output_tokens}`,
        )

        if (final.stop_reason === 'refusal') {
          send({ t: 'error', code: 'refusal' })
        } else {
          const toolUse = final.content.find((b) => b.type === 'tool_use' && b.name === PREPARE_INQUIRY_TOOL.name)
          if (toolUse && toolUse.type === 'tool_use' && final.stop_reason !== 'max_tokens') {
            const inquiry = sanitizeInquiry(toolUse.input)
            if (inquiry) send({ t: 'inquiry', v: inquiry })
            else if (!sentText) send({ t: 'error', code: 'invalid_inquiry' })
          } else if (!sentText) {
            send({ t: 'error', code: 'empty' })
          }
        }
        send({ t: 'done' })
      } catch (err) {
        if (req.signal.aborted) return controller.close()
        let code = 'upstream'
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) code = 'not_configured'
        else if (err instanceof Anthropic.RateLimitError) code = 'busy'
        else if (err instanceof Anthropic.BadRequestError) code = 'bad_request'
        else if (err instanceof Anthropic.APIConnectionError) code = 'upstream'
        console.error(`[stroniq] error ${code} ${err instanceof Anthropic.APIError ? err.status : ''}`)
        send({ t: 'error', code })
      }
      controller.close()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
