import { useEffect, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppSettings } from '@shared/types'
import { Sidebar } from './components/Sidebar'
import { Create } from './pages/Create'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { PieceEditor } from './pages/PieceEditor'
import { Pieces } from './pages/Pieces'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { useStore } from './store'

export function App({ initialSettings }: { initialSettings: AppSettings }): JSX.Element {
  const { t } = useTranslation()
  const view = useStore((s) => s.view)
  const error = useStore((s) => s.error)
  const setError = useStore((s) => s.setError)
  const loadBusiness = useStore((s) => s.loadBusiness)
  const loadMedia = useStore((s) => s.loadMedia)
  const loadPieces = useStore((s) => s.loadPieces)
  const loadAiStatus = useStore((s) => s.loadAiStatus)

  useEffect(() => {
    useStore.setState({ settings: initialSettings })
    void loadBusiness()
    void loadMedia()
    void loadPieces()
    void loadAiStatus()
  }, [initialSettings, loadBusiness, loadMedia, loadPieces, loadAiStatus])

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <div className="drag h-10 w-full" />
        <div className="mx-auto max-w-5xl px-10 pb-16">
          {view === 'home' && <Home />}
          {view === 'create' && <Create />}
          {view === 'pieces' && <Pieces />}
          {view === 'piece' && <PieceEditor />}
          {view === 'profile' && <Profile />}
          {view === 'library' && <Library />}
          {view === 'settings' && <Settings />}
        </div>
        {error && (
          <div className="fixed right-6 bottom-6 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="flex-1">{t('common.error', { message: error })}</span>
              <button className="no-drag font-medium underline" onClick={() => setError(null)}>
                OK
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
