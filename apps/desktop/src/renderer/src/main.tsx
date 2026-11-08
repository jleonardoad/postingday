import React from 'react'
import ReactDOM from 'react-dom/client'
import type { OutputKind } from '@shared/formats'
import { App } from './App'
import { initI18n } from './i18n'
import { OverlayPage } from './pages/OverlayPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RenderPage } from './pages/RenderPage'
import './styles.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const hash = window.location.hash.replace('#', '')

if (hash.startsWith('render/')) {
  // Ventana oculta de exportación del post: solo la plantilla, sin interfaz
  const [, id, ratio] = hash.split('/')
  root.render(<RenderPage pieceId={Number(id)} ratio={ratio === 'reel' ? 'reel' : ('post' as OutputKind)} />)
} else if (hash.startsWith('overlay/')) {
  // Ventana oculta transparente: capa de texto de una escena del reel
  const [, id, scene] = hash.split('/')
  root.render(<OverlayPage pieceId={Number(id)} sceneIndex={Number(scene)} />)
} else if (hash.startsWith('placeholder/')) {
  // Ventana oculta: imagen de ejemplo de un producto (sin IA)
  const [, topic, ratio] = hash.split('/')
  root.render(<PlaceholderPage topicB64={topic ?? ''} ratio={ratio === 'reel' ? 'reel' : 'post'} />)
} else {
  void (async () => {
    const settings = await window.api.settings.get()
    await initI18n(settings.uiLanguage)
    root.render(
      <React.StrictMode>
        <App initialSettings={settings} />
      </React.StrictMode>
    )
  })()
}
