import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { director } from '../animation/DahanTimeline'
import { controls, effectiveQuality, QUALITY } from '../hooks/useSceneControls'
import { groundTexture, rangoliTexture, glowTexture } from './textures'
import { RAVANA_POS, RAMA_POS } from './constants'

// ---------------------------------------------------------------- sky dome
const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const skyFrag = /* glsl */ `
varying vec3 vDir; uniform float uGlow;
void main(){
  float h = clamp(vDir.y, -0.1, 1.0);
  vec3 zenith = vec3(0.004, 0.008, 0.03);
  vec3 mid = vec3(0.018, 0.04, 0.12);
  vec3 hor = vec3(0.12, 0.07, 0.15);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h));
  c = mix(c, zenith, smoothstep(0.2, 0.9, h));
  float band = exp(-abs(h) * 9.0);
  c += vec3(0.55, 0.22, 0.05) * band * (0.05 + uGlow * 0.5);
  gl_FragColor = vec4(c, 1.0);
}`

function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uGlow: { value: 0 } } }), [])
  const geo = useMemo(() => new THREE.SphereGeometry(420, 32, 16), [])
  useEffect(() => () => { mat.dispose(); geo.dispose() }, [mat, geo])
  useFrame(() => {
    const v = director.visual
    mat.uniforms.uGlow.value = v.fire * (1 - v.dissolve * 0.6)
  })
  return <mesh geometry={geo} material={mat} renderOrder={-10} frustumCulled={false} />
}

function Moon() {
  const tex = useMemo(() => glowTexture(), [])
  return (
    <group position={[-170, 150, -250]}>
      <sprite scale={[130, 130, 1]}>
        <spriteMaterial map={tex} color="#7d93d6" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </sprite>
      <mesh>
        <sphereGeometry args={[9, 24, 16]} />
        <meshBasicMaterial color="#dfe8ff" fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------ ground & plinths
function Ground() {
  const gt = useMemo(() => groundTexture(), [])
  const rt = useMemo(() => rangoliTexture(), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[400, 64]} />
        <meshStandardMaterial map={gt} color="#6b5a4c" roughness={0.97} metalness={0} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[RAVANA_POS.x, 0.03, RAVANA_POS.z]} receiveShadow>
        <circleGeometry args={[13, 96]} />
        <meshStandardMaterial map={rt} roughness={0.9} metalness={0} emissiveMap={rt} emissive="#ffffff" emissiveIntensity={0.08} transparent opacity={0.92} />
      </mesh>
      <mesh position={[RAVANA_POS.x, 0.25, RAVANA_POS.z]} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 5.0, 0.5, 40]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[RAMA_POS.x, 0.3, RAMA_POS.z]} castShadow receiveShadow>
        <cylinderGeometry args={[3.0, 3.3, 0.6, 36]} />
        <meshStandardMaterial color="#4a3326" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[RAMA_POS.x, 0.62, RAMA_POS.z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.5, 2.7, 48]} />
        <meshStandardMaterial color="#d9a441" metalness={1} roughness={0.35} emissive="#7a4a08" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------ crowd
function Crowd() {
  const ref = useRef()
  const N = 220
  const { geo, data } = useMemo(() => {
    const body = new THREE.CapsuleGeometry(0.32, 1.0, 3, 8)
    body.translate(0, 0.95, 0)
    const head = new THREE.SphereGeometry(0.26, 8, 6)
    head.translate(0, 1.95, 0)
    const arm = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 5)
    arm.rotateZ(0.5)
    arm.translate(0.3, 1.75, 0)
    const parts = [body, head, arm]
    const geo = mergeSimple(parts)
    const data = []
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < N; i++) {
      const a = Math.PI * 0.05 + rnd() * Math.PI * 1.9 // leave a gap near the camera side
      const r = 52 + rnd() * 24 + (i % 3) * 3
      const x = Math.sin(a + 0.9) * r * 1.15
      const z = -Math.cos(a + 0.9) * r
      data.push({ x, z, s: 0.8 + rnd() * 0.45, ph: rnd() * 6.28, yaw: rnd() * 6.28, hop: 0.5 + rnd() })
    }
    return { geo, data }
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#04050b' }), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  const frame = useRef(0)
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  useFrame((s) => {
    frame.current++
    const celebrate = director.visual.fireworks
    if (!celebrate && frame.current > 3 && frame.current % 90 !== 0) return
    const t = s.clock.elapsedTime
    const mesh = ref.current
    for (let i = 0; i < N; i++) {
      const d = data[i]
      const hop = celebrate ? Math.abs(Math.sin(t * 3 * d.hop + d.ph)) * 0.5 : 0
      v.set(d.x, hop, d.z)
      q.setFromEuler(e.set(0, Math.atan2(-d.x, -d.z) + 0.2 * Math.sin(d.ph), 0))
      sc.set(d.s, d.s * (1 + (celebrate ? 0.04 : 0)), d.s)
      m4.compose(v, q, sc)
      mesh.setMatrixAt(i, m4)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, N]} frustumCulled={false} />
}

function mergeSimple(geos) {
  // tiny non-indexed merge (avoids importing the utils module again)
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  let count = 0
  parts.forEach((p) => (count += p.attributes.position.count))
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  let o = 0
  parts.forEach((p) => {
    pos.set(p.attributes.position.array, o * 3)
    nor.set(p.attributes.normal.array, o * 3)
    o += p.attributes.position.count
  })
  geos.forEach((g) => g.dispose())
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  return out
}

// ---------------------------------------- distant skyline + festival lights
function Skyline() {
  const { geo, lights } = useMemo(() => {
    let seed = 91
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const boxes = []
    const pts = []
    const cols = []
    const col = new THREE.Color()
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + rnd() * 0.05
      const r = 150 + rnd() * 40
      const w = 8 + rnd() * 16
      const h = 6 + rnd() * 26
      const b = new THREE.BoxGeometry(w, h, 8 + rnd() * 8)
      b.rotateY(-a)
      b.translate(Math.sin(a) * r, h / 2, -Math.cos(a) * r)
      boxes.push(b)
      for (let k = 0; k < 6; k++) {
        const hh = 2 + rnd() * h
        pts.push(Math.sin(a) * (r - 7) + (rnd() - 0.5) * w * 0.8, hh, -Math.cos(a) * (r - 7) + (rnd() - 0.5) * w * 0.4)
        col.setHSL(0.08 + rnd() * 0.05, 0.9, 0.6)
        cols.push(col.r, col.g, col.b)
      }
    }
    // festival string lights along two arcs behind the crowd
    for (let arc = 0; arc < 3; arc++) {
      const r = 82 + arc * 9
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2
        pts.push(Math.sin(a) * r, 6 + Math.sin(i * 0.9 + arc) * 0.8 + arc * 1.2, -Math.cos(a) * r)
        col.setHSL(((i * 0.13 + arc * 0.3) % 1) * 0.15 + (i % 5 === 0 ? 0.55 : 0.05), 0.95, 0.62)
        cols.push(col.r * 2, col.g * 2, col.b * 2)
      }
    }
    const geo = mergeSimple(boxes)
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    lg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    return { geo, lights: lg }
  }, [])
  const tex = useMemo(() => glowTexture(), [])
  const ptsRef = useRef()
  useEffect(() => () => { geo.dispose(); lights.dispose() }, [geo, lights])
  useFrame((s) => {
    if (ptsRef.current) ptsRef.current.material.opacity = 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * 2.1)
  })
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#070a18" fog />
      </mesh>
      <points ref={ptsRef} geometry={lights} frustumCulled={false}>
        <pointsMaterial map={tex} size={3.2} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} fog={false} />
      </points>
    </group>
  )
}

export default function Environment() {
  const q = controls.use()
  const quality = q.reduced ? 'low' : q.quality
  return (
    <>
      <color attach="background" args={['#02040c']} />
      <fogExp2 attach="fog" args={['#0a1226', 0.0075]} />
      <Sky />
      <Moon />
      <Stars radius={300} depth={80} count={QUALITY[quality].stars} factor={7} saturation={0.3} fade speed={0.4} />
      <Ground />
      <Crowd />
      <Skyline />
    </>
  )
}
