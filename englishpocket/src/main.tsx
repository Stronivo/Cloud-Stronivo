import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import '@fontsource/dm-serif-display/400.css'
import '@fontsource/dm-serif-display/400-italic.css'
import './index.css'
import App from './App'
import { I18nProvider } from './i18n/I18n'
import { ShopProvider } from './lib/shop'

document.documentElement.classList.add('js')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ShopProvider>
        <App />
      </ShopProvider>
    </I18nProvider>
  </StrictMode>,
)
