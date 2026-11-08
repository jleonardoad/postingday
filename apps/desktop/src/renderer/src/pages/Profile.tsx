import { useEffect, useState, type FormEvent, type JSX, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CONTENT_LANGUAGES,
  NETWORKS,
  SECTORS,
  TONES,
  businessSchema,
  emptyBusiness,
  type BusinessInput,
  type Network
} from '@shared/types'
import { useStore } from '../store'

export function Profile(): JSX.Element {
  const { t, i18n } = useTranslation()
  const business = useStore((s) => s.business)
  const saveBusiness = useStore((s) => s.saveBusiness)
  const [form, setForm] = useState<BusinessInput>(emptyBusiness)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (business) {
      const { updatedAt: _ignored, ...input } = business
      setForm(input)
    }
  }, [business])

  function update<K extends keyof BusinessInput>(key: K, value: BusinessInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
    setStatus('idle')
  }

  function toggleNetwork(n: Network): void {
    update('networks', form.networks.includes(n) ? form.networks.filter((x) => x !== n) : [...form.networks, n])
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const parsed = businessSchema.safeParse(form)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setStatus('saving')
    try {
      await saveBusiness(parsed.data)
      setStatus('saved')
    } catch {
      setStatus('idle')
    }
  }

  const lastSaved = business?.updatedAt
    ? new Date(business.updatedAt + 'Z').toLocaleString(i18n.language === 'es' ? 'es' : 'en')
    : null

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('profile.title')}</h1>
          <p className="mt-1 text-slate-600">{t('profile.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-sm text-emerald-600">{t('common.saved')}</span>}
          <button type="submit" className="btn-primary" disabled={status === 'saving'}>
            {t('common.save')}
          </button>
        </div>
      </div>

      <Section title={t('profile.sections.basics')}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('profile.fields.name')} error={fieldErrors.name}>
            <input className="field-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Field>
          <Field label={t('profile.fields.city')}>
            <input className="field-input" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </Field>
          <Field label={t('profile.fields.sector')}>
            <select
              className="field-input"
              value={form.sector}
              onChange={(e) => update('sector', e.target.value as BusinessInput['sector'])}
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {t(`profile.sectors.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('profile.fields.language')}>
            <select
              className="field-input"
              value={form.language}
              onChange={(e) => update('language', e.target.value as BusinessInput['language'])}
            >
              {CONTENT_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {t(`profile.languages.${l}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('profile.fields.description')} hint={t('profile.fields.descriptionHint')} error={fieldErrors.description}>
          <textarea
            className="field-input min-h-24"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>
        <Field label={t('profile.fields.audience')} hint={t('profile.fields.audienceHint')}>
          <textarea className="field-input min-h-20" value={form.audience} onChange={(e) => update('audience', e.target.value)} />
        </Field>
      </Section>

      <Section title={t('profile.sections.voice')}>
        <Field label={t('profile.fields.tone')}>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <button
                type="button"
                key={tone}
                onClick={() => update('tone', tone)}
                className={[
                  'rounded-full border px-4 py-1.5 text-sm',
                  form.tone === tone
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                ].join(' ')}
              >
                {t(`profile.tones.${tone}`)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('profile.fields.neverSay')} hint={t('profile.fields.neverSayHint')}>
          <textarea className="field-input min-h-20" value={form.neverSay} onChange={(e) => update('neverSay', e.target.value)} />
        </Field>
      </Section>

      <Section title={t('profile.sections.offer')}>
        <Field label={t('profile.fields.starProducts')}>
          <textarea
            className="field-input min-h-28"
            value={form.starProducts}
            onChange={(e) => update('starProducts', e.target.value)}
          />
        </Field>
      </Section>

      <Section title={t('profile.sections.contact')}>
        <Field label={t('profile.fields.networks')}>
          <div className="flex flex-wrap gap-2">
            {NETWORKS.map((n) => (
              <label
                key={n}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm select-none',
                  form.networks.includes(n)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                ].join(' ')}
              >
                <input type="checkbox" className="sr-only" checked={form.networks.includes(n)} onChange={() => toggleNetwork(n)} />
                {t(`profile.networks.${n}`)}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('profile.fields.phone')}>
            <input className="field-input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
          <Field label={t('profile.fields.hours')}>
            <input className="field-input" value={form.hours} onChange={(e) => update('hours', e.target.value)} />
          </Field>
        </div>
        <Field label={t('profile.fields.address')}>
          <input className="field-input" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </Field>
      </Section>

      <Section title={t('profile.sections.brand')}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('profile.fields.primaryColor')} error={fieldErrors.primaryColor}>
            <ColorInput value={form.primaryColor} onChange={(v) => update('primaryColor', v)} />
          </Field>
          <Field label={t('profile.fields.secondaryColor')} error={fieldErrors.secondaryColor}>
            <ColorInput value={form.secondaryColor} onChange={(v) => update('secondaryColor', v)} />
          </Field>
        </div>
      </Section>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-xs text-slate-400">{lastSaved ? t('profile.lastSaved', { date: lastSaved }) : ''}</span>
        <button type="submit" className="btn-primary" disabled={status === 'saving'}>
          {t('common.save')}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="card mt-6 space-y-4">
      <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
      />
      <input className="field-input w-32 font-mono" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
