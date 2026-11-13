import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import App from './App'

export { ROUTES, headTags } from './seo'
export { startHeroIntro } from './intro/heroIntro'

const tree = (path: string) => (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

/**
 * Build-time only (scripts/prerender.mjs). `prerender` waits for every lazy section.
 * progressiveChunkSize: Infinity keeps every Suspense boundary inline — otherwise React outlines
 * large ones as hidden segments swapped in by an inline script (content invisible without JS).
 */
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(tree(path), { progressiveChunkSize: Number.POSITIVE_INFINITY })
  const html = await new Response(prelude).text()
  if (html.includes('$RC') || html.includes('<template')) throw new Error(`incomplete prerender for ${path}`)
  return html
}
