import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICTS, type Dict, type Lang } from './dict'

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void; toggle: () => void }
const I18nContext = createContext<Ctx | null>(null)
const KEY = 'ep-lang'

function initialLang(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'en' || v === 'pl') return v
  } catch {
    /* storage unavailable */
  }
  return 'pl' // Polish is always the default, regardless of browser language
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const value = useMemo(
    () => ({ lang, t: DICTS[lang], setLang, toggle: () => setLang(lang === 'pl' ? 'en' : 'pl') }),
    [lang, setLang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n outside provider')
  return c
}
