import { useEffect, useMemo, useState, type JSX } from 'react'
import { ArrowLeft, Check, Film, ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FORMATS, type ContentFormat, type OutputKind } from '@shared/formats'
import { IMAGE_STYLES, type ImageStyle, type MediaItem } from '@shared/types'
import { brandFromBusiness } from '../templates/brand'
import { TemplatePreview, type Brand, type PreviewTexts } from '../templates/TemplatePreview'
import { useStore } from '../store'

/** Textos de ejemplo del formato, rellenados con los datos del negocio */
function useSampleTexts(): (f: ContentFormat) => PreviewTexts {
  const { t } = useTranslation()
  const business = useStore((s) => s.business)
  return (f) => {
    const product = business?.starProducts.split('\n').map((s) => s.trim()).find(Boolean) || t('create.defaults.product')
    const vars = { product, business: business?.name || t('create.defaults.business'), city: business?.city || t('create.defaults.city') }
    const k = (key: string, fallback = ''): string => {
      const full = `formats.${f.id}.sample.${key}`
      const v = t(full, vars)
      return v === full ? fallback : v
    }
    return {
      kicker: k('kicker'),
      headline: k('headline'),
      sub: k('sub'),
      cta: k('cta', t('create.defaults.cta')),
      badge: k('badge') || undefined,
      labelA: k('labelA') || undefined,
      labelB: k('labelB') || undefined
    }
  }
}

export function Create(): JSX.Element {
  const { t } = useTranslation()
  const media = useStore((s) => s.media)
  const business = useStore((s) => s.business)
  const brand = brandFromBusiness(business, t('create.defaults.business'))
  const sample = useSampleTexts()
  const initialFormat = useStore((s) => s.initialFormat)
  const [selectedId, setSelectedId] = useState<string | null>(initialFormat)
  const images = useMemo(() => media.filter((m) => m.kind === 'image'), [media])
  const defaultPhotos = useMemo(() => images.slice(0, 2).map((m) => m.thumbUrl ?? m.url), [images])

  const selected = FORMATS.find((f) => f.id === selectedId) ?? null
  if (selected) {
    return <FormatDetail format={selected} brand={brand} images={images} texts={sample(selected)} onBack={() => setSelectedId(null)} />
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t('create.title')}</h1>
      <p className="mt-1 text-slate-600">{t('create.subtitle')}</p>

      <div className="card mt-6 flex items-start gap-4 border-brand-100 bg-brand-50/60">
        <Sparkles className="mt-0.5 shrink-0 text-brand-600" size={22} />
        <div className="text-sm text-slate-700">
          <div className="font-medium text-slate-900">{t('create.how.title')}</div>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>{t('create.how.step1')}</li>
            <li>{t('create.how.step2')}</li>
            <li>{t('create.how.step3')}</li>
          </ol>
        </div>
      </div>

      {images.length === 0 && <p className="mt-4 text-sm text-slate-500">{t('create.noPhotos')}</p>}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedId(f.id)}
            className="card group flex flex-col p-0 text-left transition-shadow hover:shadow-md focus:ring-2 focus:ring-brand-100 focus:outline-none"
          >
            <div className="flex h-64 items-center justify-center rounded-t-xl bg-slate-100 p-4">
              <TemplatePreview
                kind={f.kind}
                ratio={f.preview}
                brand={brand}
                photos={defaultPhotos}
                texts={sample(f)}
                width={f.preview === 'reel' ? 126 : 200}
                className="shadow-md"
              />
            </div>
            <div className="p-4">
              <div className="font-medium">{t(`formats.${f.id}.name`)}</div>
              <div className="mt-0.5 text-sm text-slate-600">{t(`formats.${f.id}.desc`)}</div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                <Needs format={f} />
                {f.outputs.map((o) => (
                  <OutputChip key={o} kind={o} />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Needs({ format }: { format: ContentFormat }): JSX.Element {
  const { t } = useTranslation()
  const parts: string[] = []
  if (format.needs.photos) parts.push(t('create.needs.photos', { count: format.needs.photos }))
  if (format.needs.clips) parts.push(t('create.needs.clips', { count: format.needs.clips }))
  return <span className="rounded bg-slate-100 px-1.5 py-0.5">{t('create.needs.label')} {parts.join(' + ')}</span>
}

export function OutputChip({ kind }: { kind: OutputKind }): JSX.Element {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">
      {kind === 'reel' ? <Film size={11} /> : <ImageIcon size={11} />}
      {t(`create.outputs.${kind}`)}
    </span>
  )
}

function FormatDetail({
  format,
  brand,
  images,
  texts,
  onBack
}: {
  format: ContentFormat
  brand: Brand
  images: MediaItem[]
  texts: PreviewTexts
  onBack: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const generate = useStore((s) => s.generate)
  const generating = useStore((s) => s.generating)
  const generateImage = useStore((s) => s.generateImage)
  const generatingImage = useStore((s) => s.generatingImage)
  const openPiece = useStore((s) => s.openPiece)
  const aiStatus = useStore((s) => s.aiStatus)
  const business = useStore((s) => s.business)
  const max = Math.max(1, format.needs.photos)
  const [chosen, setChosen] = useState<number[]>([])
  const [ratio, setRatio] = useState<OutputKind>(format.preview)
  const [topic, setTopic] = useState('')
  const [imageStyle, setImageStyle] = useState<ImageStyle>('studio')

  // Propone el producto estrella como tema en cuanto el negocio esté cargado (solo si el campo sigue vacío)
  useEffect(() => {
    const star = business?.starProducts.split('\n').map((s) => s.trim()).find(Boolean)
    if (star) setTopic((cur) => cur || star)
  }, [business])

  async function onGenerateImage(): Promise<void> {
    if (topic.trim().length < 2) return
    const item = await generateImage({ topic: topic.trim(), style: imageStyle, ratio })
    if (item) setChosen((c) => [item.id, ...c].slice(0, max))
  }

  // Preselecciona las primeras fotos en cuanto la biblioteca esté cargada
  useEffect(() => {
    if (chosen.length === 0 && images.length > 0) setChosen(images.slice(0, max).map((m) => m.id))
  }, [images, max, chosen.length])

  const photos = chosen
    .map((id) => images.find((m) => m.id === id))
    .filter((m): m is MediaItem => Boolean(m))
    .map((m) => m.url)

  function toggle(id: number): void {
    setChosen((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id)
      const next = [...c, id]
      return next.length > max ? next.slice(next.length - max) : next
    })
  }

  async function onGenerate(): Promise<void> {
    const piece = await generate({ formatId: format.id, mediaIds: chosen, ratio, topic: topic.trim() || undefined })
    if (piece) openPiece(piece.id)
  }

  return (
    <div>
      <button onClick={onBack} className="no-drag mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={16} /> {t('create.back')}
      </button>
      <div className="flex gap-8">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t(`formats.${format.id}.name`)}</h1>
          <p className="mt-1 text-slate-600">{t(`formats.${format.id}.long`)}</p>

          <div className="card mt-6">
            <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('create.detail.needsTitle')}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
              <Needs format={format} />
              {format.outputs.map((o) => (
                <OutputChip key={o} kind={o} />
              ))}
            </div>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>{t('create.detail.step1')}</li>
              <li>{t('create.detail.step2')}</li>
              <li>{t('create.detail.step3')}</li>
            </ol>
          </div>

          <div className="card mt-4">
            <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('create.detail.topicTitle')}</h2>
            <input
              className="field-input mt-2"
              placeholder={t('create.detail.topicPlaceholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="field-hint">{t('create.detail.topicHint')}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="field-input w-auto" value={imageStyle} onChange={(e) => setImageStyle(e.target.value as ImageStyle)}>
                {IMAGE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {t(`create.detail.imageStyles.${s}`)}
                  </option>
                ))}
              </select>
              <button className="btn-secondary" disabled={generatingImage || topic.trim().length < 2} onClick={() => void onGenerateImage()}>
                {generatingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                {generatingImage ? t('create.detail.generatingImage') : t('create.detail.generateImage')}
              </button>
              <span className="text-xs text-slate-500">
                {aiStatus?.images.provider === 'openai' ? t('create.detail.imageAi', { model: aiStatus.images.model }) : t('create.detail.imageMock')}
              </span>
            </div>
          </div>

          <div className="card mt-4">
            <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">
              {t('create.detail.choosePhotos', { count: max })}
            </h2>
            {images.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{t('create.noPhotos')}</p>
            ) : (
              <div className="mt-3 grid grid-cols-6 gap-2">
                {images.map((m) => {
                  const idx = chosen.indexOf(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className={[
                        'relative aspect-square overflow-hidden rounded-md border-2',
                        idx >= 0 ? 'border-brand-600' : 'border-transparent hover:border-slate-300'
                      ].join(' ')}
                    >
                      <img src={m.thumbUrl ?? m.url} alt="" className="h-full w-full object-cover" />
                      {m.tags.includes('ia') && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-semibold tracking-wide text-white uppercase">
                          {t('library.aiBadge')}
                        </span>
                      )}
                      {idx >= 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                          {max > 1 ? idx + 1 : <Check size={12} />}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button className="btn-primary" disabled={generating} onClick={() => void onGenerate()}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? t('create.detail.generating') : t('create.detail.generate')}
            </button>
            <span className="text-xs text-slate-500">
              {aiStatus?.provider === 'claude' ? t('create.detail.aiClaude', { model: aiStatus.model }) : t('create.detail.aiMock')}
            </span>
          </div>
        </div>

        <div className="w-80 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('create.detail.preview')}</span>
            <div className="flex gap-1">
              {format.outputs.map((o) => (
                <button
                  key={o}
                  onClick={() => setRatio(o)}
                  className={[
                    'rounded px-2 py-0.5 text-xs',
                    ratio === o ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                  ].join(' ')}
                >
                  {t(`create.outputs.${o}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center rounded-xl bg-slate-100 p-4">
            <TemplatePreview kind={format.kind} ratio={ratio} brand={brand} photos={photos} texts={texts} width={ratio === 'reel' ? 220 : 280} className="shadow-lg" />
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">{t('create.detail.previewNote')}</p>
        </div>
      </div>
    </div>
  )
}
