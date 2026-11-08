import { useEffect, useState, type JSX } from 'react'
import { FolderOpen, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UI_LANGUAGES, type AppPaths, type KeyName, type UiLanguage } from '@shared/types'
import { useStore } from '../store'

export function Settings(): JSX.Element {
  const { t } = useTranslation()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const aiStatus = useStore((s) => s.aiStatus)
  const [paths, setPaths] = useState<AppPaths | null>(null)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.api.app.paths().then(setPaths)
    void window.api.app.version().then(setVersion)
  }, [])

  const source = (s: 'env' | 'settings' | null): string => (s === 'env' ? t('settings.ai.sourceEnv') : t('settings.ai.sourceSettings'))

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

      <section className="card mt-4 space-y-6">
        <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase">{t('settings.ai.title')}</h2>

        <KeyField
          name="anthropic"
          label={t('settings.ai.keyLabel')}
          hint={t('settings.ai.keyHint')}
          placeholder="sk-ant-…"
          status={
            aiStatus?.provider === 'claude'
              ? t('settings.ai.statusClaude', { model: aiStatus.model, source: source(aiStatus.keySource) })
              : t('settings.ai.statusMock')
          }
          canRemove={aiStatus?.keySource === 'settings'}
        />

        <KeyField
          name="openai"
          label={t('settings.ai.imageKeyLabel')}
          hint={t('settings.ai.imageKeyHint')}
          placeholder="sk-…"
          status={
            aiStatus?.images.provider === 'openai'
              ? t('settings.ai.imageStatusOn', { model: aiStatus.images.model, source: source(aiStatus.images.keySource) })
              : t('settings.ai.imageStatusMock')
          }
          canRemove={aiStatus?.images.keySource === 'settings'}
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
  status,
  canRemove
}: {
  name: KeyName
  label: string
  hint: string
  placeholder: string
  status: string
  canRemove: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const setAiKey = useStore((s) => s.setAiKey)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(): Promise<void> {
    await setAiKey(name, key.trim() || null)
    setKey('')
    setSaved(true)
  }

  return (
    <div>
      <p className="text-sm text-slate-700">{status}</p>
      <label className="field-label mt-3">{label}</label>
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
        <button className="btn-primary" disabled={!key.trim()} onClick={() => void save()}>
          <KeyRound size={16} /> {t('settings.ai.save')}
        </button>
        {canRemove && (
          <button className="btn-secondary" onClick={() => void setAiKey(name, null)}>
            {t('settings.ai.remove')}
          </button>
        )}
      </div>
      <div className="field-hint">{saved ? t('settings.ai.saved') : hint}</div>
    </div>
  )
}
