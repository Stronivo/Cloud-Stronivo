// Build-time prerender: writes a complete, indexable HTML file for every route.
// Runs after `vite build` (client) and `vite build --ssr src/entry-server.tsx --outDir .ssr`.
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const ssrDir = join(root, '.ssr')

const { render, ROUTES, headTags, startHeroIntro } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

// Preload the display font used by the hero headline (latin + latin-ext for Polish letters).
const assets = readdirSync(join(dist, 'assets'))
const fonts = assets.filter((f) => /^space-grotesk-latin(-ext-a)?-[\w-]+\.woff2$/.test(f))
const preload = fonts
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`)
  .join('\n    ')

// The hero intro engine is self-contained (see src/intro/heroIntro.ts) and is inlined at the
// end of the homepage so it starts right after parsing, without waiting for the JS bundle.
// The 4 s timer is a last-resort reveal in case anything throws.
// It starts right after the first frame is painted (rAF → setTimeout), so its first layout
// read finds a clean layout instead of forcing one before first paint.
const introScript =
  `<script>setTimeout(function(){document.documentElement.classList.add('intro-done')},4000);` +
  `requestAnimationFrame(function(){setTimeout(${startHeroIntro.toString()})})</script>`

// Inline the single stylesheet (~11 kB brotli): removes the render-blocking request.
// Measured on mobile Lighthouse: FCP 1.52 → 1.36 s, LCP 2.30 → 2.06 s, SI 1.74 → 1.63 s.
const cssLink = template.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/)
const css = readFileSync(join(dist, cssLink[1]), 'utf8')

for (const route of ROUTES) {
  const appHtml = await render(route.path)
  const html = template
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, headTags(route))
    .replace('<!--preload-->', preload)
    .replace('<!--app-->', appHtml)
    .replace(cssLink[0], () => `<style>${css}</style>`)
    .replace('</body>', () => (route.path === '/' ? `${introScript}\n  </body>` : '</body>'))
  if (html.includes('<!--app-->') || !html.includes('<h1')) throw new Error(`prerender failed for ${route.path}`)
  writeFileSync(join(dist, route.file), html)
  console.log(`prerendered ${route.path.padEnd(22)} → dist/${route.file} (${(html.length / 1024).toFixed(1)} kB)`)
}

rmSync(ssrDir, { recursive: true, force: true })
