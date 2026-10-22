import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { director } from '../animation/DahanTimeline'
import { particleScale } from '../hooks/useSceneControls'
import { ParticleSystem, makeSpawn, pointScale } from './ParticleSystem'
import { refs } from './constants'
import { audio } from '../audio/AudioManager'

const PALETTE = [
  [[3.4, 2.4, 0.7], [1.6, 0.5, 0.05]], // gold
  [[3.2, 0.5, 0.5], [1.4, 0.05, 0.1]], // red
  [[0.7, 3.0, 1.1], [0.1, 1.2, 0.4]], // green
  [[0.8, 1.4, 3.6], [0.2, 0.3, 1.5]], // blue
  [[3.2, 0.6, 2.8], [1.4, 0.1, 1.2]], // magenta
  [[3.2, 3.0, 2.8], [1.4, 1.2, 1.2]], // white
  [[3.4, 1.4, 0.3], [1.5, 0.3, 0.02]], // orange
]
const MAX_ROCKETS = 10
const MAX_SHELL = 700

export default function Fireworks() {
  const { gl, camera } = useThree()
  const pool = useMemo(() => new ParticleSystem({ max: 9000 }), [])
  const sp = useMemo(makeSpawn, [])
  const lightRef = useRef()
  const S = useMemo(() => ({
    rockets: Array.from({ length: MAX_ROCKETS }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fuse: 0, c: 0, type: 0 })),
    shell: Array.from({ length: MAX_SHELL }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, age: 0, c: 0, grav: 0, trail: 1 })),
    shellCursor: 0, timer: 0, flash: 0,
  }), [])

  useEffect(() => {
    const off = director.on((e) => {
      if (e.type === 'reset' || e.type === 'start') {
        pool.clear()
        S.rockets.forEach((r) => (r.on = false))
        S.shell.forEach((r) => (r.on = false))
        S.timer = 0
        S.flash = 0
      }
    })
    return () => {
      off()
      pool.dispose()
    }
  }, [pool, S])

  const launch = () => {
    const r = S.rockets.find((x) => !x.on)
    if (!r) return
    r.on = true
    r.x = (Math.random() - 0.5) * 70
    r.z = -8 - Math.random() * 40
    r.y = 0
    const apex = 24 + Math.random() * 18
    r.fuse = 0.9 + Math.random() * 0.4
    r.vy = (apex * 2) / r.fuse * 0.5 + 8
    r.vx = (Math.random() - 0.5) * 6
    r.vz = (Math.random() - 0.5) * 3
    r.c = Math.floor(Math.random() * PALETTE.length)
    r.type = Math.floor(Math.random() * 4)
    audio.play('fwLaunch', { pan: r.x / 40 })
  }

  const burst = (r) => {
    const n = Math.ceil((r.type === 3 ? 130 : 110) * Math.max(0.35, particleScale()))
    const [c0, c1] = PALETTE[r.c]
    const speed = 11 + Math.random() * 7
    for (let i = 0; i < n; i++) {
      const s = S.shell[S.shellCursor]
      S.shellCursor = (S.shellCursor + 1) % MAX_SHELL
      // fibonacci sphere / ring
      let dx, dy, dz
      if (r.type === 1) {
        const a = (i / n) * Math.PI * 2
        dx = Math.cos(a); dy = Math.sin(a) * 0.35; dz = Math.sin(a) * 0.93
      } else {
        const k = (i + 0.5) / n
        const phi = Math.acos(1 - 2 * k)
        const th = Math.PI * (1 + Math.sqrt(5)) * i
        dx = Math.sin(phi) * Math.cos(th); dy = Math.cos(phi); dz = Math.sin(phi) * Math.sin(th)
      }
      const v = speed * (r.type === 2 ? 0.7 + Math.random() * 0.3 : 0.9 + Math.random() * 0.2)
      Object.assign(s, { on: true, x: r.x, y: r.y, z: r.z, vx: dx * v, vy: dy * v, vz: dz * v, age: 0, life: r.type === 2 ? 2.8 : 1.8 + Math.random() * 0.5, c: r.c, grav: r.type === 2 ? -3.2 : -2.2, trail: r.type === 2 ? 1 : 0.7 })
      // visible head
      Object.assign(sp, { x: r.x, y: r.y, z: r.z, vx: 0, vy: 0, vz: 0, life: 0.15, s0: 0.5, s1: 0.2, alpha: 1, drag: 0, grav: 0, turb: 0 })
      sp.c0 = c0; sp.c1 = c1
    }
    // core flash sparks
    for (let i = 0; i < 24 * Math.max(0.4, particleScale()); i++) {
      Object.assign(sp, { x: r.x, y: r.y, z: r.z, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, life: 0.4, s0: 1.2, s1: 0.1, alpha: 0.9, drag: 3, grav: 0, turb: 0 })
      sp.c0 = [3.5, 3.2, 2.6]; sp.c1 = c1
      pool.spawn(sp)
    }
    S.flash = 1
    refs.fireworkPos.set(r.x, r.y, r.z)
    refs.fireworkColor.setRGB(Math.min(1, c0[0] / 3.4), Math.min(1, c0[1] / 3.4), Math.min(1, c0[2] / 3.4))
    audio.play('fwBurst', { pan: r.x / 40, vol: 0.6 + Math.random() * 0.4 })
  }

  useFrame((state, dtRaw) => {
    const dt = director.paused ? 0 : Math.min(dtRaw, 0.1)
    const t = state.clock.elapsedTime
    const vis = director.visual
    const q = particleScale()

    if (dt > 0 && vis.fireworks) {
      S.timer -= dt
      if (S.timer <= 0) {
        const intense = director.stageId === 'fireworks'
        launch()
        if (intense && Math.random() < 0.5) launch()
        S.timer = intense ? 0.25 + Math.random() * 0.45 : 1.2 + Math.random() * 1.2
      }
    }

    if (dt > 0) {
      // rockets
      for (const r of S.rockets) {
        if (!r.on) continue
        r.fuse -= dt
        r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt
        r.vy -= 6 * dt
        const n = Math.ceil(3 * Math.max(0.4, q))
        for (let i = 0; i < n; i++) {
          Object.assign(sp, { x: r.x + (Math.random() - 0.5) * 0.2, y: r.y, z: r.z + (Math.random() - 0.5) * 0.2, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2, vz: (Math.random() - 0.5) * 1.5, life: 0.5 + Math.random() * 0.4, s0: 0.35, s1: 0.04, alpha: 0.9, drag: 1, grav: -1, turb: 0 })
          sp.c0 = [3.2, 2.2, 0.8]; sp.c1 = [1.2, 0.3, 0.03]
          pool.spawn(sp)
        }
        if (r.fuse <= 0) {
          r.on = false
          burst(r)
        }
      }
      // shell particles (tracked, emit trail sparks into the pool)
      const [rate] = [14 * Math.max(0.35, q)]
      for (const s of S.shell) {
        if (!s.on) continue
        s.age += dt
        if (s.age >= s.life) { s.on = false; continue }
        const dr = Math.exp(-1.7 * dt)
        s.vx *= dr; s.vy = s.vy * dr + s.grav * dt; s.vz *= dr
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt
        const fade = 1 - s.age / s.life
        if (Math.random() < rate * dt * s.trail * 1.5) {
          const [c0, c1] = PALETTE[s.c]
          Object.assign(sp, { x: s.x, y: s.y, z: s.z, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6 - 0.4, vz: (Math.random() - 0.5) * 0.6, life: 0.45 + Math.random() * 0.45, s0: 0.42 * (0.4 + fade), s1: 0.04, alpha: 0.9, drag: 0.5, grav: -1.2, turb: 0 })
          sp.c0 = c0; sp.c1 = c1
          pool.spawn(sp)
        }
        // glitter at end of life
        if (s.age > s.life * 0.75 && Math.random() < 3 * dt) {
          Object.assign(sp, { x: s.x, y: s.y, z: s.z, vx: 0, vy: -0.5, vz: 0, life: 0.25, s0: 0.5, s1: 0.1, alpha: 1, drag: 0, grav: 0, turb: 0 })
          sp.c0 = [3.4, 3.2, 2.8]; sp.c1 = [2, 1.2, 0.6]
          pool.spawn(sp)
        }
      }
    }

    // light flash on burst
    S.flash = Math.max(0, S.flash - dt * 3.2)
    refs.fireworkFlash = S.flash
    const L = lightRef.current
    L.position.copy(refs.fireworkPos)
    L.color.copy(refs.fireworkColor)
    L.intensity = S.flash * 3500

    pool.setScale(Math.max(0.4, q))
    pool.update(dt, t, pointScale(gl, camera), 1.0)
  })

  return (
    <>
      <primitive object={pool.points} />
      <pointLight ref={lightRef} distance={110} decay={1.6} intensity={0} />
    </>
  )
}
