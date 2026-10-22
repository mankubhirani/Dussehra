import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()
const Y = new THREE.Vector3(0, 1, 0)

// Collects primitives and merges them per material (few draw calls, shared materials).
export class Builder {
  constructor() {
    this.byMat = new Map()
  }
  add(geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], matrix = null } = {}) {
    if (matrix) _m.copy(matrix).multiply(new THREE.Matrix4().compose(_v.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scale)))
    else _m.compose(_v.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scale))
    geo.applyMatrix4(_m)
    if (!this.byMat.has(mat)) this.byMat.set(mat, [])
    this.byMat.get(mat).push(geo)
    return this
  }
  sphere(r, mat, o, w = 16, h = 12) { return this.add(new THREE.SphereGeometry(r, w, h), mat, o) }
  box(x, y, z, mat, o) { return this.add(new THREE.BoxGeometry(x, y, z), mat, o) }
  cyl(rt, rb, h, mat, o, seg = 14) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, o) }
  cone(r, h, mat, o, seg = 10) { return this.add(new THREE.ConeGeometry(r, h, seg), mat, o) }
  torus(r, t, mat, o, arc = Math.PI * 2, rs = 8, ts = 24) { return this.add(new THREE.TorusGeometry(r, t, rs, ts, arc), mat, o) }
  lathe(pts, mat, o, seg = 28) {
    return this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, o)
  }
  // cylinder between two points
  between(a, b, r1, r2, mat, seg = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b)
    const dir = B.clone().sub(A)
    const len = dir.length()
    const mid = A.clone().add(B).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize())
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1))
    const g = new THREE.CylinderGeometry(r2, r1, len, seg)
    g.applyMatrix4(m)
    if (!this.byMat.has(mat)) this.byMat.set(mat, [])
    this.byMat.get(mat).push(g)
    return this
  }
  build({ cast = true, receive = true } = {}) {
    const group = new THREE.Group()
    for (const [mat, geos] of this.byMat) {
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      const mesh = new THREE.Mesh(merged, mat)
      mesh.castShadow = cast
      mesh.receiveShadow = receive
      group.add(mesh)
    }
    this.byMat.clear()
    return group
  }
}
