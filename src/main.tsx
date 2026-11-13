import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'

const root = document.getElementById('root')!
const path = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/'
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.mjs) → hydrate; dev server → render.
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
