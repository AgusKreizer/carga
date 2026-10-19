import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { sembrar } from './data/seed'
import { registerSW } from 'virtual:pwa-register'

// Versión nueva publicada → se instala y la app se recarga sola (sin quedar en una versión vieja).
const actualizar = registerSW({ immediate: true, onNeedRefresh: () => { actualizar(true) } })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {})
})

sembrar().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
