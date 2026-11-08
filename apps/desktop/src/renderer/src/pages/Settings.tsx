import { useEffect, useState, type JSX } from 'react'
import { Download, FolderOpen, KeyRound, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  IMAGE_PROVIDER_MODES,
  TEXT_PROVIDER_MODES,
  UI_LANGUAGES,
  type AppPaths,
  type AppSettings,
  type KeyName,
  type UiLanguage
} from '@shared/types'
import { useStore } from '../store'

export function Settings(): JSX.Element {
  const { t } = useTranslation()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const loadAiStatus = useStore((s) => s.loadAiStatus)
  const aiStatus = useStore((s) => s.aiStatus)
  const [paths, setPaths] = useState<AppPaths | null>(null)
  const [version, setVersion] = useState('')
  const [localUrl, setLocalUrl] = useState(settings.localImageUrl)
  const installEngine = useStore((s) => s.installEngine)
  const installingEngine = useStore((s) => s.installingEngine)
  const engineProgress = useStore((s) => s.engineProgress)

  useEffect(() => {
    void window.api.app.paths().then(setPaths)
    void window.api.app.version().then(setVersion)
    void loadAiStatus()
  }, [loadAiStatus])

  useEffect(() => setLocalUrl(settings.localImageUrl), [settings.localImageUrl])

  async function change(patch: Partial<AppSettings>): Promise<void> {
    await updateSettings(patch)
    await loadAiStatus()
  }

  const source = (s: 'env' | 'settings' | null): string => (s === 'env' ? t('settings.ai.sourceEnv') : t('settings.ai.sourceSettings'))

  const textStatus = !aiStatus
    ? t('common.loading')
    : aiStatus.provider === 'claude'
      ? t('settings.ai.statusClaude', { model: aiStatus.model, source: source(aiStatus.keySource) })
      : aiStatus.provider === 'ollama'
        ? t('settings.ai.statusOllama', { model: aiStatus.model })
        : t('settings.ai.statusMock')

  const imageStatus = !aiStatus
    ? t('common.loading')
    : aiStatus.images.provider === 'openai'
      ? t('settings.ai.imageStatusOn', { model: aiStatus.images.model, source: source(aiStatus.images.keySource) })
      : aiStatus.images.provider === 'sdcpp'
        ? t('settings.ai.imageStatusEngine', { model: aiStatus.images.engine.model })
        : aiStatus.images.provider === 'local'
          ? t('settings.ai.imageStatusLocal', { url: aiStatus.images.local.url })
          : t('settings.ai.imageStatusMock')

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <section className="card mt-6">
        <label className="field-label">{t('settings.language')}</label>
        <select className="field-input max-w-xs" value={settings.uiLanguage} onChange={(e) => void change({ uiLanguage: e.target.value as UiLanguage })}>
          {UI_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l === 'es' ? 'Español' : 'English'}
            </option>
          ))}
        </select>
      </section>

      {/* ---------- Textos ---------- */}
      <section className="card mt-4 space-y-5">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">
          {t('settings.ai.title')} · {t('settings.ai.textTitle')}
        </h2>
        <p className="text-sm text-slate-700">{textStatus}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">{t('settings.ai.mode')}</label>
            <select className="field-input" value={settings.textProvider} onChange={(e) => void change({ textProvider: e.target.value as AppSettings['textProvider'] })}>
              {TEXT_PROVIDER_MODES.map((m) => (
                <option key={m} value={m}>
                  {t(`settings.ai.modes.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('settings.ai.ollamaModel')}</label>
            <select
              className="field-input"
              value={settings.ollamaModel}
              disabled={!aiStatus?.ollama.models.length}
              onChange={(e) => void change({ ollamaModel: e.target.value })}
            >
              <option value="">{t('settings.ai.ollamaAuto')}</option>
              {aiStatus?.ollama.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="field-hint">
              {!aiStatus
                ? ''
                : aiStatus.ollama.models.length
                  ? t('settings.ai.ollamaReady', { count: aiStatus.ollama.models.length })
                  : aiStatus.ollama.available
                    ? t('settings.ai.ollamaNone')
                    : t('settings.ai.ollamaNone') + ' · ' + t('settings.ai.ollamaOff')}
            </div>
          </div>
        </div>

        <KeyField
          name="anthropic"
          label={t('settings.ai.keyLabel')}
          hint={t('settings.ai.keyHint')}
          placeholder="sk-ant-…"
          canRemove={aiStatus?.keySource === 'settings'}
          onSaved={loadAiStatus}
        />
      </section>

      {/* ---------- Imágenes ---------- */}
      <section className="card mt-4 space-y-5">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">
          {t('settings.ai.title')} · {t('settings.ai.imageTitle')}
        </h2>
        <p className="text-sm text-slate-700">{imageStatus}</p>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">{t('settings.ai.engineTitle', { model: aiStatus?.images.engine.model ?? 'Z-Image-Turbo' })}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {!aiStatus
                  ? ''
                  : !aiStatus.images.engine.supported
                    ? t('settings.ai.engineUnsupported')
                    : aiStatus.images.engine.installed
                      ? aiStatus.images.engine.running
                        ? t('settings.ai.engineRunning')
                        : t('settings.ai.engineInstalled')
                      : t('settings.ai.engineNotInstalled')}
              </div>
            </div>
            {aiStatus?.images.engine.supported && !aiStatus.images.engine.installed && (
              <button className="btn-primary shrink-0" disabled={installingEngine} onClick={() => void installEngine()}>
                {installingEngine ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {installingEngine ? t('settings.ai.engineInstalling') : t('settings.ai.engineInstall')}
              </button>
            )}
          </div>
          {installingEngine && engineProgress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="truncate font-mono">{engineProgress.step}</span>
                <span>
                  {(engineProgress.done / 1073741824).toFixed(2)} / {(engineProgress.total / 1073741824).toFixed(2)} GB
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${engineProgress.total ? Math.min(100, (engineProgress.done / engineProgress.total) * 100) : 0}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">{t('settings.ai.imageMode')}</label>
            <select className="field-input" value={settings.imageProvider} onChange={(e) => void change({ imageProvider: e.target.value as AppSettings['imageProvider'] })}>
              {IMAGE_PROVIDER_MODES.map((m) => (
                <option key={m} value={m}>
                  {t(`settings.ai.imageModes.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('settings.ai.localUrl')}</label>
            <input
              className="field-input font-mono"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              onBlur={() => {
                if (localUrl !== settings.localImageUrl) void change({ localImageUrl: localUrl.trim() || 'http://127.0.0.1:7860' })
              }}
            />
            <div className="field-hint">{aiStatus ? (aiStatus.images.local.available ? t('settings.ai.localOn') : t('settings.ai.localOff')) : ''}</div>
          </div>
        </div>

        <KeyField
          name="openai"
          label={t('settings.ai.imageKeyLabel')}
          hint={t('settings.ai.imageKeyHint')}
          placeholder="sk-…"
          canRemove={aiStatus?.images.keySource === 'settings'}
          onSaved={loadAiStatus}
        />
      </section>

      <section className="card mt-4">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('settings.paths')}</h2>
        {paths && (
          <dl className="mt-3 space-y-1 font-mono text-xs text-slate-600">
            <div>
              <dt className="text-slate-400">userData</dt>
              <dd>{paths.userData}</dd>
            </div>
            <div>
              <dt className="text-slate-400">media</dt>
              <dd>{paths.media}</dd>
            </div>
            <div>
              <dt className="text-slate-400">exports</dt>
              <dd>{paths.exports}</dd>
            </div>
            <div>
              <dt className="text-slate-400">db</dt>
              <dd>{paths.db}</dd>
            </div>
          </dl>
        )}
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" disabled={!paths} onClick={() => paths && void window.api.app.openPath(paths.media)}>
            <FolderOpen size={16} />
            {t('settings.openMedia')}
          </button>
          <button className="btn-secondary" disabled={!paths} onClick={() => paths && void window.api.app.openPath(paths.exports)}>
            <FolderOpen size={16} />
            {t('settings.openExports')}
          </button>
        </div>
      </section>

      <section className="card mt-4">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('settings.tools')}</h2>
        {paths && (
          <dl className="mt-3 space-y-1 font-mono text-xs text-slate-600">
            <div className="flex gap-3">
              <dt className="w-16 text-slate-400">ffmpeg</dt>
              <dd>{paths.ffmpeg ?? t('settings.notFound')}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 text-slate-400">ffprobe</dt>
              <dd>{paths.ffprobe ?? t('settings.notFound')}</dd>
            </div>
          </dl>
        )}
      </section>

      <p className="mt-6 text-xs text-slate-400">{t('settings.version', { version })}</p>
    </div>
  )
}

function KeyField({
  name,
  label,
  hint,
  placeholder,
  canRemove,
  onSaved
}: {
  name: KeyName
  label: string
  hint: string
  placeholder: string
  canRemove: boolean
  onSaved: () => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const setAiKey = useStore((s) => s.setAiKey)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(value: string | null): Promise<void> {
    await setAiKey(name, value)
    await onSaved()
    setKey('')
    setSaved(Boolean(value))
  }

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex gap-2">
        <input
          type="password"
          className="field-input max-w-md font-mono"
          placeholder={placeholder}
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            setSaved(false)
          }}
        />
        <button className="btn-primary" disabled={!key.trim()} onClick={() => void save(key.trim())}>
          <KeyRound size={16} /> {t('settings.ai.save')}
        </button>
        {canRemove && (
          <button className="btn-secondary" onClick={() => void save(null)}>
            {t('settings.ai.remove')}
          </button>
        )}
      </div>
      <div className="field-hint">{saved ? t('settings.ai.saved') : hint}</div>
    </div>
  )
}
