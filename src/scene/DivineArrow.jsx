import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { director } from '../animation/DahanTimeline'
import { particleScale } from '../hooks/useSceneControls'
import { ParticleSystem, makeSpawn, makePointsMaterial, pointScale } from './ParticleSystem'
import { IMPACT_WORLD, refs } from './constants'
import { glowTexture } from './textures'
import { smoothstep } from '../utils/math'

const ARC = 0.5
const UP = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)

// shared path function: straight line plus a gentle parabolic arc
export function pathPoint(u, S, T, out) {
  out.lerpVectors(S, T, u)
  out.y += ARC * 4 * u * (1 - u)
  return out
}

const DOTS = 56

export default function DivineArrow() {
  const groupRef = useRef()
  const lightRef = useRef()
  const { gl, camera } = useThree()
  const sp = useMemo(makeSpawn, [])
  const trail = useMemo(() => new ParticleSystem({ max: 1100 }), [])
  const dots = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(DOTS * 3)
    const size = new Float32Array(DOTS).fill(0.28)
    const alpha = new Float32Array(DOTS)
    const col = new Float32Array(DOTS * 3)
    for (let i = 0; i < DOTS; i++) col.set([2.2, 1.6, 0.6], i * 3)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(DOTS), 1))
    const mat = makePointsMaterial('glow', true)
    const pts = new THREE.Points(g, mat)
    pts.frustumCulled = false
    pts.renderOrder = 11
    return { g, mat, pts, pos, alpha }
  }, [])

  const st = useMemo(
    () => ({
      S: new THREE.Vector3(), T: new THREE.Vector3(), P: new THREE.Vector3(), Pn: new THREE.Vector3(),
      prev: new THREE.Vector3(), tmp: new THREE.Vector3(), q0: new THREE.Quaternion(), q1: new THREE.Quaternion(),
      dir: new THREE.Vector3(), flying: false, hasPrev: false, swirl: 0,
    }),
    [],
  )

  const arrow = useMemo(() => {
    const g = new THREE.Group()
    const gold = new THREE.MeshStandardMaterial({ color: '#f2c14e', emissive: '#ffa21a', emissiveIntensity: 1.2, metalness: 1, roughness: 0.25 })
    const glowM = new THREE.MeshBasicMaterial({ color: '#fff1b0', toneMapped: false })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.8, 8), gold)
    shaft.rotation.x = Math.PI / 2
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.65, 10), glowM)
    tip.rotation.x = Math.PI / 2
    tip.position.z = 1.7
    g.add(shaft, tip)
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.34, 0.6), new THREE.MeshStandardMaterial({ color: '#d73a2a', roughness: 0.6, side: THREE.DoubleSide }))
      f.position.z = -1.1
      f.rotation.z = (i / 3) * Math.PI
      g.add(f)
    }
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb84a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }))
    spr.position.z = 1.6
    g.add(spr)
    g.userData.spr = spr
    g.userData.mats = [gold, glowM, spr.material]
    return g
  }, [])

  useEffect(() => {
    const g = groupRef.current
    g.add(arrow)
    return () => {
      g.remove(arrow)
      arrow.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) o.material.dispose()
      })
      trail.dispose()
      dots.g.dispose()
      dots.mat.dispose()
    }
  }, [arrow, trail, dots])

  useEffect(() => director.on((e) => { if (e.type === 'reset' || e.type === 'start') trail.clear() }), [trail])

  useFrame((state, dtRaw) => {
    const dt = director.paused ? 0 : Math.min(dtRaw, 0.1)
    const t = state.clock.elapsedTime
    const vis = director.visual
    const g = groupRef.current
    const mount = refs.rama?.mount
    const S = st.S, T = st.T, P = st.P
    const spr = arrow.userData.spr
    let show = vis.arrow !== 'hidden' && vis.arrow !== 'gone' && mount
    arrow.visible = !!show
    const light = lightRef.current
    light.intensity = 0

    // ---- dotted aim trajectory
    const d = dots
    if (vis.trajectory > 0 && mount && vis.arrow === 'nocked') {
      mount.getWorldPosition(st.tmp)
      S.copy(st.tmp)
      st.dir.subVectors(IMPACT_WORLD, S).normalize()
      T.copy(IMPACT_WORLD).addScaledVector(st.dir, -1.2)
      for (let i = 0; i < DOTS; i++) {
        const k = i / (DOTS - 1)
        pathPoint(k, S, T, st.Pn)
        d.pos[i * 3] = st.Pn.x; d.pos[i * 3 + 1] = st.Pn.y; d.pos[i * 3 + 2] = st.Pn.z
        const wave = 0.5 + 0.5 * Math.sin(k * 24 - t * 7)
        d.alpha[i] = vis.trajectory * (0.25 + 0.75 * wave) * (i % 2 ? 1 : 0.55)
      }
      d.g.attributes.position.needsUpdate = true
    } else {
      d.alpha.fill(0)
    }
    d.g.attributes.aAlpha.needsUpdate = true
    d.mat.uniforms.uScale.value = pointScale(gl, camera)

    if (show) {
      if (vis.arrow === 'nocked') {
        st.flying = false
        mount.getWorldPosition(g.position)
        mount.getWorldQuaternion(g.quaternion)
        const glow = smoothstep(0.15, 0.5, vis.stageU)
        spr.scale.setScalar(1.2 + glow * 1.4)
        spr.material.opacity = glow
        arrow.userData.mats[0].emissiveIntensity = 0.3 + glow * 2.2
        light.intensity = 40 * glow
        // energy swirl around the arrow
        st.swirl += dt * 9
        if (glow > 0.05 && !director.paused) {
          arrow.getWorldPosition(st.tmp)
          const n = Math.ceil(2 * particleScale())
          for (let i = 0; i < n; i++) {
            const a = st.swirl + i * 2.4 + Math.random()
            const r = 0.3 + Math.random() * 0.25
            const side = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(r).applyQuaternion(g.quaternion)
            const along = (Math.random() - 0.3) * 2.6
            Object.assign(sp, { x: st.tmp.x + side.x, y: st.tmp.y + side.y, z: st.tmp.z + side.z, vx: side.x * 0.8, vy: side.y * 0.8 + 0.3, vz: side.z * 0.8, life: 0.6 + Math.random() * 0.5, s0: 0.22 * glow, s1: 0.02, alpha: 0.8, drag: 1, grav: 0.4, turb: 1.2 })
            st.dir.set(0, 0, 1).applyQuaternion(g.quaternion)
            sp.x += st.dir.x * along; sp.y += st.dir.y * along; sp.z += st.dir.z * along
            sp.c0 = [2.4, 1.7, 0.6]; sp.c1 = [1.2, 0.4, 0.05]
            trail.spawn(sp)
          }
        }
        st.hasPrev = false
      } else {
        // flying or stuck
        if (!st.flying) {
          st.flying = true
          mount.getWorldPosition(S)
          mount.getWorldQuaternion(st.q0)
          st.dir.subVectors(IMPACT_WORLD, S).normalize()
          T.copy(IMPACT_WORLD).addScaledVector(st.dir, -1.2)
          st.hasPrev = false
        }
        const u = vis.arrow === 'stuck' ? 1 : vis.flightU
        const eu = 0.6 * u + 0.4 * u * u
        pathPoint(Math.min(eu, 1), S, T, P)
        pathPoint(Math.min(eu + 0.01, 1.01), S, T, st.Pn)
        st.dir.subVectors(st.Pn, P)
        if (st.dir.lengthSq() < 1e-8) st.dir.subVectors(T, S)
        st.dir.normalize()
        st.q1.setFromUnitVectors(Z, st.dir)
        g.quaternion.copy(st.q0).slerp(st.q1, smoothstep(0, 0.3, eu))
        if (vis.arrow === 'stuck') g.quaternion.copy(st.q1)
        g.position.copy(P)
        arrow.userData.mats[0].emissiveIntensity = 2.4
        spr.scale.setScalar(vis.arrow === 'stuck' ? 2.2 + Math.sin(t * 20) * 0.3 : 3.2)
        spr.material.opacity = vis.arrow === 'stuck' ? 0.7 : 1
        light.intensity = vis.arrow === 'stuck' ? 30 : 120

        // luminous trail: fill gaps between frames
        if (vis.arrow === 'flying' && !director.paused) {
          if (st.hasPrev) {
            const dist = st.prev.distanceTo(P)
            const n = Math.min(40, Math.ceil((dist / 0.18) * Math.max(0.5, particleScale())))
            for (let i = 0; i < n; i++) {
              st.tmp.lerpVectors(st.prev, P, i / n)
              const j = 0.18
              Object.assign(sp, { x: st.tmp.x - st.dir.x * 1.3 + (Math.random() - 0.5) * j, y: st.tmp.y - st.dir.y * 1.3 + (Math.random() - 0.5) * j, z: st.tmp.z - st.dir.z * 1.3 + (Math.random() - 0.5) * j, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 + 0.3, vz: (Math.random() - 0.5) * 1.2, life: 0.55 + Math.random() * 0.6, s0: 0.5, s1: 0.04, alpha: 0.85, drag: 1.5, grav: 0.2, turb: 1.5 })
              sp.c0 = [2.6, 1.8, 0.7]; sp.c1 = [1.4, 0.35, 0.04]
              trail.spawn(sp)
              if (i % 3 === 0) {
                // flying sparks
                sp.vx = (Math.random() - 0.5) * 5; sp.vy = (Math.random() - 0.5) * 5; sp.vz = (Math.random() - 0.5) * 5
                sp.s0 = 0.16; sp.life = 0.5 + Math.random() * 0.5; sp.grav = -4
                sp.c0 = [3, 2.4, 1.2]; sp.c1 = [1.5, 0.3, 0.02]
                trail.spawn(sp)
              }
            }
          }
          st.prev.copy(P)
          st.hasPrev = true
        }
      }
      refs.arrowPos.copy(g.position)
      refs.arrowDir.set(0, 0, 1).applyQuaternion(g.quaternion)
    } else {
      st.flying = false
      st.hasPrev = false
    }

    trail.setScale(particleScale())
    trail.update(dt, t, pointScale(gl, camera), 1.1)
  })

  return (
    <>
      <group ref={groupRef}>
        <pointLight ref={lightRef} color="#ffc060" distance={28} decay={2} intensity={0} />
      </group>
      <primitive object={trail.points} />
      <primitive object={dots.pts} />
    </>
  )
}
