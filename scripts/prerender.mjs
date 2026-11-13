// Build-time prerender: writes a complete, indexable HTML file for every route.
// Runs after `vite build` (client) and `vite build --ssr src/entry-server.tsx --outDir .ssr`.
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const ssrDir = join(root, '.ssr')

const { render, ROUTES, headTags } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

// Preload the display font used by the hero headline (latin + latin-ext for Polish letters).
const assets = readdirSync(join(dist, 'assets'))
const fonts = assets.filter((f) => /^space-grotesk-latin(-ext)?-wght-normal-.*\.woff2$/.test(f))
const preload = fonts
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`)
  .join('\n    ')

for (const route of ROUTES) {
  const appHtml = render(route.path)
  const html = template
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, headTags(route))
    .replace('<!--preload-->', preload)
    .replace('<!--app-->', appHtml)
  if (html.includes('<!--app-->') || !html.includes('<h1')) throw new Error(`prerender failed for ${route.path}`)
  writeFileSync(join(dist, route.file), html)
  console.log(`prerendered ${route.path.padEnd(22)} → dist/${route.file} (${(html.length / 1024).toFixed(1)} kB)`)
}

rmSync(ssrDir, { recursive: true, force: true })
