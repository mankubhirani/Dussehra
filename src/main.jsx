import { createRoot } from 'react-dom/client'
import App from './App'
import { audio } from './audio/AudioManager'
import { director } from './animation/DahanTimeline'
import { controls } from './hooks/useSceneControls'
import './styles/global.css'

// handle for debugging / automated tests
window.__dv4 = { audio, director, controls }
createRoot(document.getElementById('root')).render(<App />)
