import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { loadBrainMesh, loadTermMaps } from '../api'
import { REWARD_WEIGHTS } from '../constants'
import type { BrainMeshData, PhraseScores, TermMaps } from '../types'

// ── Colormap ──────────────────────────────────────────────────────────────────
// Base: light warm gray (#d0ccc8) — the real folds + directional lighting
// handle sulcal shading automatically through geometry.
// Activation overlay: fire colormap matching the META demo (red → orange → yellow → white).
function brainColor(activation: number, sulcal: number): [number, number, number] {
  // Subtle sulcal tint so even at zero activation the folds have contrast.
  // sulcal 0 = deep sulcus, 1 = gyrus (exposed surface)
  const baseR = 0.72 + sulcal * 0.12   // 0.72 → 0.84
  const baseG = 0.70 + sulcal * 0.11   // 0.70 → 0.81
  const baseB = 0.68 + sulcal * 0.10   // 0.68 → 0.78

  const a = Math.max(0, Math.min(1, activation))
  if (a < 0.06) return [baseR, baseG, baseB]

  // Fire colormap — 4 stops: base gray → dark red → orange → yellow → white
  // Stop 0  (a=0.06): base gray
  // Stop 1  (a=0.30): dark red   #8b1a00  (0.545, 0.102, 0.000)
  // Stop 2  (a=0.58): orange     #ff5500  (1.000, 0.333, 0.000)
  // Stop 3  (a=0.80): yellow     #ffcc00  (1.000, 0.800, 0.000)
  // Stop 4  (a=1.00): white      #ffffff  (1.000, 1.000, 1.000)
  const stops: [number, number, number, number][] = [
    [0.06,  baseR,  baseG,  baseB],
    [0.30,  0.545,  0.102,  0.000],
    [0.58,  1.000,  0.333,  0.000],
    [0.80,  1.000,  0.800,  0.000],
    [1.00,  1.000,  1.000,  1.000],
  ]

  for (let i = 1; i < stops.length; i++) {
    const [t0, r0, g0, b0] = stops[i - 1]
    const [t1, r1, g1, b1] = stops[i]
    if (a <= t1) {
      const u = (a - t0) / (t1 - t0)
      return [r0 + u * (r1 - r0), g0 + u * (g1 - g0), b0 + u * (b1 - b0)]
    }
  }
  return [1, 1, 1]
}

// ── Vertex color computation ──────────────────────────────────────────────────
function computeTargetColors(
  termMaps: TermMaps,
  scores:   PhraseScores,
  sulcal:   number[],
  nVerts:   number,
): Float32Array {
  const activation = new Float32Array(nVerts)

  for (const [term, w] of Object.entries(REWARD_WEIGHTS)) {
    if (w === 0) continue
    const s = scores[term]
    if (s === undefined || s === null) continue
    const map = termMaps[term]
    if (!map) continue
    const contrib = w * s
    for (let v = 0; v < nVerts; v++) {
      activation[v] += contrib * (map[v] ?? 0)
    }
  }

  // Normalize positive activation to [0, 1]
  let maxPos = 1e-8
  for (let v = 0; v < nVerts; v++) {
    if (activation[v] > maxPos) maxPos = activation[v]
  }

  const colors = new Float32Array(nVerts * 3)
  for (let v = 0; v < nVerts; v++) {
    const t = Math.max(0, activation[v]) / maxPos
    const [r, g, b] = brainColor(t, sulcal[v] ?? 0.5)
    colors[v * 3]     = r
    colors[v * 3 + 1] = g
    colors[v * 3 + 2] = b
  }
  return colors
}

// ── Mesh component ────────────────────────────────────────────────────────────
interface BrainMeshProps {
  meshData: BrainMeshData
  termMaps: TermMaps
  scores:   PhraseScores
}

function BrainMesh({ meshData, termMaps, scores }: BrainMeshProps) {
  const geoRef    = useRef<THREE.BufferGeometry>(null!)
  const meshRef   = useRef<THREE.Mesh>(null!)
  const curColors = useRef<Float32Array>(new Float32Array(0))
  const tgtColors = useRef<Float32Array>(new Float32Array(0))

  const nVerts = meshData.positions.length / 3

  // Build geometry once
  useEffect(() => {
    const geo = geoRef.current
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meshData.positions), 3))
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1))
    geo.computeVertexNormals()

    const initColors = new Float32Array(nVerts * 3)
    for (let v = 0; v < nVerts; v++) {
      const [r, g, b] = brainColor(0, meshData.sulcal[v] ?? 0.5)
      initColors[v * 3]     = r
      initColors[v * 3 + 1] = g
      initColors[v * 3 + 2] = b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(initColors.slice(), 3))
    curColors.current = initColors.slice()
    tgtColors.current = initColors.slice()
  }, [meshData, nVerts])

  // Recompute target colors when scores change
  useEffect(() => {
    if (nVerts === 0) return
    tgtColors.current = computeTargetColors(termMaps, scores, meshData.sulcal, nVerts)
  }, [scores, termMaps, meshData, nVerts])

  // Smooth lerp toward target each frame
  useFrame(() => {
    const geo = geoRef.current
    if (!geo || curColors.current.length === 0) return
    const cur = curColors.current
    const tgt = tgtColors.current
    const attr = geo.getAttribute('color') as THREE.BufferAttribute
    let dirty = false
    for (let i = 0; i < cur.length; i++) {
      const d = tgt[i] - cur[i]
      if (Math.abs(d) > 0.0005) {
        cur[i] += d * 0.07
        dirty = true
      }
    }
    if (dirty) {
      (attr.array as Float32Array).set(cur)
      attr.needsUpdate = true
    }
  })

  return (
    // Rotate -90° around X so MNI z (superior) maps to Three.js y (up).
    // Without this the brain stands on its posterior face.
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <bufferGeometry ref={geoRef} />
      <meshPhongMaterial
        vertexColors
        side={THREE.DoubleSide}
        shininess={55}
        specular={new THREE.Color(0.18, 0.15, 0.22)}
      />
    </mesh>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ meshData, termMaps, scores }: BrainMeshProps) {
  const [autoRotate, setAutoRotate] = useState(true)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>()

  return (
    <>
      {/* Low ambient so sulci stay dark — geometry does the shading work */}
      <ambientLight intensity={0.28} color="#d8d0e8" />
      {/* Strong key light from top-front-right — brightens exposed gyri */}
      <directionalLight position={[80, 160, 120]}  intensity={1.4} color="#fff8f2" />
      {/* Soft fill from left to show the medial side */}
      <directionalLight position={[-140, 40, 40]}  intensity={0.30} color="#c8d8f0" />
      {/* Subtle back-rim to separate brain from black background */}
      <directionalLight position={[0, -60, -140]}  intensity={0.18} color="#a090c0" />

      <BrainMesh meshData={meshData} termMaps={termMaps} scores={scores} />

      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        enablePan={false}
        enableZoom={false}
        minDistance={120}
        maxDistance={420}
        onStart={() => { clearTimeout(resumeTimer.current); setAutoRotate(false) }}
        onEnd={() => { resumeTimer.current = setTimeout(() => setAutoRotate(true), 3000) }}
      />
    </>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export default function Brain3D({ scores }: { scores: PhraseScores }) {
  const [meshData, setMeshData] = useState<BrainMeshData | null>(null)
  const [termMaps, setTermMaps] = useState<TermMaps | null>(null)
  const [error,    setError]    = useState('')

  useEffect(() => {
    Promise.all([loadBrainMesh(), loadTermMaps()])
      .then(([m, t]) => { setMeshData(m); setTermMaps(t) })
      .catch(e => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <p className="text-text-muted text-xs text-center leading-relaxed">{error}</p>
      </div>
    )
  }

  if (!meshData || !termMaps) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-caramel border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-xs">Loading brain model</span>
        </div>
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 60, 270], fov: 48 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      style={{ background: 'transparent' }}
    >
      <Scene meshData={meshData} termMaps={termMaps} scores={scores} />
    </Canvas>
  )
}
