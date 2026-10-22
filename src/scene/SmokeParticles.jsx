import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { director } from '../animation/DahanTimeline'
import { particleScale } from '../hooks/useSceneControls'
import { ParticleSystem, makeSpawn, pointScale } from './ParticleSystem'
import { refs, RAVANA_POS } from './constants'
import * as THREE from 'three'

const _v = new THREE.Vector3()

// Rising volumetric-style smoke billboards (noise-shaded point sprites).
export default function SmokeParticles() {
  const { gl, camera } = useThree()
  const smoke = useMemo(() => new ParticleSystem({ max: 900, shape: 'smoke', additive: false }), [])
  const mist = useMemo(() => new ParticleSystem({ max: 90, shape: 'smoke', additive: false }), [])
  const sp = useMemo(makeSpawn, [])
  const acc = useRef(0)

  useEffect(() => {
    // ambient ground mist, spawned across the arena at various ages
    for (let i = 0; i < mist.max; i++) spawnMist(true)
    const off = director.on((e) => {
      if (e.type === 'reset' || e.type === 'start') smoke.clear()
    })
    return () => {
      off()
      smoke.dispose()
      mist.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smoke, mist])

  function spawnMist(randomAge) {
    const a = Math.random() * 6.283, r = 6 + Math.random() * 45
    Object.assign(sp, {
      x: Math.cos(a) * r, y: 0.6 + Math.random() * 2.5, z: Math.sin(a) * r,
      vx: 0.35 + Math.random() * 0.3, vy: 0, vz: (Math.random() - 0.5) * 0.3,
      life: 40 + Math.random() * 25, s0: 14 + Math.random() * 10, s1: 20 + Math.random() * 10,
      alpha: 0.07, drag: 0, grav: 0, turb: 0.05,
    })
    sp.c0 = [0.3, 0.38, 0.6]; sp.c1 = [0.3, 0.38, 0.6]
    mist.spawn(sp)
    if (randomAge) mist.age[(mist.cursor - 1 + mist.limit) % mist.limit] = Math.random() * 30
  }

  useFrame((state, dtRaw) => {
    const dt = director.paused ? 0 : Math.min(dtRaw, 0.1)
    const t = state.clock.elapsedTime
    const vis = director.visual
    const q = particleScale()
    const fire = vis.fire

    if (dt > 0 && fire > 0.08) {
      acc.current += fire * 70 * q * dt
      let n = Math.min(12, Math.floor(acc.current))
      acc.current -= Math.floor(acc.current)
      for (let i = 0; i < n; i++) {
        const r = refs.ravana
        let x, y, z
        if (r && r.count && vis.dissolve < 0.9) {
          const k = Math.floor(Math.random() * Math.max(3, r.count * Math.min(1, vis.spread)))
          _v.set(r.samples[k * 4], r.samples[k * 4 + 1], r.samples[k * 4 + 2])
          r.root.localToWorld(_v)
          x = _v.x; y = _v.y + 1.5; z = _v.z
        } else {
          const a = Math.random() * 6.283, rr = Math.random() * 3
          x = RAVANA_POS.x + Math.cos(a) * rr; y = 2; z = RAVANA_POS.z + Math.sin(a) * rr
        }
        Object.assign(sp, {
          x, y, z, vx: (Math.random() - 0.5) * 0.8, vy: 1.3 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.8,
          life: 4 + Math.random() * 3.5, s0: 1.4, s1: 6 + Math.random() * 3,
          alpha: 0.38, drag: 0.25, grav: 0.2, turb: 1.1,
        })
        sp.c0 = [0.42, 0.2, 0.09]; sp.c1 = [0.07, 0.07, 0.085]
        smoke.spawn(sp)
      }
    }
    // keep mist topped up
    if (dt > 0 && mist.alive < mist.max * 0.9 * q) spawnMist(false)

    smoke.setScale(q)
    mist.setScale(Math.max(0.3, q))
    const sc = pointScale(gl, camera)
    smoke.update(dt, t, sc, 0.9)
    mist.update(dt, t, sc, 0.6)
  })

  return (
    <>
      <primitive object={mist.points} />
      <primitive object={smoke.points} />
    </>
  )
}
