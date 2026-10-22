import { useEffect, useState } from 'react'
import AudioControls from './AudioControls'

const NAV = [
  ['home', 'Home'],
  ['story', 'Story'],
  ['significance', 'Significance'],
  ['gallery', 'Gallery'],
  ['celebrations', 'Celebrations'],
]

export default function Header() {
  const [fs, setFs] = useState(false)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const supported = typeof document !== 'undefined' && (document.fullscreenEnabled || document.webkitFullscreenEnabled)

  useEffect(() => {
    const sc = () => setScrolled(window.scrollY > window.innerHeight * 0.6)
    sc()
    window.addEventListener('scroll', sc, { passive: true })
    return () => window.removeEventListener('scroll', sc)
  }, [])

  useEffect(() => {
    const on = () => setFs(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', on)
    document.addEventListener('webkitfullscreenchange', on)
    return () => {
      document.removeEventListener('fullscreenchange', on)
      document.removeEventListener('webkitfullscreenchange', on)
    }
  }, [])

  const toggleFs = async () => {
    try {
      if (fs) await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())
      else {
        const el = document.getElementById('stage')
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
      }
    } catch {
      /* fullscreen refused by the browser */
    }
  }

  return (
    <header className="header" data-scrolled={scrolled}>
      <a className="logo" href="#home" aria-label="Dussehra V4 — home">
        <span className="logo-mark" aria-hidden="true">🏹</span>
        <span className="logo-text">Dussehra <b>V4</b></span>
      </a>
      <nav className="nav" data-open={menu} aria-label="Primary">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>
        ))}
      </nav>
      <div className="header-tools">
        <AudioControls />
        {supported && (
          <button className="icon-btn" onClick={toggleFs} aria-pressed={fs} aria-label={fs ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={fs ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
            </svg>
          </button>
        )}
        <button className="icon-btn menu-btn" aria-expanded={menu} aria-label="Toggle navigation menu" onClick={() => setMenu((m) => !m)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </header>
  )
}
