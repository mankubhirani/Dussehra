import { Suspense, useCallback, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { actions, controls, QUALITY } from '../hooks/useSceneControls'
import { director } from '../animation/DahanTimeline'
import Environment from './Environment'
import Lighting from './Lighting'
import RavanaModel from './RavanaModel'
import RamaModel from './RamaModel'
import DivineArrow from './DivineArrow'
import ImpactEffects from './ImpactEffects'
import FireParticles from './FireParticles'
import SmokeParticles from './SmokeParticles'
import Fireworks from './Fireworks'
import CameraDirector from './CameraDirector'

// ?q=low|medium|high forces a quality tier and disables automatic degrade.
const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') : null

// Watches frame time and lowers quality when the device can't hold ~40 fps.
function PerfGuard() {
  const acc = useRef({ t: 0, n: 0, bad: 0 })
  useFrame((_, dt) => {
    if (forced || director.paused) return
    const a = acc.current
    a.t += dt
    a.n++
    if (a.t >= 2) {
      const fps = a.n / a.t
      a.bad = fps < 38 ? a.bad + 1 : 0
      if (a.bad >= 2) {
        actions.degrade()
        a.bad = 0
      }
      a.t = 0
      a.n = 0
    }
  })
  return null
}

// Single clock that drives the cinematic timeline (runs before every other frame callback).
function DirectorClock() {
  useFrame((_, dt) => director.tick(dt), -100)
  return null
}

function ReadyGate() {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 6) {
      actions.loaded(3)
      actions.markReady()
    }
  })
  return null
}

function Post({ quality, dofRef }) {
  const q = QUALITY[quality]
  return (
    <EffectComposer multisampling={q.msaa} disableNormalPass>
      <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.72} />
      {q.dof ? <DepthOfField ref={dofRef} worldFocusDistance={30} worldFocusRange={14} bokehScale={0} resolutionScale={0.5} /> : <></>}
      <Vignette eskil={false} offset={0.2} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

function Scene() {
  const c = controls.use()
  const quality = c.reduced ? 'low' : c.quality
  const dofRef = useRef()
  const onDof = useCallback((bokeh, focus) => {
    const e = dofRef.current
    if (!e) return
    e.bokehScale = bokeh * 3.2
    const m = e.circleOfConfusionMaterial
    if (m) m.worldFocusDistance = focus
  }, [])
  return (
    <>
      <DirectorClock />
      <Environment />
      <Lighting />
      <Suspense fallback={null}>
        <RavanaModel />
        <RamaModel />
      </Suspense>
      <DivineArrow />
      <ImpactEffects />
      <FireParticles />
      <SmokeParticles />
      <Fireworks />
      <CameraDirector onDof={onDof} />
      {QUALITY[quality].composer && <Post quality={quality} dofRef={dofRef} />}
      <PerfGuard />
      <ReadyGate />
    </>
  )
}

export default function DussehraScene() {
  const c = controls.use()
  const tier = forced && QUALITY[forced] ? forced : c.reduced ? 'low' : c.quality
  const q = QUALITY[tier]
  useEffect(() => {
    if (forced && QUALITY[forced]) controls.set({ quality: forced, baseQuality: forced })
  }, [])
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={q.dpr}
      camera={{ position: [20, 11, 30], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#02040c')
      }}
    >
      <Scene />
    </Canvas>
  )
}
