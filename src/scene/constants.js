import * as THREE from 'three'

export const RAVANA_POS = new THREE.Vector3(0, 0.5, 0)
export const RAMA_POS = new THREE.Vector3(-13, 0.6, 12)
export const FACE_Y = Math.atan2(RAMA_POS.x - RAVANA_POS.x, RAMA_POS.z - RAVANA_POS.z)
export const RAMA_YAW = Math.atan2(RAVANA_POS.x - RAMA_POS.x, RAVANA_POS.z - RAMA_POS.z)
export const IMPACT_LOCAL = new THREE.Vector3(0, 8.8, 2.9)
export const RAVANA_HEIGHT = 17

// world-space impact point once Ravana faces Rama
export const IMPACT_WORLD = IMPACT_LOCAL.clone()
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE_Y)
  .add(RAVANA_POS)

export const RAMA_MATRIX = new THREE.Matrix4().compose(
  RAMA_POS,
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, RAMA_YAW, 0)),
  new THREE.Vector3(1, 1, 1),
)
export const ramaLocal = (x, y, z, out = new THREE.Vector3()) => out.set(x, y, z).applyMatrix4(RAMA_MATRIX)

export const HOME_CAM = { pos: new THREE.Vector3(20, 11, 30), look: new THREE.Vector3(0, 8.5, 0) }

// shared mutable references between scene modules
export const refs = {
  ravana: null, // { root, samples (Float32Array x,y,z,d), count, maxD }
  rama: null, // { root, mount }
  arrowPos: new THREE.Vector3(),
  arrowDir: new THREE.Vector3(0, 0, 1),
  fireworkFlash: 0,
  fireworkPos: new THREE.Vector3(0, 25, -20),
  fireworkColor: new THREE.Color('#ffd27a'),
}
