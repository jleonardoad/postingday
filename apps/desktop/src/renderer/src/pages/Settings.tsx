import { useEffect, useState, type JSX } from 'react'
import { FolderOpen, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UI_LANGUAGES, type AppPaths, type UiLanguage } from '@shared/types'
import { useStore } from '../store'

export function Settings(): JSX.Element {
  const { t } = useTranslation()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const aiStatus = useStore((s) => s.aiStatus)
  const setAiKey = useStore((s) => s.setAiKey)
  const [paths, setPaths] = useState<AppPaths | null>(null)
  const [version, setVersion] = useState('')
  const [key, setKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)

  useEffect(() => {
    void window.api.app.paths().then(setPaths)
    void window.api.app.version().then(setVersion)
  }, [])

  async function saveKey(): Promise<void> {
    await setAiKey(key.trim() || null)
    setKey('')
    setKeySaved(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <section className="card mt-6">
        <label className="field-label">{t('settings.language')}</label>
        <select
          className="field-input max-w-xs"
          value={settings.uiLanguage}
          onChange={(e) => void updateSettings({ uiLanguage: e.target.value as UiLanguage })}
        >
          {UI_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l === 'es' ? 'Español' : 'English'}
            </option>
          ))}
        </select>
      </section>

      <section className="card mt-4">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('settings.ai.title')}</h2>
        <p className="mt-2 text-sm text-slate-700">
          {aiStatus?.provider === 'claude'
            ? t('settings.ai.statusClaude', {
                model: aiStatus.model,
                source: aiStatus.keySource === 'env' ? t('settings.ai.sourceEnv') : t('settings.ai.sourceSettings')
              })
            : t('settings.ai.statusMock')}
        </p>
        <div className="mt-4">
          <label className="field-label">{t('settings.ai.keyLabel')}</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="field-input max-w-md font-mono"
              placeholder="sk-ant-…"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setKeySaved(false)
              }}
            />
            <button className="btn-primary" disabled={!key.trim()} onClick={() => void saveKey()}>
              <KeyRound size={16} /> {t('settings.ai.save')}
            </button>
            {aiStatus?.keySource === 'settings' && (
              <button className="btn-secondary" onClick={() => void setAiKey(null)}>
                {t('settings.ai.remove')}
              </button>
            )}
          </div>
          <div className="field-hint">{keySaved ? t('settings.ai.saved') : t('settings.ai.keyHint')}</div>
        </div>
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
