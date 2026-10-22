import * as THREE from 'three'
import { Builder } from './builder'
import { injectBurn, makeBurnDepthMaterial } from './burnMaterial'
import { noiseTexture, clothTexture } from './textures'
import { IMPACT_LOCAL } from './constants'

const std = (o) => injectBurn(new THREE.MeshStandardMaterial(o))

export function createRavanaMaterials() {
  const bump = noiseTexture(256, 4)
  const M = {
    gold: std({ color: '#e0a93a', metalness: 1, roughness: 0.3, bumpMap: bump, bumpScale: 1.2 }),
    bronze: std({ color: '#7a4a22', metalness: 0.85, roughness: 0.42, bumpMap: bump, bumpScale: 1.5 }),
    red: std({ color: '#a3191c', metalness: 0.1, roughness: 0.65, bumpMap: bump, bumpScale: 0.6 }),
    cloth: std({ color: '#ffffff', map: clothTexture(), roughness: 0.8 }),
    dark: std({ color: '#150c0a', roughness: 0.8 }),
    white: std({ color: '#f4ecd8', roughness: 0.4 }),
    eye: std({ color: '#ff3a10', emissive: '#ff2a00', emissiveIntensity: 1.6, roughness: 0.3 }),
    gem: std({ color: '#ff2244', emissive: '#aa0016', emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.1 }),
    jade: std({ color: '#13c27a', emissive: '#046a40', emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.15 }),
    skins: ['#c0572c', '#cf7a3a', '#b84a2c', '#d29045', '#a84028'].map((c) =>
      std({ color: c, roughness: 0.6, bumpMap: bump, bumpScale: 0.5 }),
    ),
  }
  M.depth = makeBurnDepthMaterial()
  M.all = () => [M.gold, M.bronze, M.red, M.cloth, M.dark, M.white, M.eye, M.gem, M.jade, ...M.skins, M.depth]
  return M
}

function buildHead(M, i) {
  const b = new Builder()
  const skin = M.skins[i % M.skins.length]
  b.sphere(0.6, skin, { scale: [0.95, 1.1, 0.95] }, 20, 16)
  b.sphere(0.45, skin, { pos: [0, -0.35, 0.15], scale: [1, 0.8, 0.95] })
  for (const s of [-1, 1]) {
    b.sphere(0.14, M.white, { pos: [s * 0.25, 0.12, 0.5] })
    b.sphere(0.075, M.eye, { pos: [s * 0.25, 0.12, 0.61] })
    b.box(0.36, 0.09, 0.1, M.dark, { pos: [s * 0.26, 0.31, 0.53], rot: [0, 0, -s * 0.45] })
    b.sphere(0.3, M.dark, { pos: [s * 0.22, -0.22, 0.55], scale: [1, 0.22, 0.28], rot: [0, 0, s * 0.35] })
    b.sphere(0.16, M.dark, { pos: [s * 0.5, -0.12, 0.5], scale: [1, 0.22, 0.3], rot: [0, 0, s * 0.95] })
    b.cone(0.045, 0.16, M.white, { pos: [s * 0.1, -0.42, 0.55], rot: [Math.PI, 0, 0] }, 6)
    b.sphere(0.14, skin, { pos: [s * 0.6, -0.02, 0], scale: [0.5, 1, 0.8] })
    b.torus(0.1, 0.025, M.gold, { pos: [s * 0.64, -0.2, 0], rot: [0, Math.PI / 2, 0] })
    b.cone(0.07, 0.4, M.gold, { pos: [s * 0.45, 0.88, 0], rot: [0, 0, -s * 0.5] }, 6)
  }
  b.cone(0.1, 0.32, skin, { pos: [0, -0.04, 0.64], rot: [Math.PI / 2, 0, 0] }, 8)
  b.box(0.3, 0.07, 0.05, M.red, { pos: [0, -0.4, 0.55] })
  b.box(0.05, 0.3, 0.04, M.red, { pos: [0, 0.45, 0.57] })
  // crown
  const tall = i === 4 || i === 5 ? 1.35 : 1
  b.cyl(0.64, 0.66, 0.26, M.gold, { pos: [0, 0.58, 0] }, 20)
  b.cyl(0.36, 0.62, 0.7 * tall, M.gold, { pos: [0, 0.95 + 0.17 * (tall - 1), 0] }, 20)
  b.cone(0.3, 0.7 * tall, M.gold, { pos: [0, 1.62 + 0.4 * (tall - 1), 0] }, 16)
  b.sphere(0.1, i % 2 ? M.jade : M.gem, { pos: [0, 0.6, 0.66] })
  b.sphere(0.07, M.gem, { pos: [0, 1.05, 0.5] })
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2
    b.cone(0.08, 0.34, M.gold, { pos: [Math.sin(a) * 0.62, 0.85, Math.cos(a) * 0.62], rot: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5] }, 6)
  }
  return b.build()
}

export function buildRavana(M) {
  const root = new THREE.Group()
  const b = new Builder()
  // ---- legs & feet
  for (const s of [-1, 1]) {
    b.box(1.4, 0.8, 2.2, M.bronze, { pos: [s * 1.15, 0.4, 0.4] })
    b.cone(0.45, 1.0, M.gold, { pos: [s * 1.15, 0.8, 1.9], rot: [Math.PI / 2 - 0.5, 0, 0] })
    b.between([s * 1.15, 0.7, 0], [s * 1.15, 3.4, 0], 0.55, 0.6, M.skins[0])
    b.cyl(0.72, 0.62, 1.7, M.gold, { pos: [s * 1.15, 1.7, 0] })
    b.torus(0.7, 0.1, M.red, { pos: [s * 1.15, 2.6, 0], rot: [Math.PI / 2, 0, 0] })
  }
  // ---- dhoti skirt + belt
  b.lathe([[0.01, 6.2], [2.3, 6.2], [2.55, 5.2], [2.9, 3.8], [3.05, 2.6], [2.9, 2.3], [2.7, 2.35]], M.cloth, {}, 32)
  b.torus(3.0, 0.16, M.gold, { pos: [0, 2.55, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 8, 40)
  b.box(1.6, 3, 0.15, M.red, { pos: [0, 3.9, 2.85], rot: [0.08, 0, 0] })
  b.box(1.2, 0.2, 0.2, M.gold, { pos: [0, 2.6, 2.95] })
  b.torus(2.3, 0.3, M.gold, { pos: [0, 6.25, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 8, 40)
  b.torus(2.45, 0.14, M.red, { pos: [0, 5.9, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 8, 40)
  b.sphere(0.55, M.gold, { pos: [0, 6.25, 2.4], scale: [1, 1, 0.5] })
  b.sphere(0.25, M.gem, { pos: [0, 6.25, 2.7] })
  // ---- torso & armor
  b.lathe([[2.3, 6.2], [2.45, 7.0], [2.75, 8.2], [3.0, 9.3], [2.7, 10.1], [1.4, 10.5], [0.9, 10.6], [0.01, 10.6]], M.red, {}, 32)
  b.sphere(1, M.gold, { pos: [0, 8.7, 1.6], scale: [2.7, 2.3, 1.6] }, 24, 16)
  for (const s of [-1, 1]) b.sphere(1.1, M.bronze, { pos: [s * 1.3, 9.0, 2.2], scale: [1, 0.85, 0.5] })
  ;[7.1, 7.55].forEach((y) => b.torus(2.75, 0.13, M.bronze, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }, Math.PI * 2, 8, 40))
  b.sphere(0.62, M.gold, { pos: [IMPACT_LOCAL.x, IMPACT_LOCAL.y, 2.7], scale: [1, 1, 0.45] })
  b.sphere(0.36, M.gem, { pos: [IMPACT_LOCAL.x, IMPACT_LOCAL.y, 2.95] })
  b.torus(2.0, 0.14, M.gold, { pos: [0, 10.4, 1.1], rot: [0.5, 0, Math.PI] }, Math.PI, 8, 32)
  b.sphere(0.2, M.jade, { pos: [0, 8.4, 2.9] })
  b.cyl(1.0, 1.1, 0.7, M.skins[0], { pos: [0, 10.6, 0] })
  // ---- shoulders
  for (const s of [-1, 1]) {
    b.sphere(1.15, M.gold, { pos: [s * 3.1, 9.9, 0], scale: [1, 0.85, 1] })
    for (let k = 0; k < 3; k++) b.cone(0.18, 0.7, M.bronze, { pos: [s * (3.1 + k * 0.4), 10.7 - k * 0.1, 0], rot: [0, 0, -s * (0.4 + k * 0.4)] }, 6)
  }
  // ---- 4 arms
  const arm = (S, E, W, r, mat) => {
    b.between(S, E, r, r * 0.85, mat)
    b.between(E, W, r * 0.85, r * 0.7, mat)
    b.sphere(r * 0.9, M.gold, { pos: E })
    b.sphere(r * 0.85, mat, { pos: W })
    b.torus(r * 0.9, 0.09, M.gold, { pos: W, rot: [Math.PI / 2, 0, 0] })
  }
  const R = M.skins[1]
  // main pair
  arm([3.0, 9.8, 0], [4.7, 8.0, 0.8], [4.4, 6.4, 2.6], 0.62, R)
  arm([-3.0, 9.8, 0], [-4.7, 8.0, 0.8], [-4.4, 6.4, 2.6], 0.62, R)
  b.sphere(0.5, R, { pos: [4.4, 6.2, 2.7] })
  b.sphere(0.5, R, { pos: [-4.4, 6.2, 2.7] })
  // sword (right)
  b.box(0.3, 0.3, 0.9, M.gold, { pos: [4.4, 7.0, 2.7] })
  b.box(1.4, 0.18, 0.4, M.gold, { pos: [4.4, 7.5, 2.7] })
  b.box(0.22, 4.6, 0.55, M.bronze, { pos: [4.4, 10.0, 2.7] })
  b.cone(0.28, 0.9, M.bronze, { pos: [4.4, 12.6, 2.7], scale: [0.8, 1, 1] }, 4)
  // mace (left)
  b.cyl(0.14, 0.18, 4.4, M.gold, { pos: [-4.4, 8.0, 2.7] })
  b.sphere(0.95, M.bronze, { pos: [-4.4, 10.6, 2.7] }, 16, 12)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    b.cone(0.17, 0.55, M.gold, { pos: [-4.4 + Math.cos(a) * 0.95, 10.6, 2.7 + Math.sin(a) * 0.95], rot: [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4] }, 6)
  }
  // upper pair raised
  arm([2.7, 10.2, -0.2], [5.4, 10.8, 0.6], [6.0, 12.6, 1.0], 0.5, R)
  arm([-2.7, 10.2, -0.2], [-5.4, 10.8, 0.6], [-6.0, 12.6, 1.0], 0.5, R)
  b.sphere(0.42, R, { pos: [6.0, 12.8, 1.0] })
  b.sphere(0.42, R, { pos: [-6.0, 12.8, 1.0] })
  // trident (right upper)
  b.cyl(0.1, 0.12, 6.4, M.gold, { pos: [6.0, 14.0, 1.0] })
  ;[-0.6, 0, 0.6].forEach((dx, k) => b.cone(0.13, k === 1 ? 1.4 : 1.0, M.bronze, { pos: [6.0 + dx, 17.2 - (k === 1 ? 0 : 0.3), 1.0] }, 6))
  b.torus(0.6, 0.08, M.gold, { pos: [6.0, 17.0, 1.0] }, Math.PI, 6, 16)
  // bow (left upper)
  b.torus(2.4, 0.13, M.gold, { pos: [-6.0, 12.8, 1.0], rot: [0, 0, -Math.PI / 2] }, Math.PI, 8, 28)
  // ---- head yoke: ten heads on a curved arc
  const R_ARC = 4.4
  const pivot = [0, 11.0, 1.0 - R_ARC]
  const yokeM = new THREE.Matrix4()
    .makeTranslation(pivot[0], pivot[1], pivot[2])
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 - (Math.PI * 150) / 360))
  b.add(new THREE.TorusGeometry(R_ARC, 0.38, 10, 48, (Math.PI * 150) / 180), M.gold, { matrix: yokeM })
  const heads = []
  const headSpecs = []
  for (let i = 0; i < 10; i++) {
    const a = ((i - 4.5) / 4.5) * ((75 * Math.PI) / 180)
    const x = Math.sin(a) * R_ARC
    const z = pivot[2] + Math.cos(a) * R_ARC
    const sc = 0.82 + 0.23 * Math.cos(a * 1.1)
    const y = 12.1 + 0.8 * Math.cos(a) + (i % 2 ? 0.12 : -0.05)
    b.between([0, 10.4, 0], [x * 0.9, y - 0.8 * sc, z * 0.9], 0.34, 0.3, M.bronze)
    headSpecs.push({ x, y, z, a, sc })
  }
  const body = b.build()
  root.add(body)
  headSpecs.forEach((h, i) => {
    const g = new THREE.Group()
    const head = buildHead(M, i)
    g.add(head)
    g.position.set(h.x, h.y, h.z)
    g.scale.setScalar(h.sc)
    g.rotation.y = h.a * 0.75
    g.userData = { base: g.rotation.y, baseY: h.y, i }
    root.add(g)
    heads.push(g)
  })
  root.traverse((o) => {
    if (o.isMesh) o.customDepthMaterial = M.depth
  })
  return { root, heads, body }
}

// Random surface samples (root-local), sorted by distance from the impact point.
export function sampleSurface(root, count = 1400) {
  root.updateMatrixWorld(true)
  const pts = []
  const v = new THREE.Vector3()
  root.traverse((o) => {
    if (!o.isMesh) return
    const pos = o.geometry.attributes.position
    const n = pos.count
    const take = Math.max(8, Math.floor((n / 6000) * count))
    for (let k = 0; k < take; k++) {
      v.fromBufferAttribute(pos, Math.floor(Math.random() * n)).applyMatrix4(o.matrixWorld)
      pts.push([v.x, v.y, v.z, v.distanceTo(IMPACT_LOCAL)])
    }
  })
  pts.sort((p, q) => p[3] - q[3])
  const arr = new Float32Array(pts.length * 4)
  pts.forEach((p, i) => arr.set(p, i * 4))
  return { samples: arr, count: pts.length, maxD: pts.length ? pts[pts.length - 1][3] : 10 }
}
