import { Suspense, useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Error boundary for 3D components
let threeError = null
try {
  if (typeof THREE === 'undefined') {
    throw new Error('Three.js not loaded')
  }
} catch (error) {
  threeError = error
  console.error('Three.js initialization error:', error)
}

// Depth-based particle field
function DepthParticles({ prefersReducedMotion }) {
  const pointsRef = useRef()

  // Adaptive particle count based on device and motion preference
  const particleCount = useMemo(() => {
    if (prefersReducedMotion) return 200

    if (typeof window !== 'undefined') {
      const isMobile = /Mobi|Android/i.test(window.navigator.userAgent || '')
      return isMobile ? 600 : 1200
    }

    return 800
  }, [prefersReducedMotion])

  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      arr[i3] = (Math.random() - 0.5) * 10 // x
      arr[i3 + 1] = (Math.random() - 0.5) * 6 // y
      arr[i3 + 2] = -5 - Math.random() * 35 // z (far behind camera)
    }
    return arr
  }, [particleCount])

  useFrame((state, delta) => {
    const points = pointsRef.current
    if (!points) return

    const positionsAttr = points.geometry.attributes.position
    const array = positionsAttr.array

    // Slightly stronger but still calm motion so it's clearly visible
    const baseSpeed = prefersReducedMotion ? 0.8 : 2.8
    const driftStrength = prefersReducedMotion ? 0.03 : 0.06

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Forward motion along Z (towards camera at z ~ 5)
      array[i3 + 2] += baseSpeed * delta

      // Gentle XY drift
      const t = state.clock.elapsedTime + i * 0.01
      array[i3] += Math.sin(t * 0.4) * driftStrength * delta
      array[i3 + 1] += Math.cos(t * 0.3) * driftStrength * delta

      // Respawn behind camera once particle passes it
      if (array[i3 + 2] > 5) {
        array[i3] = (Math.random() - 0.5) * 10
        array[i3 + 1] = (Math.random() - 0.5) * 6
        array[i3 + 2] = -5 - Math.random() * 35
      }
    }

    positionsAttr.needsUpdate = true

    // Very subtle camera parallax
    const cam = state.camera
    const parallax = prefersReducedMotion ? 0.02 : 0.06
    cam.position.x = Math.sin(state.clock.elapsedTime * 0.05) * parallax
    cam.position.y = Math.cos(state.clock.elapsedTime * 0.04) * parallax
    cam.lookAt(0, 0, 0)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        // Darker, more visible particles while staying soft
        size={0.09}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={0.55}
        color={new THREE.Color('#F59E0B').lerp(new THREE.Color('#F97316'), 0.3)}
      />
    </points>
  )
}

export default function Background3D({ intensity = 0.35 }) {
  // If Three.js failed to load, return null instead of crashing
  if (threeError) {
    console.warn('Background3D disabled due to Three.js error:', threeError)
    return null
  }

  const [canRender, setCanRender] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // WebGL capability check (fail-safe: try to enable, rely on Canvas try/catch)
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        console.warn('WebGL not available – Background3D disabled.')
        setCanRender(false)
      } else {
        setCanRender(true)
      }
    } catch (error) {
      console.warn('WebGL check inconclusive, attempting to render anyway.', error)
      setCanRender(true)
    }

    // prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handleChange = (event) => setPrefersReducedMotion(event.matches)
    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange)
    } else {
      mq.addListener(handleChange)
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handleChange)
      } else {
        mq.removeListener(handleChange)
      }
    }
  }, [])

  if (!canRender) {
    // Fallback to plain background – no WebGL
    return null
  }

  try {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: intensity,
          zIndex: 0,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 55 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
        >
          <Suspense fallback={null}>
            {/* Soft, even lighting to support subtle glow */}
            <color attach="background" args={['transparent']} />
            <ambientLight intensity={0.8} color="#FDE68A" />

            <DepthParticles prefersReducedMotion={prefersReducedMotion} />
          </Suspense>
        </Canvas>
      </div>
    )
  } catch (error) {
    console.error('Background3D render error:', error)
    return null
  }
}