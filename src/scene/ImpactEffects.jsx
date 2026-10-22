import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { director, STAGE_INDEX } from '../animation/DahanTimeline'
import { controls, particleScale } from '../hooks/useSceneControls'
import { ParticleSystem, makeSpawn, pointScale } from './ParticleSystem'
import { IMPACT_WORLD, FACE_Y } from './constants'
import { glowTexture } from './textures'

// Golden flash, shockwave rings and spark burst at the moment of impact.
export default function ImpactEffects() {
  const { gl, camera } = useThree()
  const sparks = useMemo(() => new ParticleSystem({ max: 700 }), [])
  const sp = useMemo(makeSpawn, [])
  const lightRef = useRef()
  const sprRef = useRef()
  const ringA = useRef()
  const ringB = useRef()
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.9, 1, 64), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [])
  const tex = useMemo(() => glowTexture(), [])

  const burst = (count, speed, size) => {
    const n = Math.ceil(count * particleScale())
    for (let i = 0; i < n; i++) {
      // hemisphere facing Rama (local +z rotated by FACE_Y)
      const a = Math.random() * Math.PI * 2
      const e = Math.acos(1 - Math.random() * 0.85)
      const lx = Math.sin(e) * Math.cos(a), ly = Math.sin(e) * Math.sin(a), lz = Math.cos(e)
      const vx = lx * Math.cos(FACE_Y) + lz * Math.sin(FACE_Y)
      const vz = -lx * Math.sin(FACE_Y) + lz * Math.cos(FACE_Y)
      const v = speed * (0.35 + Math.random() * 0.65)
      Object.assign(sp, { x: IMPACT_WORLD.x, y: IMPACT_WORLD.y, z: IMPACT_WORLD.z, vx: vx * v, vy: ly * v + 2, vz: vz * v, life: 0.6 + Math.random() * 1.2, s0: size * (0.5 + Math.random()), s1: 0.03, alpha: 1, drag: 0.6, grav: -9, turb: 0 })
      sp.c0 = [3.2, 2.6, 1.4]; sp.c1 = [1.8, 0.4, 0.02]
      sparks.spawn(sp)
    }
  }

  useEffect(() => {
    const off = director.on((e) => {
      if (e.type === 'reset' || e.type === 'start') sparks.clear()
      if (e.type === 'stage' && !e.skipped) {
        if (e.id === 'impact') burst(380, 17, 0.3)
        if (e.id === 'ignition') burst(120, 8, 0.2)
      }
    })
    return () => {
      off()
      sparks.dispose()
      ringGeo.dispose()
      ringMat.dispose()
    }
  }, [sparks, ringGeo, ringMat])

  useFrame((state, dtRaw) => {
    const dt = director.paused ? 0 : Math.min(dtRaw, 0.1)
    const vis = director.visual
    const reduced = controls.get().reduced
    const flash = vis.flash * (reduced ? 0.4 : 1)
    lightRef.current.intensity = flash * 3000
    sprRef.current.visible = flash > 0.01
    sprRef.current.scale.setScalar(4 + flash * 18)
    sprRef.current.material.opacity = Math.min(0.85, flash * 1.1)

    const inImpact = director.stageIndex === STAGE_INDEX.impact
    const st = director.stageTime
    ;[ringA, ringB].forEach((r, i) => {
      const k = inImpact ? Math.max(0, st - i * 0.18) : 0
      r.current.visible = inImpact && k > 0
      if (r.current.visible) r.current.scale.setScalar(0.5 + k * (13 - i * 3))
    })
    ringMat.opacity = inImpact ? Math.max(0, 1 - st / 1.2) * 0.9 : 0

    sparks.setScale(particleScale())
    sparks.update(dt, state.clock.elapsedTime, pointScale(gl, camera), 1.0)
  })

  return (
    <>
      <primitive object={sparks.points} />
      <pointLight ref={lightRef} position={IMPACT_WORLD} color="#ffcf70" distance={70} decay={1.6} intensity={0} />
      <sprite ref={sprRef} position={IMPACT_WORLD} visible={false}>
        <spriteMaterial map={tex} color="#ffd98a" blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
      <group position={IMPACT_WORLD} rotation={[0, FACE_Y, 0]}>
        <mesh ref={ringA} geometry={ringGeo} material={ringMat} visible={false} />
        <mesh ref={ringB} geometry={ringGeo} material={ringMat} visible={false} />
      </group>
    </>
  )
}
