import { actions, useControls, useDahan } from '../hooks/useSceneControls'
import { director } from '../animation/DahanTimeline'

const I = ({ d }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function SceneControls() {
  const c = useControls()
  const d = useDahan()
  const running = d && d.stageIndex >= 0
  const finished = d?.mode === 'finished'
  const free = !running || finished
  const playLabel = !running ? 'Start Ravan Dahan' : finished ? 'Replay sequence' : d.paused ? 'Resume sequence' : 'Pause sequence'
  const onPlay = () => {
    if (!running) director.start()
    else if (finished) director.replay()
    else director.togglePause()
  }
  return (
    <div className="viewer" role="toolbar" aria-label="3D viewer controls" aria-orientation="vertical">
      <button className="icon-btn" onClick={() => actions.rotate(-1)} disabled={!free} aria-label="Rotate effigy left" title="Rotate left"><I d="M3 12a9 9 0 109-9M3 4v5h5" /></button>
      <button className="icon-btn" onClick={() => actions.rotate(1)} disabled={!free} aria-label="Rotate effigy right" title="Rotate right"><I d="M21 12A9 9 0 1112 3M21 4v5h-5" /></button>
      <button className="icon-btn" onClick={actions.toggleAutoRotate} disabled={!free} aria-pressed={c.autoRotate} data-active={c.autoRotate} aria-label="Auto-rotate" title={c.autoRotate ? 'Pause auto-rotation' : 'Resume auto-rotation'}>
        <I d={c.autoRotate ? 'M8 5v14M16 5v14' : 'M7 4l13 8-13 8V4z'} />
      </button>
      <button className="icon-btn" onClick={() => actions.zoom(1)} disabled={!free} aria-label="Zoom in" title="Zoom in"><I d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3M8 11h6M11 8v6" /></button>
      <button className="icon-btn" onClick={() => actions.zoom(-1)} disabled={!free} aria-label="Zoom out" title="Zoom out"><I d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3M8 11h6" /></button>
      <button className="icon-btn" onClick={actions.resetCamera} disabled={!free} aria-label="Reset camera and rotation" title="Reset camera"><I d="M3 12a9 9 0 019-9 9 9 0 016.4 2.6L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9 9 0 01-6.4-2.6L3 16M3 21v-5h5" /></button>
      <span className="viewer-sep" aria-hidden="true" />
      <button className="icon-btn primary" onClick={onPlay} aria-label={playLabel} title={playLabel}>
        <I d={!running || finished || d.paused ? 'M7 4l13 8-13 8V4z' : 'M8 5v14M16 5v14'} />
      </button>
      <button className="icon-btn" onClick={() => actions.setReduced(!c.reduced)} aria-pressed={c.reduced} data-active={c.reduced} aria-label="Reduced effects mode" title="Reduced effects (fewer particles, no bloom, no camera shake)">
        <I d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </button>
    </div>
  )
}
