import { useEffect, useState, type JSX } from 'react'
import { Smartphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CaptureInfo } from '@shared/ipc'

/**
 * Ventana «Subir desde el celular»: muestra el código QR y la dirección para
 * que el teléfono, en la misma Wi-Fi, envíe fotos y clips a la biblioteca.
 */
export function CaptureModal({ onClose, received }: { onClose: () => void; received: number }): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<CaptureInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.capture
      .start()
      .then(setInfo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Smartphone size={20} className="text-brand-600" /> {t('capture.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t('capture.subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex gap-8">
          <div className="flex w-56 shrink-0 flex-col items-center">
            {info ? (
              <img src={info.qrDataUrl} alt="QR" className="h-52 w-52 rounded-xl border border-slate-200" />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-400">
                {error ?? t('common.loading')}
              </div>
            )}
            {info && (
              <div className="mt-3 w-full text-center">
                <div className="text-[11px] tracking-wide text-slate-400 uppercase">{t('capture.urlLabel')}</div>
                <div className="mt-1 font-mono text-xs break-all text-slate-700 select-all">{info.url}</div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>{t('capture.step1')}</li>
              <li>{t('capture.step2')}</li>
              <li>{t('capture.step3')}</li>
            </ol>
            <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              {received > 0 ? (
                <span className="font-medium text-emerald-700">{t('capture.received', { count: received })}</span>
              ) : (
                <span className="text-slate-500">{t('capture.waiting')}</span>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400">{t('capture.firewall')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
