import { useEffect, useState, type JSX } from 'react'
import { ImageIcon, Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IMAGE_STYLES, type ImageStyle } from '@shared/types'
import { useStore } from '../store'

/**
 * Diálogo «Crear imagen con IA» desde la Biblioteca: producto o tema + estilo.
 * La imagen generada se guarda en la biblioteca con etiqueta «IA».
 */
export function GenerateImageModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { t } = useTranslation()
  const business = useStore((s) => s.business)
  const aiStatus = useStore((s) => s.aiStatus)
  const generateImage = useStore((s) => s.generateImage)
  const generatingImage = useStore((s) => s.generatingImage)
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState<ImageStyle>('studio')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    const star = business?.starProducts.split('\n').map((s) => s.trim()).find(Boolean)
    if (star) setTopic((cur) => cur || star)
  }, [business])

  async function run(): Promise<void> {
    if (topic.trim().length < 2) return
    setDone(null)
    const item = await generateImage({ topic: topic.trim(), style, ratio: 'post' })
    if (item) setDone(item.originalName)
  }

  const note =
    aiStatus?.images.provider === 'openai'
      ? t('create.detail.imageAi', { model: aiStatus.images.model })
      : aiStatus?.images.provider === 'sdcpp'
        ? t('create.detail.imageEngine', { model: aiStatus.images.engine.model })
        : aiStatus?.images.provider === 'local'
          ? t('create.detail.imageLocal')
          : t('create.detail.imageMock')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-6" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles size={20} className="text-brand-600" /> {t('imageModal.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t('imageModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5">
          <label className="field-label">{t('imageModal.topic')}</label>
          <input
            className="field-input"
            autoFocus
            placeholder={t('create.detail.topicPlaceholder')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void run()
            }}
          />
        </div>
        <div className="mt-3">
          <label className="field-label">{t('imageModal.style')}</label>
          <select className="field-input" value={style} onChange={(e) => setStyle(e.target.value as ImageStyle)}>
            {IMAGE_STYLES.map((s) => (
              <option key={s} value={s}>
                {t(`create.detail.imageStyles.${s}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" disabled={generatingImage || topic.trim().length < 2} onClick={() => void run()}>
            {generatingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            {generatingImage ? t('create.detail.generatingImage') : t('imageModal.generate')}
          </button>
          {done && <span className="text-sm text-emerald-700">{t('imageModal.done')}</span>}
        </div>
        <p className="mt-3 text-xs text-slate-500">{note}</p>
        {generatingImage && <p className="mt-2 text-xs text-slate-400">{t('imageModal.wait')}</p>}
      </div>
    </div>
  )
}
