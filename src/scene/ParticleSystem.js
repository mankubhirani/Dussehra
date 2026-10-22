import * as THREE from 'three'

const VERT = /* glsl */ `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aSeed;
varying float vAlpha; varying vec3 vColor; varying float vSeed;
uniform float uScale;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(0.0, aSize * uScale / max(0.1, -mv.z));
  vAlpha = aAlpha; vColor = aColor; vSeed = aSeed;
}`

const FRAG_GLOW = /* glsl */ `
varying float vAlpha; varying vec3 vColor; varying float vSeed;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = 1.0 - d; a = a * a;
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}`

const FRAG_SMOKE = /* glsl */ `
varying float vAlpha; varying vec3 vColor; varying float vSeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  float nz = n(p * 4.0 + vSeed * 17.0) * 0.6 + n(p * 9.0 - vSeed * 5.0) * 0.4;
  float a = smoothstep(1.0, 0.15, d + (nz - 0.5) * 0.7);
  if (a <= 0.001) discard;
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}`

export function makePointsMaterial(shape = 'glow', additive = true) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 800 } },
    vertexShader: VERT,
    fragmentShader: shape === 'smoke' ? FRAG_SMOKE : FRAG_GLOW,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

// Pooled CPU particle system (ring buffer): bounded memory, no per-frame allocation.
export class ParticleSystem {
  constructor({ max = 1000, shape = 'glow', additive = true } = {}) {
    this.max = max
    this.limit = max
    this.cursor = 0
    this.alive = 0
    const n = max
    this.pos = new Float32Array(n * 3)
    this.vel = new Float32Array(n * 3)
    this.age = new Float32Array(n).fill(1)
    this.life = new Float32Array(n).fill(1)
    this.s0 = new Float32Array(n)
    this.s1 = new Float32Array(n)
    this.c0 = new Float32Array(n * 3)
    this.c1 = new Float32Array(n * 3)
    this.peak = new Float32Array(n)
    this.drag = new Float32Array(n)
    this.grav = new Float32Array(n)
    this.turb = new Float32Array(n)
    this.seed = new Float32Array(n)
    this.size = new Float32Array(n)
    this.alpha = new Float32Array(n)
    this.col = new Float32Array(n * 3)
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1))
    this.material = makePointsMaterial(shape, additive)
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = additive ? 10 : 5
  }

  setScale(s) {
    this.limit = Math.max(1, Math.floor(this.max * s))
  }

  // o: {x,y,z,vx,vy,vz,life,s0,s1,c0:[r,g,b],c1:[r,g,b],alpha,drag,grav,turb}
  spawn(o) {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.limit
    const i3 = i * 3
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z
    this.vel[i3] = o.vx; this.vel[i3 + 1] = o.vy; this.vel[i3 + 2] = o.vz
    this.age[i] = 0
    this.life[i] = o.life
    this.s0[i] = o.s0; this.s1[i] = o.s1
    this.c0[i3] = o.c0[0]; this.c0[i3 + 1] = o.c0[1]; this.c0[i3 + 2] = o.c0[2]
    this.c1[i3] = o.c1[0]; this.c1[i3 + 1] = o.c1[1]; this.c1[i3 + 2] = o.c1[2]
    this.peak[i] = o.alpha ?? 1
    this.drag[i] = o.drag ?? 0
    this.grav[i] = o.grav ?? 0
    this.turb[i] = o.turb ?? 0
    this.seed[i] = Math.random()
    this.geometry.attributes.aSeed.needsUpdate = true
  }

  clear() {
    this.age.fill(1)
    this.life.fill(1)
    this.size.fill(0)
    this.alpha.fill(0)
    this.cursor = 0
    this.alive = 0
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true
  }

  update(dt, time, uScale, fadePow = 1.4) {
    this.material.uniforms.uScale.value = uScale
    let alive = 0
    const { pos, vel, age, life, s0, s1, c0, c1, peak, drag, grav, turb, seed, size, alpha, col } = this
    for (let i = 0; i < this.max; i++) {
      if (age[i] >= life[i]) {
        if (size[i] !== 0) { size[i] = 0; alpha[i] = 0 }
        continue
      }
      alive++
      const i3 = i * 3
      age[i] += dt
      const t = Math.min(1, age[i] / life[i])
      if (turb[i] > 0) {
        const sd = seed[i] * 6.283
        vel[i3] += Math.sin(time * 2.3 + sd + pos[i3 + 1] * 0.7) * turb[i] * dt
        vel[i3 + 2] += Math.cos(time * 1.9 + sd + pos[i3 + 1] * 0.6) * turb[i] * dt
        vel[i3 + 1] += Math.sin(time * 3.1 + sd) * turb[i] * 0.3 * dt
      }
      vel[i3 + 1] += grav[i] * dt
      const dr = Math.exp(-drag[i] * dt)
      vel[i3] *= dr; vel[i3 + 1] *= dr; vel[i3 + 2] *= dr
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt
      size[i] = s0[i] + (s1[i] - s0[i]) * t
      alpha[i] = peak[i] * Math.min(1, t * 8) * Math.pow(1 - t, fadePow)
      col[i3] = c0[i3] + (c1[i3] - c0[i3]) * t
      col[i3 + 1] = c0[i3 + 1] + (c1[i3 + 1] - c0[i3 + 1]) * t
      col[i3 + 2] = c0[i3 + 2] + (c1[i3 + 2] - c0[i3 + 2]) * t
    }
    this.alive = alive
    const a = this.geometry.attributes
    a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = a.aColor.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}

// reusable spawn option object (avoids allocation)
export const makeSpawn = () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, s0: 1, s1: 1,
  c0: [1, 1, 1], c1: [1, 1, 1], alpha: 1, drag: 0, grav: 0, turb: 0,
})

// world-units -> pixels scale for point sprites
export function pointScale(gl, camera) {
  const h = gl.domElement.height
  return h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
}
