import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { Film, ImageIcon, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MediaItem, MediaKind } from '@shared/types'
import { useStore } from '../store'

type Filter = 'all' | MediaKind

export function Library(): JSX.Element {
  const { t } = useTranslation()
  const media = useStore((s) => s.media)
  const importing = useStore((s) => s.importing)
  const importMedia = useStore((s) => s.importMedia)
  const removeMedia = useStore((s) => s.removeMedia)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [ffmpegMissing, setFfmpegMissing] = useState(false)

  useEffect(() => {
    void window.api.app.paths().then((p) => setFfmpegMissing(!p.ffmpeg))
  }, [])

  const visible = media.filter((m) => filter === 'all' || m.kind === filter)
  const selected = media.find((m) => m.id === selectedId) ?? null

  async function onDelete(item: MediaItem): Promise<void> {
    if (!window.confirm(t('common.confirmDelete'))) return
    await removeMedia(item.id)
    if (selectedId === item.id) setSelectedId(null)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('library.title')}</h1>
          <p className="mt-1 text-slate-600">{t('library.subtitle')}</p>
        </div>
        <button className="btn-primary" disabled={importing} onClick={() => void importMedia()}>
          <Upload size={16} />
          {importing ? t('library.importing') : t('library.import')}
        </button>
      </div>

      {ffmpegMissing && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {t('library.ffmpegMissing')}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        {(['all', 'image', 'video'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'rounded-full px-3 py-1 text-sm',
              filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            ].join(' ')}
          >
            {t(`library.filters.${f}`)}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400">{t('library.count', { count: visible.length })}</span>
      </div>

      <div className="mt-4 flex gap-6">
        <div className="flex-1">
          {visible.length === 0 ? (
            <div className="card flex min-h-64 items-center justify-center text-center text-slate-500">
              {t('library.empty')}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {visible.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    'group relative aspect-square overflow-hidden rounded-lg border bg-slate-200 text-left',
                    selectedId === item.id ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200'
                  ].join(' ')}
                >
                  {item.thumbUrl ? (
                    <img src={item.thumbUrl} alt={item.originalName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      {t('library.noThumb')}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 rounded bg-black/60 p-1 text-white">
                    {item.kind === 'video' ? <Film size={14} /> : <ImageIcon size={14} />}
                  </div>
                  {item.kind === 'video' && item.durationMs !== null && (
                    <div className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                      {formatDuration(item.durationMs)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && <DetailsPanel item={selected} onDelete={() => onDelete(selected)} />}
      </div>
    </div>
  )
}

function DetailsPanel({ item, onDelete }: { item: MediaItem; onDelete: () => void }): JSX.Element {
  const { t, i18n } = useTranslation()
  const updateMedia = useStore((s) => s.updateMedia)
  const [note, setNote] = useState(item.note)
  const [tags, setTags] = useState(item.tags.join(', '))

  useEffect(() => {
    setNote(item.note)
    setTags(item.tags.join(', '))
  }, [item.id, item.note, item.tags])

  function commit(): void {
    const parsedTags = tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (note !== item.note || parsedTags.join('|') !== item.tags.join('|')) {
      void updateMedia(item.id, { note, tags: parsedTags })
    }
  }

  return (
    <aside className="card w-72 shrink-0 self-start">
      <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('library.details')}</h2>
      <div className="mt-3 overflow-hidden rounded-lg bg-slate-100">
        {item.kind === 'video' ? (
          <video src={item.url} controls className="w-full" />
        ) : (
          <img src={item.url} alt={item.originalName} className="w-full" />
        )}
      </div>
      <div className="mt-3 truncate text-sm font-medium" title={item.originalName}>
        {item.originalName}
      </div>
      <dl className="mt-2 space-y-1 text-xs text-slate-500">
        <Row label={t('library.size')} value={formatBytes(item.sizeBytes)} />
        {item.width && item.height && <Row label={t('library.dimensions')} value={`${item.width} × ${item.height}`} />}
        {item.durationMs !== null && <Row label={t('library.duration')} value={formatDuration(item.durationMs)} />}
        <Row label={t('library.added')} value={new Date(item.createdAt + 'Z').toLocaleDateString(i18n.language)} />
      </dl>
      <div className="mt-4">
        <label className="field-label">{t('library.note')}</label>
        <textarea
          className="field-input min-h-16"
          placeholder={t('library.noteHint')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commit}
        />
      </div>
      <div className="mt-3">
        <label className="field-label">{t('library.tags')}</label>
        <input className="field-input" value={tags} onChange={(e) => setTags(e.target.value)} onBlur={commit} />
      </div>
      <button className="btn-danger mt-4 w-full justify-center" onClick={onDelete}>
        <Trash2 size={16} />
        {t('common.delete')}
      </button>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
