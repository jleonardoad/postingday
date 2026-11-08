import type { JSX } from 'react'
import { CalendarDays, ClipboardList, Home, Images, Layers, Settings, Sparkles, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore, type View } from '../store'

interface Item {
  view: View | null
  icon: typeof Home
  label: string
}

export function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  const items: Item[] = [
    { view: 'home', icon: Home, label: t('nav.home') },
    { view: 'create', icon: Sparkles, label: t('nav.create') },
    { view: 'pieces', icon: Layers, label: t('nav.pieces') },
    { view: 'profile', icon: Store, label: t('nav.profile') },
    { view: 'library', icon: Images, label: t('nav.library') },
    { view: null, icon: ClipboardList, label: t('nav.plan') },
    { view: null, icon: CalendarDays, label: t('nav.calendar') }
  ]

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="drag px-5 pt-12 pb-6">
        <div className="text-lg font-semibold tracking-tight text-white">PostingDay</div>
        <div className="mt-0.5 text-xs text-slate-400">{t('app.tagline')}</div>
      </div>
      <nav className="no-drag flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = item.view !== null && (item.view === view || (item.view === 'pieces' && view === 'piece'))
          const disabled = item.view === null
          const Icon = item.icon
          return (
            <button
              key={item.label}
              disabled={disabled}
              onClick={() => item.view && setView(item.view)}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
                disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-300' : ''
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {disabled && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                  {t('nav.soon')}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="no-drag px-3 pb-4">
        <button
          onClick={() => setView('settings')}
          className={[
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
            view === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          ].join(' ')}
        >
          <Settings size={18} strokeWidth={1.75} />
          <span>{t('nav.settings')}</span>
        </button>
      </div>
    </aside>
  )
}
