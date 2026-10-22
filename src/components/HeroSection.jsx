import { useEffect } from 'react'
import { actions, controls, useControls, useDahan } from '../hooks/useSceneControls'
import { director } from '../animation/DahanTimeline'
import DussehraScene from '../scene/DussehraScene'
import ErrorBoundary from './ErrorBoundary'
import LoadingScreen from './LoadingScreen'
import SceneControls from './SceneControls'
import ProgressIndicator from './ProgressIndicator'
import CelebrationOverlay from './CelebrationOverlay'

function Fallback() {
  return (
    <div className="fallback" role="alert">
      <div aria-hidden="true" className="fallback-icon">🏹</div>
      <h2>The 3D scene couldn’t start</h2>
      <p>Your browser or device could not create a WebGL context. Try a recent Chrome, Edge, Firefox or Safari, enable hardware acceleration, or reload the page.</p>
      <p lang="hi">बुराई पर अच्छाई की विजय — विजयादशमी की शुभकामनाएँ!</p>
    </div>
  )
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}
const WEBGL = typeof document !== 'undefined' ? hasWebGL() : true

export default function HeroSection() {
  const c = useControls()
  const d = useDahan()
  const running = d && d.stageIndex >= 0
  const explore = c.explore && !running

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && controls.get().explore) actions.resetCamera()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const start = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    actions.setExplore(false)
    director.start()
  }
  const exploreMode = () => {
    actions.setExplore(true)
    document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="stage" id="home" aria-label="Interactive 3D Ravan Dahan scene">
      <div id="stage" className="stage-inner" data-running={!!running}>
        <div className="canvas-wrap">
          {WEBGL ? (
            <ErrorBoundary fallback={<Fallback />}>
              <DussehraScene />
            </ErrorBoundary>
          ) : (
            <Fallback />
          )}
        </div>
        <div className="stage-vignette" aria-hidden="true" />

        <div className="hero-copy" data-hidden={!!running || explore}>
          <p className="eyebrow" lang="hi">॥ जय श्री राम ॥</p>
          <h1>
            Dussehra <span>—</span> Victory of Good over Evil
          </h1>
          <p className="hero-hi" lang="hi">अधर्म पर धर्म की विजय का पर्व — विजयादशमी।</p>
          <p className="hero-en">Watch Shri Ram’s divine arrow cross the night sky and light the ten-headed effigy of Ravana. Rotate it first, or begin the ceremony.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={start} disabled={!c.ready}>
              <span aria-hidden="true">🏹</span> Start Ravan Dahan
            </button>
            <button className="btn" onClick={exploreMode} disabled={!c.ready}>Explore 3D Ravana</button>
          </div>
        </div>

        {explore && (
          <div className="explore-hint" role="note">
            <span>Drag to rotate · Scroll or pinch to zoom · Arrow keys also work</span>
            <button className="btn btn-sm" onClick={() => actions.resetCamera()}>Exit explore</button>
            <button className="btn btn-sm btn-primary" onClick={start}>Start Ravan Dahan</button>
          </div>
        )}

        <SceneControls />
        <ProgressIndicator />
        <CelebrationOverlay />
        <LoadingScreen />
      </div>
    </section>
  )
}
