import type { Business } from '@shared/types'
import type { Brand } from './TemplatePreview'

export function brandFromBusiness(b: Business | null, fallbackName: string): Brand {
  return {
    name: b?.name || fallbackName,
    primaryColor: b?.primaryColor ?? '#2563eb',
    secondaryColor: b?.secondaryColor ?? '#111827'
  }
}
