import { useEffect, useState, type JSX } from 'react'
import { ArrowLeft, CheckCircle2, Download, FolderOpen, Loader2, RefreshCw, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FORMATS, type OutputKind } from '@shared/formats'
import type { Piece, PieceTexts } from '@shared/types'
import { brandFromBusiness } from '../templates/brand'
import { TemplatePreview } from '../templates/TemplatePreview'
import { useStore } from '../store'

type TextField = keyof PieceTexts

export function PieceEditor(): JSX.Element {
  const { t } = useTranslation()
  const pieceId = useStore((s) => s.pieceId)
  const piece = useStore((s) => s.pieces.find((p) => p.id === s.pieceId) ?? null)
  const piecesLoaded = useStore((s) => s.piecesLoaded)
  const setView = useStore((s) => s.setView)

  if (!piecesLoaded) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!piece || pieceId === null) {
    return (
      <div>
        <button onClick={() => setView('pieces')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> {t('piece.back')}
        </button>
        <p className="mt-6 text-slate-500">{t('piece.notFound')}</p>
      </div>
    )
  }
  return <Editor key={piece.id} piece={piece} />
}

function Editor({ piece }: { piece: Piece }): JSX.Element {
  const { t, i18n } = useTranslation()
  const business = useStore((s) => s.business)
  const media = useStore((s) => s.media)
  const generating = useStore((s) => s.generating)
  const exporting = useStore((s) => s.exporting)
  const generate = useStore((s) => s.generate)
  const updatePiece = useStore((s) => s.updatePiece)
  const exportPiece = useStore((s) => s.exportPiece)
  const setView = useStore((s) => s.setView)

  const format = FORMATS.find((f) => f.id === piece.formatId) ?? FORMATS[0]
  const brand = brandFromBusiness(business, t('create.defaults.business'))
  const photos = piece.mediaIds.map((id) => media.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u))

  const [texts, setTexts] = useState<PieceTexts>(piece.texts)
  const [caption, setCaption] = useState(piece.caption)
  const [hashtags, setHashtags] = useState(piece.hashtags.join(' '))
  const [ratio, setRatio] = useState<OutputKind>(piece.ratio)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Si la pieza cambia desde fuera (regenerar), refresca el formulario
  useEffect(() => {
    setTexts(piece.texts)
    setCaption(piece.caption)
    setHashtags(piece.hashtags.join(' '))
  }, [piece.updatedAt, piece.texts, piece.caption, piece.hashtags])

  const fields: TextField[] = ['kicker', 'headline', 'sub', 'cta', ...format.extraFields]

  function parsedHashtags(): string[] {
    return hashtags
      .split(/[\s,]+/)
      .map((h) => h.trim().replace(/^#+/, ''))
      .filter(Boolean)
      .map((h) => `#${h}`)
  }

  async function save(): Promise<void> {
    const cleanTexts: PieceTexts = { ...texts }
    for (const k of ['badge', 'labelA', 'labelB'] as const) if (!cleanTexts[k]) delete cleanTexts[k]
    await updatePiece(piece.id, { texts: cleanTexts, caption, hashtags: parsedHashtags(), ratio })
    setSavedAt(Date.now())
  }

  async function regenerate(): Promise<void> {
    await generate({ formatId: piece.formatId, mediaIds: piece.mediaIds, ratio, pieceId: piece.id })
  }

  async function toggleApprove(): Promise<void> {
    await save()
    await updatePiece(piece.id, { status: piece.status === 'approved' ? 'draft' : 'approved' })
  }

  async function onExport(): Promise<void> {
    await save()
    await exportPiece(piece.id, ratio)
  }

  const approved = piece.status === 'approved'

  return (
    <div>
      <button onClick={() => setView('pieces')} className="no-drag mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={16} /> {t('piece.back')}
      </button>

      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t(`formats.${format.id}.name`)}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {piece.provider === 'mock' ? t('piece.mockNote') : t('piece.claudeNote')}
                {savedAt && <span className="ml-2 text-emerald-600">{t('common.saved')}</span>}
              </p>
            </div>
            <span
              className={[
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                approved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              ].join(' ')}
            >
              {t(`pieces.status.${piece.status}`)}
            </span>
          </div>

          <div className="card mt-6 space-y-4">
            <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('piece.sections.design')}</h2>
            {fields.map((field) => (
              <div key={field}>
                <label className="field-label">{t(`piece.fields.${field}`)}</label>
                <input
                  className="field-input"
                  value={texts[field] ?? ''}
                  onChange={(e) => setTexts((x) => ({ ...x, [field]: e.target.value }))}
                  onBlur={() => void save()}
                />
              </div>
            ))}
          </div>

          <div className="card mt-4 space-y-4">
            <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('piece.sections.caption')}</h2>
            <div>
              <label className="field-label">{t('piece.fields.caption')}</label>
              <textarea className="field-input min-h-32" value={caption} onChange={(e) => setCaption(e.target.value)} onBlur={() => void save()} />
              <div className="field-hint">{t('piece.captionHint')}</div>
            </div>
            <div>
              <label className="field-label">{t('piece.fields.hashtags')}</label>
              <input className="field-input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} onBlur={() => void save()} />
              <div className="field-hint">{t('piece.hashtagsHint')}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-secondary" disabled={generating} onClick={() => void regenerate()}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {generating ? t('piece.regenerating') : t('piece.regenerate')}
            </button>
            <button className="btn-secondary" disabled={exporting} onClick={() => void onExport()}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? t('piece.exporting') : t('piece.export')}
            </button>
            <button className={approved ? 'btn-secondary' : 'btn-primary'} onClick={() => void toggleApprove()}>
              {approved ? <Undo2 size={16} /> : <CheckCircle2 size={16} />}
              {approved ? t('piece.unapprove') : t('piece.approve')}
            </button>
          </div>

          {piece.exportPath && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              <span className="min-w-0 flex-1 truncate">
                {t('piece.exported')} <span className="font-mono text-xs">{piece.exportPath}</span>
              </span>
              <button className="inline-flex shrink-0 items-center gap-1 font-medium underline" onClick={() => void window.api.app.reveal(piece.exportPath!)}>
                <FolderOpen size={14} /> {t('piece.reveal')}
              </button>
            </div>
          )}
          {approved && <p className="mt-3 text-xs text-slate-500">{t('piece.approvedNote')}</p>}
        </div>

        <div className="w-80 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('piece.preview')}</span>
            <div className="flex gap-1">
              {format.outputs.map((o) => (
                <button
                  key={o}
                  onClick={() => setRatio(o)}
                  className={['rounded px-2 py-0.5 text-xs', ratio === o ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'].join(' ')}
                >
                  {t(`create.outputs.${o}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center rounded-xl bg-slate-100 p-4">
            <TemplatePreview kind={format.kind} ratio={ratio} brand={brand} photos={photos} texts={texts} width={ratio === 'reel' ? 220 : 280} className="shadow-lg" />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {t('piece.updated', { date: new Date(piece.updatedAt + 'Z').toLocaleString(i18n.language) })}
          </p>
        </div>
      </div>
    </div>
  )
}
