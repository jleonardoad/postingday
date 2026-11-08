import type { JSX } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

export function Home(): JSX.Element {
  const { t } = useTranslation()
  const business = useStore((s) => s.business)
  const media = useStore((s) => s.media)
  const setView = useStore((s) => s.setView)

  const profileDone = Boolean(business?.name && business.description)
  const mediaDone = media.length >= 5

  const steps = [
    { key: 'profile', done: profileDone, onClick: () => setView('profile') },
    { key: 'media', done: mediaDone, onClick: () => setView('library') },
    { key: 'plan', done: false, onClick: () => setView('create') }
  ] as const

  const roadmap = t('home.roadmap', { returnObjects: true }) as string[]

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {business?.name ? t('home.greeting', { name: business.name }) : t('home.greetingAnon')}
      </h1>
      <p className="mt-1 text-slate-600">{t('home.intro')}</p>

      <div className="mt-8 space-y-3">
        {steps.map((step, i) => (
          <div key={step.key} className="card flex items-center gap-4">
            {step.done ? (
              <CheckCircle2 className="shrink-0 text-emerald-500" size={26} />
            ) : (
              <Circle className="shrink-0 text-slate-300" size={26} />
            )}
            <div className="flex-1">
              <div className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                {i + 1} · {step.done ? t('home.done') : t('home.pending')}
              </div>
              <div className="font-medium">{t(`home.steps.${step.key}.title`)}</div>
              <div className="text-sm text-slate-600">
                {t(`home.steps.${step.key}.desc`)}
                {step.key === 'media' && media.length > 0 && (
                  <span className="text-slate-400"> · {t('home.mediaCount', { count: media.length })}</span>
                )}
              </div>
            </div>
            <button
              className={step.done ? 'btn-secondary' : 'btn-primary'}
              disabled={!step.onClick}
              onClick={step.onClick}
            >
              {t(`home.steps.${step.key}.cta`)}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-medium tracking-wide text-slate-400 uppercase">
        {t('home.roadmapTitle')}
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
        {roadmap.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
