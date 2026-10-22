import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { director } from '../animation/DahanTimeline'
import { particleScale } from '../hooks/useSceneControls'
import { ParticleSystem, makeSpawn, pointScale } from './ParticleSystem'
import { refs, RAVANA_POS, RAVANA_HEIGHT } from './constants'
import { audio } from '../audio/AudioManager'

const _v = new THREE.Vector3()

// Pick a random burning surface point (world space). Returns false if none.
function pickPoint(out, spread, dissolve, bias = 0) {
  const r = refs.ravana
  if (!r || !r.count) return false
  const front = spread * r.maxD * 1.15
  // binary search: number of samples within burning radius
  let lo = 0, hi = r.count
  const S = r.samples
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    S[mid * 4 + 3] < front ? (lo = mid + 1) : (hi = mid)
  }
  if (lo < 3) return false
  const yLimit = RAVANA_HEIGHT * (1.3 * (1 - dissolve) - 0.15)
  for (let tries = 0; tries < 4; tries++) {
    const k = Math.random()
    const i = Math.min(lo - 1, Math.floor(lo * (bias > 0 && Math.random() < 0.5 ? 1 - k * k : k)))
    _v.set(S[i * 4], S[i * 4 + 1], S[i * 4 + 2])
    r.root.localToWorld(_v)
    if (_v.y - RAVANA_POS.y < yLimit || dissolve <= 0) {
      out.copy(_v)
      return true
    }
  }
  return false
}

const EMBER_BED_FRAG = /* glsl */ `
uniform float uTime, uLevel;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float cracks = n(p * 7.0 + uTime * 0.05) * 0.6 + n(p * 15.0 - uTime * 0.08) * 0.4;
  float glow = smoothstep(0.45, 0.8, cracks) * (0.6 + 0.4 * sin(uTime * 3.0 + cracks * 12.0));
  float a = (1.0 - smoothstep(0.55, 1.0, r)) * uLevel;
  vec3 col = mix(vec3(1.6, 0.35, 0.04), vec3(3.0, 1.4, 0.3), glow);
  gl_FragColor = vec4(col * (0.25 + glow), a * (0.25 + glow));
  #include <colorspace_fragment>
}`

export default function FireParticles() {
  const { gl, camera } = useThree()
  const flames = useMemo(() => new ParticleSystem({ max: 3200 }), [])
  const embers = useMemo(() => new ParticleSystem({ max: 1400 }), [])
  const sp = useMemo(makeSpawn, [])
  const acc = useRef({ f: 0, e: 0, flick: 1, audioT: 0 })
  const light1 = useRef()
  const light2 = useRef()
  const bed = useRef()
  const bedMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uLevel: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: EMBER_BED_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const bedGeo = useMemo(() => new THREE.CircleGeometry(5.5, 48), [])

  useEffect(() => {
    const off = director.on((e) => {
      if (e.type === 'reset' || e.type === 'start') {
        flames.clear()
        embers.clear()
      }
    })
    return () => {
      off()
      flames.dispose()
      embers.dispose()
      bedMat.dispose()
      bedGeo.dispose()
    }
  }, [flames, embers, bedMat, bedGeo])

  useFrame((state, dtRaw) => {
    const dt = director.paused ? 0 : Math.min(dtRaw, 0.1)
    const t = state.clock.elapsedTime
    const vis = director.visual
    const A = acc.current
    const q = particleScale()
    const fire = vis.fire
    const remaining = 1 - vis.dissolve

    if (dt > 0 && fire > 0.01) {
      // flames: body fire while the effigy stands, then a ground fire
      A.f += fire * 1100 * q * dt
      let n = Math.floor(A.f)
      A.f -= n
      n = Math.min(n, 90)
      for (let i = 0; i < n; i++) {
        let ok = remaining > 0.02 && pickPoint(_v, vis.spread, vis.dissolve, 1)
        let x, y, z
        if (ok) {
          x = _v.x; y = _v.y; z = _v.z
        } else {
          const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 3.6
          x = RAVANA_POS.x + Math.cos(a) * r; y = 0.3; z = RAVANA_POS.z + Math.sin(a) * r
        }
        const hot = Math.random() < 0.25
        Object.assign(sp, {
          x: x + (Math.random() - 0.5) * 0.5, y, z: z + (Math.random() - 0.5) * 0.5,
          vx: (Math.random() - 0.5) * 1.6, vy: 1.6 + Math.random() * 2.6, vz: (Math.random() - 0.5) * 1.6,
          life: 0.7 + Math.random() * 0.8, s0: 1.2 + Math.random() * 1.2, s1: 0.2,
          alpha: ok ? 0.5 : 0.4, drag: 0.8, grav: 1.6, turb: 2.5,
        })
        sp.c0 = hot ? [2.8, 2.3, 1.4] : [2.4, 1.3, 0.35]
        sp.c1 = hot ? [2.0, 0.6, 0.08] : [1.5, 0.22, 0.03]
        flames.spawn(sp)
      }
      // embers & sparks
      A.e += fire * 160 * q * dt
      let m = Math.floor(A.e)
      A.e -= m
      m = Math.min(m, 30)
      for (let i = 0; i < m; i++) {
        let ok = remaining > 0.02 && pickPoint(_v, vis.spread, vis.dissolve)
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 3.6
        Object.assign(sp, {
          x: ok ? _v.x : RAVANA_POS.x + Math.cos(a) * r, y: ok ? _v.y : 0.4, z: ok ? _v.z : RAVANA_POS.z + Math.sin(a) * r,
          vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 2.5,
          life: 2 + Math.random() * 3.5, s0: 0.1 + Math.random() * 0.14, s1: 0.03,
          alpha: 1, drag: 0.25, grav: 0.7, turb: 3.2,
        })
        sp.c0 = [3.0, 1.3, 0.3]; sp.c1 = [1.0, 0.12, 0.0]
        embers.spawn(sp)
      }
    }

    flames.setScale(q); embers.setScale(q)
    const sc = pointScale(gl, camera)
    flames.update(dt, t, sc, 1.2)
    embers.update(dt, t, sc, 0.7)

    // flicker lights respond to fire intensity
    A.flick = 0.8 + 0.2 * Math.sin(t * 17) + 0.12 * Math.sin(t * 29 + 1) + 0.08 * Math.random()
    const lv = fire * (0.5 + 0.5 * remaining + 0.0)
    light1.current.intensity = lv * 1100 * A.flick
    light2.current.intensity = fire * 380 * A.flick
    light1.current.position.y = 4 + remaining * 6
    bedMat.uniforms.uTime.value = t
    bedMat.uniforms.uLevel.value = Math.min(1, vis.dissolve * 1.4) * Math.min(1, fire * 2.2 + 0.25)
    bed.current.visible = vis.dissolve > 0.01

    // audio crackle tracks fire level
    A.audioT += dt
    if (A.audioT > 0.1) {
      A.audioT = 0
      audio.setFireLevel(fire)
    }
  })

  return (
    <>
      <primitive object={flames.points} />
      <primitive object={embers.points} />
      <mesh ref={bed} geometry={bedGeo} material={bedMat} position={[RAVANA_POS.x, 0.08, RAVANA_POS.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} visible={false} />
      <pointLight ref={light1} position={[0, 8, 3]} color="#ff7a22" distance={75} decay={1.7} intensity={0} />
      <pointLight ref={light2} position={[0, 1.6, 4]} color="#ff5a14" distance={40} decay={1.8} intensity={0} />
    </>
  )
}
