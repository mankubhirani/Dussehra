import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { director, STAGE_INDEX } from '../animation/DahanTimeline'
import { controls, commands } from '../hooks/useSceneControls'
import { HOME_CAM, IMPACT_WORLD, RAVANA_POS, RAMA_POS, FACE_Y, ramaLocal, refs } from './constants'
import { clamp, damp, easeInOut, lerp } from '../utils/math'

const MIN_D = 14
const MAX_D = 62
const F = new THREE.Vector3(Math.sin(FACE_Y), 0, Math.cos(FACE_Y)) // direction Ravana faces (toward Rama)
const SIDE = new THREE.Vector3(F.z, 0, -F.x)
const UP = new THREE.Vector3(0, 1, 0)

// Plans each cinematic shot as a desired camera position + look target.
// Cinematic shots (wide, close-up, tracking, impact, finale) are blended by damping.
export default function CameraDirector({ onDof }) {
  const { camera, gl } = useThree()
  const orbit = useRef()
  const st = useMemo(
    () => ({
      pos: new THREE.Vector3().copy(HOME_CAM.pos),
      look: new THREE.Vector3().copy(HOME_CAM.look),
      want: new THREE.Vector3(),
      wantLook: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      tmp2: new THREE.Vector3(),
      directed: false,
      handoff: false,
      returning: false,
      dist: HOME_CAM.pos.distanceTo(HOME_CAM.look),
      shake: new THREE.Vector3(),
      focus: 30,
      bokeh: 0,
      off: 0,
    }),
    [],
  )

  useEffect(() => {
    camera.position.copy(HOME_CAM.pos)
    camera.lookAt(HOME_CAM.look)
    camera.near = 0.3
    camera.far = 900
    window.__dv4 = Object.assign(window.__dv4 || {}, { camera, orbit })
    camera.fov = 42
    camera.updateProjectionMatrix()
    return director.on((e) => {
      if (e.type === 'start') {
        st.directed = true
        st.handoff = false
        st.returning = false
        st.pos.copy(camera.position)
        if (orbit.current) st.look.copy(orbit.current.target)
      }
      if (e.type === 'reset') {
        st.directed = false
        st.handoff = false
        st.returning = true
      }
    })
  }, [camera, st])

  // keyboard accessibility on the canvas element
  useEffect(() => {
    const el = gl.domElement
    const key = (e) => {
      if (e.key === 'ArrowLeft') commands.push({ type: 'rotate', dir: -1 })
      else if (e.key === 'ArrowRight') commands.push({ type: 'rotate', dir: 1 })
      else if (e.key === '+' || e.key === '=') commands.push({ type: 'zoom', dir: 1 })
      else if (e.key === '-' || e.key === '_') commands.push({ type: 'zoom', dir: -1 })
      else if (e.key === '0') commands.push({ type: 'reset' })
      else return
      e.preventDefault()
    }
    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'application')
    el.setAttribute('aria-label', '3D Dussehra scene. Arrow keys rotate, plus and minus zoom, zero resets the camera.')
    el.addEventListener('keydown', key)
    return () => el.removeEventListener('keydown', key)
  }, [gl])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const oc = orbit.current
    if (!oc) return
    const idx = director.stageIndex
    const vis = director.visual
    const u = vis.stageU
    const t = state.clock.elapsedTime
    const reduced = controls.get().reduced

    // portrait screens get a wider vertical field of view so the effigy stays in frame
    const aspect = state.size.width / state.size.height
    const fov = aspect >= 1.2 ? 42 : lerp(70, 42, clamp((aspect - 0.45) / 0.75))
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // shift the composition right while the hero copy is on screen (wide screens only)
    const cs = controls.get()
    const wantOff = !st.directed && !st.handoff && !cs.explore && director.stageIndex < 0 && state.size.width / state.size.height > 1.3 ? 0.13 : 0
    const newOff = damp(st.off, wantOff, 4, dt)
    if (Math.abs(newOff - st.off) > 1e-4 || (wantOff === 0 && st.off !== 0 && newOff < 1e-3)) {
      st.off = newOff < 1e-3 && wantOff === 0 ? 0 : newOff
      const w = state.size.width, h = state.size.height
      if (st.off === 0) camera.clearViewOffset()
      else camera.setViewOffset(w, h, -w * st.off, 0, w, h)
    }

    // ---- hand control back to the user once the finale has settled
    if (st.directed && director.mode === 'finished' && director.stageTime > 3 && !st.handoff) {
      st.handoff = true
      st.directed = false
      oc.target.copy(st.look)
      camera.position.copy(st.pos)
      oc.update()
    }

    // ---- free mode (user orbit / zoom / reset)
    if (!st.directed) {
      oc.enabled = true
      const cmds = commands.drain(['zoom', 'reset'])
      if (cmds) {
        for (const c of cmds) {
          if (c.type === 'zoom') {
            const off = st.tmp.copy(camera.position).sub(oc.target)
            const d = THREE.MathUtils.clamp(off.length() * (c.dir > 0 ? 0.82 : 1.22), MIN_D, MAX_D)
            st.dist = d
            st.zooming = true
          }
          if (c.type === 'reset') {
            st.returning = true
            st.handoff = false
          }
        }
      }
      if (st.returning) {
        // smooth return to the home shot
        const k = 4
        camera.position.x = damp(camera.position.x, HOME_CAM.pos.x, k, dt)
        camera.position.y = damp(camera.position.y, HOME_CAM.pos.y, k, dt)
        camera.position.z = damp(camera.position.z, HOME_CAM.pos.z, k, dt)
        oc.target.x = damp(oc.target.x, HOME_CAM.look.x, k, dt)
        oc.target.y = damp(oc.target.y, HOME_CAM.look.y, k, dt)
        oc.target.z = damp(oc.target.z, HOME_CAM.look.z, k, dt)
        st.dist = HOME_CAM.pos.distanceTo(HOME_CAM.look)
        if (camera.position.distanceTo(HOME_CAM.pos) < 0.05) st.returning = false
      } else if (st.zooming) {
        const off = st.tmp.copy(camera.position).sub(oc.target)
        const cur = off.length()
        const nd = damp(cur, st.dist, 7, dt)
        camera.position.copy(oc.target).addScaledVector(off.normalize(), nd)
        if (Math.abs(nd - st.dist) < 0.02) st.zooming = false
      } else {
        st.dist = camera.position.distanceTo(oc.target)
      }
      oc.update()
      st.pos.copy(camera.position)
      st.look.copy(oc.target)
      st.bokeh = damp(st.bokeh, 0, 4, dt)
      onDof?.(st.bokeh, st.focus)
      return
    }

    // ---- directed cinematic mode
    oc.enabled = false
    commands.drain(['zoom', 'reset']) // ignore during the sequence
    if (director.paused) {
      camera.position.copy(st.pos)
      camera.lookAt(st.look)
      return
    }
    const W = st.want
    const L = st.wantLook
    let k = 3
    let bokeh = 0
    const sm = easeInOut
    const ang = (a, r, h, out) => out.set(RAVANA_POS.x + Math.sin(a) * r, h, RAVANA_POS.z + Math.cos(a) * r)
    const wideA = FACE_Y + 0.55 // angle of the wide "front" view
    switch (director.stageId) {
      case 'intro': {
        ang(0.62 - u * 0.15, 56 - u * 12, 15 - u * 3, W)
        L.set(0, 9.5, 0)
        k = 1.6
        break
      }
      case 'reveal': {
        const a = lerp(0.47, wideA - 0.2, sm(u))
        ang(a, lerp(44, 31, sm(u)), lerp(12, 11, sm(u)), W)
        L.set(0, lerp(9.5, 10.5, sm(u)), 0)
        k = 2.2
        break
      }
      case 'prepare': {
        // dolly to Rama's close-up: bow arm and hand frame in shot
        const m = sm(u / 0.3)
        ramaLocal(-9.5, 4.8, -2.2, st.tmp)
        ang(wideA - 0.2, 31, 11, W)
        W.lerp(st.tmp, m)
        ramaLocal(0, 4.5, 2.2, st.tmp2)
        L.set(0, 10.5, 0).lerp(st.tmp2, m)
        // slow push-in while the bow is drawn
        if (u > 0.3) {
          ramaLocal(-9.5 + (u - 0.3) * 2.2, 4.8, -2.2 + (u - 0.3) * 1.4, W)
          ramaLocal(0, 4.5 + (u - 0.3) * 0.4, 2.2 + (u - 0.3) * 2.5, L)
        }
        k = 2.4
        bokeh = m * 1.0
        st.focus = camera.position.distanceTo(refs.rama?.root.position ?? RAMA_POS)
        break
      }
      case 'release': {
        ramaLocal(-8.0, 4.8, -1.2, W)
        ramaLocal(0, 4.8, 4.5, L)
        k = 5
        bokeh = 1
        st.focus = camera.position.distanceTo(RAMA_POS)
        break
      }
      case 'flight': {
        // chase camera behind and beside the arrow
        const p = refs.arrowPos
        const d = refs.arrowDir
        W.copy(p).addScaledVector(d, -7.5).addScaledVector(UP, 2.2).addScaledVector(SIDE, 3.2)
        L.copy(p).addScaledVector(d, 9)
        // final approach: lock onto the impact point
        const m = sm((u - 0.55) / 0.45)
        L.lerp(IMPACT_WORLD, m)
        k = 7
        bokeh = 0.8
        st.focus = camera.position.distanceTo(p) + 2
        break
      }
      case 'impact': {
        const m = sm(u)
        st.tmp.copy(IMPACT_WORLD).addScaledVector(F, 15).addScaledVector(SIDE, 8).addScaledVector(UP, 1.5)
        W.copy(st.tmp)
        L.copy(IMPACT_WORLD).addScaledVector(UP, 1.8)
        k = 3
        bokeh = 0
        break
      }
      case 'ignition': {
        const m = sm(u)
        st.tmp.copy(IMPACT_WORLD).addScaledVector(F, 15).addScaledVector(SIDE, 8).addScaledVector(UP, 1.5)
        ang(wideA, 33, 9 + m * 3, st.tmp2)
        W.copy(st.tmp).lerp(st.tmp2, sm((u - 0.1) / 0.8))
        L.copy(IMPACT_WORLD).lerp(st.tmp.set(0, 9.4, 0), m)
        k = 2.4
        break
      }
      case 'burning': {
        ang(wideA - 0.55 + u * 1.1, 34 - u * 3, 10 + Math.sin(u * 3.1) * 2.5, W)
        L.set(0, 9.2 - u * 0.8, 0)
        k = 1.8
        break
      }
      case 'collapse': {
        ang(wideA + 0.55 - u * 0.4, 31 - u * 4, 9 - u * 2, W)
        L.set(0, 7.4 - u * 1.5, 0)
        k = 1.8
        break
      }
      case 'fireworks': {
        ang(wideA + 0.15 + Math.sin(u * 2) * 0.12, 38 + u * 6, 5.5 + u * 1.5, W)
        L.set(-2 + u * 4, 15 + u * 3, -8)
        k = 1.4
        break
      }
      default: {
        // celebration: gentle sway on the final composition
        ang(wideA + Math.sin(t * 0.2) * 0.14, 40, 8 + Math.sin(t * 0.3) * 0.8, W)
        L.set(0, 13.5, -2)
        k = 1.5
      }
    }

    st.pos.x = damp(st.pos.x, W.x, k, dt)
    st.pos.y = damp(st.pos.y, W.y, k, dt)
    st.pos.z = damp(st.pos.z, W.z, k, dt)
    const kl = Math.max(k, 2.5)
    st.look.x = damp(st.look.x, L.x, kl, dt)
    st.look.y = damp(st.look.y, L.y, kl, dt)
    st.look.z = damp(st.look.z, L.z, kl, dt)

    // impact shake (disabled in reduced-motion)
    let amp = 0
    if (!reduced) {
      amp = vis.flash * 0.7
      if (director.stageId === 'ignition') amp += 0.05 * (1 - u)
      if (director.stageId === 'burning') amp += 0.015
    }
    st.shake.set(Math.sin(t * 61) + Math.sin(t * 37.3), Math.sin(t * 53.1) + Math.sin(t * 29.7), Math.sin(t * 47.7)).multiplyScalar(amp * 0.5)
    camera.position.copy(st.pos).add(st.shake)
    camera.lookAt(st.look)
    if (!reduced) camera.rotation.z += Math.sin(t * 41) * amp * 0.01

    // depth of field on close-up and tracking shots only
    st.bokeh = damp(st.bokeh, reduced ? 0 : bokeh, 5, dt)
    onDof?.(st.bokeh, st.focus)
  })

  return (
    <OrbitControls
      ref={orbit}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minDistance={MIN_D}
      maxDistance={MAX_D}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 - 0.04}
      target={[HOME_CAM.look.x, HOME_CAM.look.y, HOME_CAM.look.z]}
    />
  )
}
