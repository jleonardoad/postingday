import type { JSX } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FORMATS } from '@shared/formats'
import { brandFromBusiness } from '../templates/brand'
import { TemplatePreview } from '../templates/TemplatePreview'
import { useStore } from '../store'

export function Pieces(): JSX.Element {
  const { t, i18n } = useTranslation()
  const pieces = useStore((s) => s.pieces)
  const media = useStore((s) => s.media)
  const business = useStore((s) => s.business)
  const openPiece = useStore((s) => s.openPiece)
  const removePiece = useStore((s) => s.removePiece)
  const setView = useStore((s) => s.setView)
  const brand = brandFromBusiness(business, t('create.defaults.business'))

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('pieces.title')}</h1>
          <p className="mt-1 text-slate-600">{t('pieces.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => setView('create')}>
          <Sparkles size={16} /> {t('pieces.new')}
        </button>
      </div>

      {pieces.length === 0 ? (
        <div className="card mt-6 flex min-h-48 items-center justify-center text-center text-slate-500">{t('pieces.empty')}</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {pieces.map((p) => {
            const format = FORMATS.find((f) => f.id === p.formatId) ?? FORMATS[0]
            const photos = p.mediaIds.map((id) => media.find((m) => m.id === id)).map((m) => m?.thumbUrl ?? m?.url ?? '').filter(Boolean)
            return (
              <div key={p.id} className="card flex gap-4 p-4">
                <button onClick={() => openPiece(p.id)} className="shrink-0">
                  <TemplatePreview kind={format.kind} ratio={p.ratio} brand={brand} photos={photos} texts={p.texts} width={p.ratio === 'reel' ? 84 : 128} className="shadow" />
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => openPiece(p.id)} className="text-left">
                    <div className="font-medium">{t(`formats.${format.id}.name`)}</div>
                    <div className="mt-0.5 line-clamp-2 text-sm text-slate-600">{p.texts.headline}</div>
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={['rounded-full px-2 py-0.5 font-medium', p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'].join(' ')}>
                      {t(`pieces.status.${p.status}`)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{t(`pieces.provider.${p.provider}`)}</span>
                    <span className="text-slate-400">{new Date(p.updatedAt + 'Z').toLocaleDateString(i18n.language)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary px-3 py-1 text-xs" onClick={() => openPiece(p.id)}>
                      {t('pieces.open')}
                    </button>
                    <button
                      className="btn-danger px-3 py-1 text-xs"
                      onClick={() => {
                        if (window.confirm(t('pieces.confirmDelete'))) void removePiece(p.id)
                      }}
                    >
                      <Trash2 size={13} /> {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
