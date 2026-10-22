import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { director } from '../animation/DahanTimeline'
import { controls, QUALITY } from '../hooks/useSceneControls'

// Moonlight + warm festival lamps; ambient tone warms as the fire grows.
export default function Lighting() {
  const hemi = useRef()
  const lampA = useRef()
  const lampB = useRef()
  const lampC = useRef()
  const c = controls.use()
  const shadow = QUALITY[c.reduced ? 'low' : c.quality].shadow

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const v = director.visual
    hemi.current.intensity = 0.55 + v.fire * 0.35
    const fl = 0.9 + 0.1 * Math.sin(t * 7) * Math.sin(t * 3.1)
    lampA.current.intensity = 900 * fl
    lampB.current.intensity = 700 * (0.9 + 0.1 * Math.sin(t * 5 + 2))
    lampC.current.intensity = 500 * (0.9 + 0.1 * Math.sin(t * 6 + 4))
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#5a74c8', '#2a1a12', 0.55]} />
      <directionalLight
        castShadow
        position={[-30, 55, 20]}
        intensity={1.5}
        color="#8fa6e8"
        shadow-mapSize={[shadow, shadow]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={34}
        shadow-camera-bottom={-20}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      {/* warm festival lamps framing the effigy */}
      <pointLight ref={lampA} position={[12, 9, 14]} color="#ffb061" distance={60} decay={1.7} />
      <pointLight ref={lampB} position={[-14, 7, -9]} color="#ff8a3d" distance={50} decay={1.7} />
      <pointLight ref={lampC} position={[0, 20, -14]} color="#6b86ff" distance={55} decay={1.8} />
    </>
  )
}
