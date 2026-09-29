import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { CompanionState } from "@/types";

/**
 * Placeholder 3D companion presence. No external model download required.
 * The state -> motion mapping here is the same seam a future GLB/GLTF rig
 * will use (swap the <PresenceForm /> for a loaded model + animation mixer).
 */

interface Companion3DProps {
  state: CompanionState;
  hue: number;
  animation: "full" | "reduced" | "off";
  className?: string;
}

const STATE_MOTION: Record<
  CompanionState,
  { speed: number; pulse: number; spin: number; intensity: number }
> = {
  idle: { speed: 0.5, pulse: 0.05, spin: 0.08, intensity: 1 },
  listening: { speed: 0.9, pulse: 0.1, spin: 0.16, intensity: 1.35 },
  thinking: { speed: 1.5, pulse: 0.07, spin: 0.55, intensity: 1.15 },
  talking: { speed: 2.1, pulse: 0.16, spin: 0.24, intensity: 1.5 },
  generating: { speed: 2.6, pulse: 0.22, spin: 0.85, intensity: 1.7 },
  offline: { speed: 0, pulse: 0, spin: 0, intensity: 0.25 },
};

function hueColor(hue: number, lightness = 0.62, chroma = 0.16) {
  return new THREE.Color(`hsl(${hue}, ${Math.round(chroma * 400)}%, ${Math.round(lightness * 100)}%)`);
}

function PresenceForm({
  state,
  hue,
  animation,
}: {
  state: CompanionState;
  hue: number;
  animation: "full" | "reduced" | "off";
}) {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Group>(null);
  const motion = STATE_MOTION[state];
  const factor = animation === "off" ? 0 : animation === "reduced" ? 0.4 : 1;

  const color = useMemo(() => hueColor(hue), [hue]);
  const deepColor = useMemo(() => hueColor(hue + 25, 0.45), [hue]);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const breathe = 1 + Math.sin(t * motion.speed) * motion.pulse * factor;
    if (core.current) {
      core.current.scale.setScalar(breathe);
    }
    if (shell.current) {
      shell.current.rotation.y += delta * motion.spin * factor;
      shell.current.rotation.x = Math.sin(t * 0.3) * 0.15 * factor;
      shell.current.scale.setScalar(1 + Math.sin(t * motion.speed * 0.7) * 0.03 * factor);
    }
    if (ring.current) {
      ring.current.rotation.z += delta * 0.25 * motion.spin * factor;
      ring.current.rotation.x = 1.2 + Math.sin(t * 0.4) * 0.12 * factor;
    }
  });

  return (
    <group position={[0, -0.1, 0]}>
      <Float
        speed={factor === 0 ? 0 : 1.2 * motion.speed}
        rotationIntensity={0.15 * factor}
        floatIntensity={0.5 * factor}
      >
        <mesh ref={core}>
          <icosahedronGeometry args={[0.62, 5]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={motion.intensity}
            roughness={0.25}
            metalness={0.1}
          />
        </mesh>

        <mesh ref={shell}>
          <icosahedronGeometry args={[1.05, 2]} />
          <meshStandardMaterial
            color={deepColor}
            emissive={color}
            emissiveIntensity={motion.intensity * 0.25}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>

        <group ref={ring}>
          <mesh>
            <torusGeometry args={[1.5, 0.012, 8, 128]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={motion.intensity * 0.8}
            />
          </mesh>
          <mesh rotation={[0.5, 0.4, 0]}>
            <torusGeometry args={[1.75, 0.006, 8, 128]} />
            <meshStandardMaterial
              color={deepColor}
              emissive={deepColor}
              emissiveIntensity={motion.intensity * 0.6}
            />
          </mesh>
        </group>
      </Float>

      <pointLight position={[0, 0, 0]} intensity={2.2 * motion.intensity} color={color} distance={7} />
    </group>
  );
}

export function Companion3D({ state, hue, animation, className }: Companion3DProps) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 4.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        frameloop={animation === "off" ? "demand" : "always"}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} />
        <Suspense fallback={null}>
          <PresenceForm state={state} hue={hue} animation={animation} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Companion3D;
