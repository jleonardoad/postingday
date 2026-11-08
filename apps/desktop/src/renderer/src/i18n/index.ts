import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { UiLanguage } from '@shared/types'
import es from './es.json'
import en from './en.json'

export async function initI18n(lng: UiLanguage): Promise<void> {
  if (i18next.isInitialized) {
    await i18next.changeLanguage(lng)
    return
  }
  await i18next.use(initReactI18next).init({
    lng,
    fallbackLng: 'es',
    resources: { es: { translation: es }, en: { translation: en } },
    interpolation: { escapeValue: false }
  })
}

export function setLanguage(lng: UiLanguage): Promise<unknown> {
  document.documentElement.lang = lng
  return i18next.changeLanguage(lng)
}
