import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/AudioManager'
import { useAudio } from '../hooks/useAudio'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICON = {
  music: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z',
  sound: 'M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14',
  mute: 'M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M10 10v4M16 16v4',
}

export default function AudioControls() {
  const a = useAudio()
  const [open, setOpen] = useState(false)
  const root = useRef()

  useEffect(() => {
    if (!open) return
    const off = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      if (e.type === 'pointerdown' && root.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', off)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', off)
    }
  }, [open])

  const musicActive = a.musicOn && !a.muted
  return (
    <div className="audio" ref={root}>
      <button className="icon-btn" aria-pressed={a.musicOn} aria-label={a.musicOn ? 'Pause music' : 'Play Dussehra music'} title={a.musicOn ? 'Pause music' : 'Play music'} onClick={() => audio.toggleMusic()} data-active={musicActive}>
        <Icon d={ICON.music} />
        <span className="btn-label">{a.musicOn ? 'Music on' : 'Music'}</span>
      </button>
      <button className="icon-btn" aria-pressed={a.muted} aria-label={a.muted ? 'Unmute' : 'Mute all sound'} title={a.muted ? 'Unmute' : 'Mute'} onClick={() => audio.setMuted(!a.muted)}>
        <Icon d={a.muted ? ICON.mute : ICON.sound} />
      </button>
      <button className="icon-btn" aria-expanded={open} aria-controls="audio-panel" aria-label="Volume settings" title="Volume settings" onClick={() => setOpen((o) => !o)}>
        <Icon d={ICON.sliders} />
      </button>
      {open && (
        <div className="audio-panel" id="audio-panel" role="group" aria-label="Volume settings">
          {[
            ['master', 'Master'],
            ['music', 'Music'],
            ['sfx', 'Sound effects'],
          ].map(([k, label]) => (
            <label key={k} className="slider">
              <span>{label}</span>
              <input type="range" min="0" max="1" step="0.01" value={a[k]} onChange={(e) => audio.setVolume(k, parseFloat(e.target.value))} aria-label={`${label} volume`} />
              <output>{Math.round(a[k] * 100)}</output>
            </label>
          ))}
          <p className="hint">Music is synthesized in your browser — dhol, nagada, shehnai &amp; conch. Sound starts only after you press a button.</p>
        </div>
      )}
    </div>
  )
}
