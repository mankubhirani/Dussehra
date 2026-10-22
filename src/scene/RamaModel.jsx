import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { director, STAGE_INDEX } from '../animation/DahanTimeline'
import { Builder } from './builder'
import { noiseTexture, clothTexture } from './textures'
import { RAMA_POS, RAMA_YAW, refs } from './constants'
import { actions } from '../hooks/useSceneControls'
import { easeInOut, lerp, clamp } from '../utils/math'

const Y = new THREE.Vector3(0, 1, 0)
const PITCH = -0.3
const HIP_Y = 3.2
const HAND_AIM = new THREE.Vector3(3.0, 5.0, 0)
const HAND_LOW = new THREE.Vector3(1.7, 3.5, 0.35)
const HAND_UP = new THREE.Vector3(1.9, 7.6, 0.2)
const REST_R = new THREE.Vector3(-0.95, 3.6, 0.55)
const SH_L = new THREE.Vector3(1.0, 4.85, 0)
const SH_R = new THREE.Vector3(-1.0, 4.85, 0)
const NOCK_REST = -0.35
const NOCK_DRAWN = -2.1
const TIP = 2.4

function makeMats() {
  const bump = noiseTexture(256, 3)
  const m = (o) => new THREE.MeshStandardMaterial(o)
  return {
    skin: m({ color: '#3d68c0', roughness: 0.55, bumpMap: bump, bumpScale: 0.3 }),
    gold: m({ color: '#e6b04a', metalness: 1, roughness: 0.3, bumpMap: bump, bumpScale: 0.8 }),
    cloth: m({ color: '#ffffff', map: clothTexture(), roughness: 0.8 }),
    saffron: m({ color: '#f08a1c', roughness: 0.8 }),
    dark: m({ color: '#120b0a', roughness: 0.7 }),
    white: m({ color: '#f6efe0', roughness: 0.4 }),
    red: m({ color: '#b8241f', roughness: 0.6 }),
    flower: m({ color: '#ff5b8a', emissive: '#4a0a1c', roughness: 0.6 }),
    wood: m({ color: '#5a3418', roughness: 0.7, bumpMap: bump, bumpScale: 1 }),
    stone: m({ color: '#4a4540', roughness: 0.9, bumpMap: bump, bumpScale: 2 }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false }),
  }
}

function buildHead(M) {
  const b = new Builder()
  b.sphere(0.5, M.skin, { scale: [0.95, 1.08, 0.95] }, 20, 16)
  b.sphere(0.36, M.skin, { pos: [0, -0.3, 0.12], scale: [1, 0.75, 0.95] })
  for (const s of [-1, 1]) {
    b.sphere(0.1, M.white, { pos: [s * 0.2, 0.1, 0.42], scale: [1.2, 0.75, 0.6] })
    b.sphere(0.05, M.dark, { pos: [s * 0.2, 0.1, 0.46] })
    b.torus(0.17, 0.022, M.dark, { pos: [s * 0.2, 0.22, 0.45], rot: [0.3, 0, s * 0.15] }, Math.PI * 0.8, 5, 12)
    b.sphere(0.1, M.skin, { pos: [s * 0.5, 0, 0], scale: [0.5, 1, 0.7] })
    b.torus(0.09, 0.025, M.gold, { pos: [s * 0.53, -0.18, 0], rot: [0, Math.PI / 2, 0] })
    b.sphere(0.06, M.red, { pos: [s * 0.53, -0.3, 0] })
  }
  b.cone(0.07, 0.22, M.skin, { pos: [0, -0.03, 0.52], rot: [Math.PI / 2, 0, 0] }, 8)
  b.torus(0.12, 0.022, M.red, { pos: [0, -0.28, 0.43], rot: [0, 0, Math.PI] }, Math.PI * 0.8, 5, 12)
  b.box(0.05, 0.24, 0.03, M.white, { pos: [0, 0.4, 0.46] })
  b.sphere(0.035, M.red, { pos: [0, 0.3, 0.48] })
  // hair + bun
  b.sphere(0.52, M.dark, { pos: [0, 0.12, -0.2], scale: [1, 1, 0.9] })
  b.sphere(0.3, M.dark, { pos: [0, 0.62, -0.25] })
  b.cone(0.45, 1.7, M.dark, { pos: [0, -0.8, -0.38], rot: [Math.PI, 0, 0] }, 12)
  // mukut (crown)
  b.cyl(0.54, 0.56, 0.2, M.gold, { pos: [0, 0.52, 0] }, 20)
  b.cyl(0.28, 0.5, 0.55, M.gold, { pos: [0, 0.88, 0] }, 20)
  b.cone(0.26, 0.6, M.gold, { pos: [0, 1.45, 0] }, 16)
  b.sphere(0.09, M.red, { pos: [0, 0.54, 0.55] })
  b.sphere(0.06, M.flower, { pos: [0, 0.95, 0.4] })
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    b.cone(0.06, 0.28, M.gold, { pos: [Math.sin(a) * 0.5, 0.72, Math.cos(a) * 0.5], rot: [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4] }, 6)
  }
  return b.build()
}

function buildStatic(M) {
  const root = new THREE.Group()
  // --- dais
  const d = new Builder()
  d.cyl(3.2, 3.5, 0.6, M.stone, { pos: [0, -0.3, 0] }, 24)
  d.cyl(3.9, 4.1, 0.3, M.stone, { pos: [0, -0.45, 0] }, 24)
  d.torus(3.2, 0.08, M.gold, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 6, 48)
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    d.cone(0.1, 0.18, M.glow, { pos: [Math.sin(a) * 3.55, 0.05, Math.cos(a) * 3.55] }, 6)
  }
  root.add(d.build())
  return root
}

function buildLower(M) {
  const b = new Builder()
  b.lathe([[0.01, 3.4], [0.85, 3.4], [1.05, 2.6], [1.35, 1.4], [1.5, 0.75], [0.01, 0.75]], M.cloth, {}, 24)
  b.torus(1.5, 0.07, M.gold, { pos: [0, 0.8, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 6, 32)
  for (const s of [-1, 1]) {
    b.between([s * 0.45, 2.6, 0], [s * 1.0, 0.35, 0], 0.34, 0.26, M.skin)
    b.box(0.95, 0.25, 0.5, M.skin, { pos: [s * 1.05, 0.15, 0.08] })
    b.torus(0.28, 0.05, M.gold, { pos: [s * 0.95, 0.5, 0], rot: [Math.PI / 2, 0, 0] })
  }
  b.torus(0.85, 0.12, M.gold, { pos: [0, 3.35, 0], rot: [Math.PI / 2, 0, 0] })
  b.sphere(0.2, M.red, { pos: [0, 3.3, 0.8] })
  return b.build()
}

function buildUpper(M) {
  const b = new Builder()
  b.lathe([[0.01, 3.0], [0.72, 3.0], [0.78, 3.6], [0.92, 4.4], [0.95, 4.8], [0.6, 5.15], [0.01, 5.2]], M.skin, { scale: [1, 1, 0.72] }, 24)
  b.cyl(0.26, 0.3, 0.45, M.skin, { pos: [0, 5.2, 0] })
  b.torus(0.78, 0.09, M.flower, { pos: [0, 4.55, 0.05], rot: [Math.PI / 2 - 0.3, 0, 0], scale: [1, 0.75, 1] }, Math.PI * 2, 8, 24)
  b.torus(0.55, 0.06, M.gold, { pos: [0, 4.95, 0.1], rot: [Math.PI / 2 - 0.2, 0, 0], scale: [1, 0.8, 1] }, Math.PI * 2, 6, 24)
  b.sphere(0.12, M.red, { pos: [0, 4.4, 0.6] })
  // sash across chest
  b.between([0.85, 4.95, 0.1], [-0.6, 3.4, 0.35], 0.12, 0.12, M.saffron)
  // quiver with arrows on the back
  b.cyl(0.24, 0.2, 2.1, M.wood, { pos: [-0.1, 4.2, -0.72], rot: [0.15, 0, 0.18] })
  b.torus(0.24, 0.04, M.gold, { pos: [-0.1, 5.1, -0.8], rot: [Math.PI / 2, 0, 0] })
  for (let k = 0; k < 4; k++) {
    b.cyl(0.025, 0.025, 0.7, M.gold, { pos: [-0.25 + k * 0.1, 5.5, -0.85 + (k % 2) * 0.08], rot: [0.15, 0, 0.18] }, 5)
    b.cone(0.07, 0.12, M.red, { pos: [-0.25 + k * 0.1, 5.88, -0.85 + (k % 2) * 0.08] }, 5)
  }
  // shoulders + armlets
  for (const s of [-1, 1]) {
    b.sphere(0.34, M.skin, { pos: [s * 1.0, 4.85, 0] })
    b.sphere(0.2, M.gold, { pos: [s * 1.0, 5.05, 0], scale: [1, 0.7, 1] })
  }
  return b.build()
}

// 2-bone IK; returns elbow position
const _d = new THREE.Vector3()
const _h = new THREE.Vector3()
function ik(S, H, L1, L2, hint, out) {
  _d.subVectors(H, S)
  let d = _d.length()
  d = Math.min(d, L1 + L2 - 0.01)
  _d.normalize()
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0.0001, L1 * L1 - a * a))
  _h.copy(hint).addScaledVector(_d, -hint.dot(_d)).normalize()
  return out.copy(S).addScaledVector(_d, a).addScaledVector(_h, h)
}

function makeLimb(mat, geo) {
  const g = new THREE.Group()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  g.add(mesh)
  return { g, mesh }
}
function placeLimb(l, a, b) {
  const dir = _d.subVectors(b, a)
  const len = dir.length()
  l.g.position.copy(a)
  l.g.quaternion.setFromUnitVectors(Y, dir.normalize())
  l.mesh.scale.set(1, len, 1)
  l.mesh.position.y = len / 2
}

export default function RamaModel() {
  const rootRef = useRef()
  const rig = useMemo(() => {
    const M = makeMats()
    const root = new THREE.Group()
    root.add(buildStatic(M))
    const yawLow = new THREE.Group()
    yawLow.rotation.y = -Math.PI / 2
    yawLow.add(buildLower(M))
    root.add(yawLow)
    const pivot = new THREE.Group()
    pivot.position.y = HIP_Y
    const yaw = new THREE.Group()
    yaw.rotation.y = -Math.PI / 2
    const upper = new THREE.Group()
    upper.position.y = -HIP_Y
    pivot.add(yaw)
    yaw.add(upper)
    root.add(pivot)
    upper.add(buildUpper(M))

    const headYaw = new THREE.Group()
    headYaw.position.set(0, 5.75, 0)
    headYaw.rotation.y = Math.PI / 2
    const headPitch = new THREE.Group()
    headPitch.add(buildHead(M))
    headYaw.add(headPitch)
    upper.add(headYaw)

    // arms
    const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 10)
    const sphGeo = new THREE.SphereGeometry(1, 12, 10)
    const limbs = {}
    ;['Lu', 'Lf', 'Ru', 'Rf'].forEach((k) => {
      limbs[k] = makeLimb(M.skin, cylGeo)
      upper.add(limbs[k].g)
    })
    const joint = (r, mat = M.skin) => {
      const m = new THREE.Mesh(sphGeo, mat)
      m.scale.setScalar(r)
      m.castShadow = true
      upper.add(m)
      return m
    }
    const elbowL = joint(0.24), elbowR = joint(0.24)
    const handL = joint(0.3), handR = joint(0.28)
    const braceL = joint(0.26, M.gold), braceR = joint(0.25, M.gold)
    braceL.scale.y = braceR.scale.y = 0.35

    // bow (group origin = grip)
    const bow = new THREE.Group()
    const pts = []
    for (let i = 0; i <= 24; i++) {
      const s = (i / 24) * 2 - 1
      pts.push(new THREE.Vector3(-0.65 * s * s, s * TIP, 0))
    }
    const bowMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 8), M.gold)
    bowMesh.castShadow = true
    bow.add(bowMesh)
    bow.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8), M.red), { castShadow: true }))
    ;[-1, 1].forEach((s) => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), M.gold)
      tip.position.set(-0.65, s * TIP, 0)
      bow.add(tip)
    })
    const strMat = new THREE.MeshBasicMaterial({ color: '#f3e3b0' })
    const strGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5)
    const strU = new THREE.Mesh(strGeo, strMat)
    const strL = new THREE.Mesh(strGeo, strMat)
    bow.add(strU, strL)
    // arrow mount (arrow +z -> bow +x)
    const mount = new THREE.Object3D()
    mount.rotation.y = Math.PI / 2
    bow.add(mount)
    upper.add(bow)

    root.traverse((o) => {
      if (o.isMesh && o.material !== M.glow) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return { M, root, pivot, upper, headYaw, headPitch, limbs, elbowL, elbowR, handL, handR, braceL, braceR, bow, strU, strL, mount, cylGeo, sphGeo, strGeo }
  }, [])

  useEffect(() => {
    const g = rootRef.current
    g.add(rig.root)
    g.position.copy(RAMA_POS)
    g.rotation.y = RAMA_YAW
    g.updateMatrixWorld(true)
    refs.rama = { root: g, mount: rig.mount, head: rig.headYaw }
    actions.loaded(2)
    return () => {
      g.remove(rig.root)
      rig.root.traverse((o) => o.isMesh && o.geometry.dispose())
      Object.values(rig.M).forEach((m) => m.dispose())
      rig.cylGeo.dispose()
      rig.sphGeo.dispose()
      refs.rama = null
    }
  }, [rig])

  const tmp = useMemo(
    () => ({ hl: new THREE.Vector3(), hr: new THREE.Vector3(), el: new THREE.Vector3(), er: new THREE.Vector3(), nock: new THREE.Vector3(), hintL: new THREE.Vector3(0, -1, 0.4), hintR: new THREE.Vector3(0, 0.45, -0.9), rest: new THREE.Vector3() }),
    [],
  )

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const idx = director.stageIndex
    const vis = director.visual
    const u = vis.stageU
    const sm = (x) => easeInOut(x)
    const { hl, hr, el, er, nock } = tmp

    // ---- phases
    let aimR = 0
    let reachR = 0
    let relaxR = 0
    if (idx === STAGE_INDEX.prepare) {
      aimR = sm(u / 0.2)
      reachR = sm((u - 0.05) / 0.15)
    } else if (idx > STAGE_INDEX.prepare) {
      aimR = 1
      reachR = 1
      relaxR = idx === STAGE_INDEX.release ? 0.3 * u : idx === STAGE_INDEX.flight ? 0.3 + 0.7 * u : 1
    }
    const raise = vis.bowRaise

    // left (bow) hand
    hl.copy(HAND_LOW).lerp(HAND_AIM, aimR).lerp(HAND_UP, raise)
    const breathe = Math.sin(t * 1.6) * 0.03
    hl.y += breathe
    if (idx === STAGE_INDEX.prepare && u > 0.8) hl.y += Math.sin(t * 38) * 0.008 * (u - 0.8) * 5

    // bow transform
    const tilt = lerp(-0.05, 0.0, aimR) + raise * 0.55
    rig.bow.position.copy(hl)
    rig.bow.rotation.set(0, 0, tilt)
    rig.bow.updateMatrix()

    // string / nock
    const nockLocal = lerp(NOCK_REST, NOCK_DRAWN, vis.draw)
    nock.set(nockLocal, 0, 0)
    rig.strU.position.set(0, 0, 0)
    const tipTop = _d.set(-0.65, TIP, 0)
    const tipBot = _h.set(-0.65, -TIP, 0)
    const setStr = (mesh, a, b) => {
      const dir = tmp.rest.subVectors(b, a)
      const len = dir.length()
      mesh.position.copy(a).addScaledVector(dir, 0.5)
      mesh.quaternion.setFromUnitVectors(Y, dir.normalize())
      mesh.scale.set(1, len, 1)
    }
    setStr(rig.strU, tipTop.clone(), nock.clone())
    setStr(rig.strL, nock.clone(), tipBot.clone())
    rig.mount.position.set(nockLocal + 1.5, 0, 0)

    // right (draw) hand
    const nockUpper = nock.clone().applyMatrix4(rig.bow.matrix)
    hr.copy(REST_R)
    const target = nockUpper.clone()
    target.y += 0.05
    const aimed = hr.clone().lerp(target, reachR)
    const relaxPos = REST_R.clone().lerp(nockUpper, 0.0)
    hr.copy(aimed).lerp(relaxPos, relaxR)
    hr.y += breathe

    // arms IK
    ik(SH_L, hl, 1.35, 1.35, tmp.hintL, el)
    ik(SH_R, hr, 1.35, 1.35, tmp.hintR, er)
    placeLimb(rig.limbs.Lu, SH_L, el)
    placeLimb(rig.limbs.Lf, el, hl)
    placeLimb(rig.limbs.Ru, SH_R, er)
    placeLimb(rig.limbs.Rf, er, hr)
    rig.elbowL.position.copy(el)
    rig.elbowR.position.copy(er)
    rig.handL.position.copy(hl)
    rig.handR.position.copy(hr)
    rig.braceL.position.copy(hl).lerp(el, 0.15)
    rig.braceR.position.copy(hr).lerp(er, 0.15)

    // torso lean (aim up) + head
    const aimPitch = PITCH * lerp(0.25, 1, aimR)
    rig.pivot.rotation.x = aimPitch + Math.sin(t * 1.2) * 0.008
    rig.headPitch.rotation.x = -0.1 * aimR + raise * -0.35 + Math.sin(t * 0.8) * 0.02
    rig.headYaw.rotation.y = Math.PI / 2 - 0.15 * (1 - aimR) + Math.sin(t * 0.5) * 0.03
  })

  return <group ref={rootRef} />
}
