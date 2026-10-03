import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text3D, Center, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing'
import { motion, AnimatePresence } from 'framer-motion'
import { net, connect } from './net'
import gsap from 'gsap'
import * as THREE from 'three'
import font from './font.json'

const COL = ['#ff7a00', '#18a5bf', '#ff3d8b']
const N = 40          // rings in flight
const GAP = 3         // distance between rings
const LEN = N * GAP
const PERIOD = 2.71   // seconds for one 2-7-1 cycle (10 rings)
const SPEED = (10 * GAP) / PERIOD
const state = { boost: 0, cycle: 0 }

// Ring slot m in 0..9: slots 0-1 are arcs (the "2"), 2-8 are orbs (the "7"), 9 is a torus (the "1").
function Ring({ slot, k }) {
  const ref = useRef()
  const color = COL[k % 3]
  const m = slot % 10
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const z = -(((k * GAP - t * SPEED * (1 + state.boost * 2.5)) % LEN) + LEN) % LEN
    ref.current.position.z = z + 4
    ref.current.rotation.z = t * 0.3 * (k % 2 ? 1 : -1) + k * 0.4
    const near = THREE.MathUtils.smoothstep(-z, 0, 6)
    const far = 1 - THREE.MathUtils.smoothstep(-z, LEN * 0.7, LEN)
    ref.current.scale.setScalar(Math.max(0.0001, near * far))
  })
  const mat = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} roughness={0.5} />
  return (
    <group ref={ref}>
      {m < 2 && (
        <mesh>
          <torusGeometry args={[6, 0.35, 12, 64, Math.PI * (0.45 + m * 0.4)]} />
          {mat}
        </mesh>
      )}
      {m >= 2 && m < 9 && Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return <mesh key={i} position={[Math.cos(a) * 6, Math.sin(a) * 6, 0]}><sphereGeometry args={[0.42, 24, 16]} />{mat}</mesh>
      })}
      {m === 9 && (
        <mesh>
          <torusGeometry args={[6.4, 0.2, 12, 96]} />
          {mat}
        </mesh>
      )}
    </group>
  )
}

function Walls() {
  const map = useTexture('/hero.jpg')
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(3, 6)
  map.colorSpace = THREE.SRGBColorSpace
  useFrame((_, dt) => { map.offset.y -= dt * 0.35 * (1 + state.boost * 2.5); map.offset.x += dt * 0.01 })
  return (
    <mesh rotation-x={Math.PI / 2} position={[0, 0, -LEN / 2]}>
      <cylinderGeometry args={[11, 11, LEN + 40, 48, 1, true]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} color="#9a8f84" toneMapped={false} />
    </mesh>
  )
}

function Numeral() {
  const g = useRef()
  const parts = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.rotation.y = Math.sin(t * 0.5) * 0.5
    parts.current.forEach((p, i) => {
      // each digit beats in turn: 2, then 7, then 1, once per cycle
      const phase = ((t / PERIOD) % 1) * 3 - i
      const e = phase > 0 && phase < 1 ? Math.sin(phase * Math.PI) : 0
      p.position.y = e * 0.7
      p.rotation.z = e * 0.25 * (i - 1)
      p.scale.setScalar(1 + e * 0.3)
    })
  })
  return (
    <group ref={g} position={[0, 0, -9]}>
      {['2', '7', '1'].map((ch, i) => (
        <group key={ch} ref={(el) => (parts.current[i] = el)} position={[(i - 1) * 3.4, 0, 0]}>
          <Center>
            <Text3D font={font} size={3.2} height={1} bevelEnabled bevelSize={0.06} bevelThickness={0.1} curveSegments={8}>
              {ch}
              <meshStandardMaterial color={COL[i]} emissive={COL[i]} emissiveIntensity={0.9} metalness={0.2} roughness={0.35} />
            </Text3D>
          </Center>
        </group>
      ))}
    </group>
  )
}

// Every other visitor flies the tunnel as a comet at the spot their pointer holds on screen.
function Comet({ id, hue }) {
  const g = useRef()
  const cur = useRef({ x: 0, y: 0, k: 0 })
  const color = useMemo(() => new THREE.Color().setHSL(hue / 360, 1, 0.6), [hue])
  useFrame(({ clock }, dt) => {
    const p = net.peers.get(id)
    if (!p || !g.current) return
    const c = cur.current, f = Math.min(1, dt * 10)
    c.x += (p.x - c.x) * f
    c.y += (p.y - c.y) * f
    c.k += ((p.seen ? 1 : 0) - c.k) * Math.min(1, dt * 5)
    g.current.position.set(c.x * 6, c.y * 3.6, 0.5 + Math.sin(clock.elapsedTime * 2 + c.x) * 0.2)
    g.current.scale.setScalar(c.k)
    g.current.rotation.z = clock.elapsedTime * 2
  })
  return (
    <group ref={g}>
      <mesh><icosahedronGeometry args={[0.3, 1]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh position={[0, 0, 3.6]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.3, 7.2, 14, 1, true]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={color} intensity={14} distance={9} />
    </group>
  )
}

function Rig({ onCycle }) {
  const { camera, pointer } = useThree()
  const last = useRef(0)
  useFrame(({ clock }) => {
    net.move(pointer.x, pointer.y)
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04
    camera.position.y += (pointer.y * 1.0 - camera.position.y) * 0.04
    camera.lookAt(0, 0, -20)
    camera.fov = 60 + state.boost * 35
    camera.updateProjectionMatrix()
    const c = Math.floor(clock.elapsedTime / PERIOD)
    if (c !== last.current) { last.current = c; onCycle(c) }
  })
  return null
}

export default function App() {
  const [cycle, setCycle] = useState(0)
  const [, bump] = useState(0)
  const people = [...net.peers].map(([id, p]) => ({ id, hue: p.hue }))
  const punch = () => {
    gsap.killTweensOf(state)
    gsap.timeline().to(state, { boost: 1, duration: 0.25, ease: 'power3.out' }).to(state, { boost: 0, duration: 1.8, ease: 'power2.inOut' })
  }
  useEffect(() => {
    net.onChange = () => bump((n) => n + 1)
    net.onClick = punch
    return connect()
  }, [])
  const online = net.connected ? people.length + 1 : 1
  return (
    <>
      <Canvas camera={{ position: [0, 0, 6], fov: 60, far: 200 }} dpr={[1, 2]} onPointerDown={() => { punch(); net.click() }}>
        <color attach="background" args={['#14110f']} />
        <fog attach="fog" args={['#14110f', 30, 105]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, 3]} intensity={60} color="#fff2dc" />
        <Suspense fallback={null}>
          <Walls />
          {Array.from({ length: N }, (_, k) => <Ring key={k} k={k} slot={k} />)}
          <Numeral />
          {people.map((p) => <Comet key={p.id} id={p.id} hue={p.hue} />)}
        </Suspense>
        <Rig onCycle={setCycle} />
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.4} mipmapBlur />
          <ChromaticAberration offset={[0.0012, 0.0008]} />
          <Noise opacity={0.12} />
          <Vignette darkness={0.8} offset={0.25} />
        </EffectComposer>
      </Canvas>
      <motion.div className="count" initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', delay: 0.4 }}>cycle {cycle}</motion.div>
      <motion.div className="presence" initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', delay: 0.6 }}>
        <AnimatePresence>
          {people.map((p) => (
            <motion.i key={p.id} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} style={{ background: `hsl(${p.hue} 100% 58%)` }} />
          ))}
        </AnimatePresence>
        <span>{online} {online === 1 ? 'rider' : 'riders'}{net.connected ? '' : ' · offline'}</span>
      </motion.div>
      <motion.div className="hint" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 2 }}>click = hyperspeed for everyone</motion.div>
      <motion.div className="tag" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', delay: 0.8 }}>two · seven · one · again</motion.div>
    </>
  )
}
