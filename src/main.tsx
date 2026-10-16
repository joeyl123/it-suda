import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './galaxy.css'
import { hasWebGL } from './lib/webgl'

if (hasWebGL()) void import('./three/Universe')

// StrictMode는 쓰지 않는다: 개발 모드의 이중 마운트가 drei <Html> 라벨을 지워버림
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
