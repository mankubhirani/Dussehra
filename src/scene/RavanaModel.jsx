import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { director, STAGE_INDEX } from '../animation/DahanTimeline'
import { controls, commands, actions } from '../hooks/useSceneControls'
import { createRavanaMaterials, buildRavana, sampleSurface } from './ravanaGeometry'
import { burnUniforms } from './burnMaterial'
import { RAVANA_POS, FACE_Y, IMPACT_WORLD, RAVANA_HEIGHT, refs } from './constants'
import { dampAngle, damp } from '../utils/math'

export default function RavanaModel() {
  const rootRef = useRef()
  const state = useRef({ rotY: 0.4, vel: 0, target: null, maxD: 10 })
  const built = useMemo(() => {
    const M = createRavanaMaterials()
    const model = buildRavana(M)
    const surf = sampleSurface(model.root)
    return { M, ...model, ...surf }
  }, [])

  useEffect(() => {
    const g = rootRef.current
    g.add(built.root)
    refs.ravana = { root: g, samples: built.samples, count: built.count, maxD: built.maxD }
    burnUniforms.uImpact.value.copy(IMPACT_WORLD)
    burnUniforms.uHeight.value = RAVANA_HEIGHT + 1
    state.current.maxD = built.maxD
    actions.loaded(1)
    return () => {
      g.remove(built.root)
      built.root.traverse((o) => o.isMesh && o.geometry.dispose())
      built.M.all().forEach((m) => m.dispose())
      refs.ravana = null
    }
  }, [built])

  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const g = rootRef.current
    const st = state.current
    const vis = director.visual
    const t = s.clock.elapsedTime
    const idx = director.stageIndex
    const paused = director.paused

    // user commands: rotate left/right nudges
    const cmds = commands.drain(['rotate'])
    if (cmds) for (const c of cmds) st.target = (st.target ?? st.rotY) + c.dir * (Math.PI / 6)

    if (!paused) {
      if (idx >= STAGE_INDEX.prepare) {
        st.target = null
        st.rotY = dampAngle(st.rotY, FACE_Y, idx === STAGE_INDEX.prepare ? 2.2 : 8, dt)
      } else if (idx >= 0) {
        st.rotY += dt * 0.35
      } else if (st.target != null) {
        st.rotY = damp(st.rotY, st.target, 5, dt)
        if (Math.abs(st.rotY - st.target) < 0.002) st.target = null
      } else if (controls.get().autoRotate) {
        st.rotY += dt * 0.22
      }
    }
    // collapse: sag and lean as the effigy burns away
    const sag = 1 - 0.14 * vis.dissolve
    g.position.copy(RAVANA_POS)
    g.rotation.set(0, st.rotY, 0.045 * vis.dissolve)
    g.scale.set(1, sag, 1)

    // independent head animation
    const burn = vis.fire * (1 - vis.dissolve)
    built.heads.forEach((h) => {
      const { base, i } = h.userData
      h.rotation.y = base + Math.sin(t * 0.7 + i * 0.9) * 0.1 + Math.sin(t * 17 + i * 2) * 0.05 * burn
      h.rotation.x = Math.sin(t * 0.9 + i) * 0.04 - vis.flash * 0.28 + Math.sin(t * 13 + i) * 0.04 * burn
      h.rotation.z = Math.sin(t * 0.6 + i * 1.3) * 0.03 + Math.sin(t * 11 + i) * 0.03 * burn
    })
    built.M.eye.emissiveIntensity = 1.4 + 0.5 * Math.sin(t * 2) + burn * 3 + vis.flash * 4
    built.M.gem.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 1.5)

    // shared burn uniforms
    const R = st.maxD * 1.15
    burnUniforms.uFront.value = vis.spread > 0 ? vis.spread * R : -1
    burnUniforms.uChar.value = vis.char
    burnUniforms.uDissolve.value = vis.dissolve
    burnUniforms.uTime.value = t
  })

  return <group ref={rootRef} />
}
