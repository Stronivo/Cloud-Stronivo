import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

export { ROUTES, headTags } from './seo'

/** Used only at build time by scripts/prerender.mjs. */
export function render(path: string) {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  )
}
