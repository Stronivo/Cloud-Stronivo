import { lazy } from 'react'

/**
 * Code-split chunks that the homepage on a phone never downloads:
 *  - LegalPage: only on /polityka-prywatnosci and /informacje-prawne,
 *  - Cursor: only for mouse users (desktop).
 * Homepage sections deliberately stay in the main bundle: splitting them was measured to add
 * ~10 requests before LCP and raised Lighthouse's simulated LCP by ~0.3 s with no real gain
 * (observed LCP unchanged). See PERFORMANCE.md.
 */
export const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })))
export const Cursor = lazy(() => import('./components/Cursor').then((m) => ({ default: m.Cursor })))
