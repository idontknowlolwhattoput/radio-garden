import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Earth3D from './Earth3D'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Earth3D />
  </StrictMode>,
)
