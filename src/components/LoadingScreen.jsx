import { useEffect, useState } from 'react'
import { useControls } from '../hooks/useSceneControls'

const LABELS = ['Lighting the diyas…', 'Raising the effigy…', 'Preparing Shri Ram’s bow…', 'Ready']

export default function LoadingScreen() {
  const c = useControls()
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (c.ready) {
      const id = setTimeout(() => setGone(true), 700)
      return () => clearTimeout(id)
    }
  }, [c.ready])
  if (gone) return null
  const pct = c.ready ? 100 : Math.round((c.loadStep / 3) * 90)
  return (
    <div className="loading" data-done={c.ready} role="progressbar" aria-label="Loading 3D scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="loading-diya" aria-hidden="true">🪔</div>
      <h2 className="loading-title">Dussehra V4</h2>
      <p className="loading-hi">जय श्री राम</p>
      <div className="loading-bar"><span style={{ width: `${pct}%` }} /></div>
      <p className="loading-label">{LABELS[Math.min(3, c.loadStep)]}</p>
    </div>
  )
}
