import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#f5d000";

/* Ambient particle field for depth */
function ParticleField() {
  const ref = useRef();
  const positions = useMemo(() => {
    const n = 1400;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // distribute in a hollow-ish sphere shell
      const r = 4.5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.025;
      ref.current.rotation.x += dt * 0.008;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#9a9a9a"
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
      />
    </Points>
  );
}

/* Build a T-shirt silhouette and give it real 3D depth */
function useTeeGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape();
    // start at left neck, trace the outline clockwise
    s.moveTo(-0.55, 1.55);
    s.lineTo(-1.35, 1.7);            // left shoulder
    s.lineTo(-2.15, 1.15);           // left sleeve outer-top
    s.lineTo(-1.8, 0.55);            // left sleeve outer-bottom
    s.lineTo(-1.05, 0.85);           // left armpit
    s.lineTo(-1.0, -1.9);            // left side -> hem
    s.quadraticCurveTo(0, -2.15, 1.0, -1.9); // curved hem
    s.lineTo(1.05, 0.85);            // right side
    s.lineTo(1.8, 0.55);             // right armpit -> sleeve
    s.lineTo(2.15, 1.15);            // right sleeve outer-top
    s.lineTo(1.35, 1.7);             // right shoulder
    s.lineTo(0.55, 1.55);            // right neck
    s.quadraticCurveTo(0, 1.15, -0.55, 1.55); // neckline curve

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 4,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, []);
}

/* The rotating garment centerpiece */
function Centerpiece() {
  const mesh = useRef();
  const geo = useTeeGeometry();
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.6;
  });
  return (
    <Float speed={1.1} rotationIntensity={0.18} floatIntensity={0.6}>
      <mesh ref={mesh} geometry={geo} scale={1.05}>
        <meshStandardMaterial
          color={ACCENT}
          roughness={0.78}
          metalness={0.05}
          emissive={ACCENT}
          emissiveIntensity={0.06}
        />
      </mesh>
    </Float>
  );
}

/* A few large soft accent orbs, far back */
function AccentOrbs() {
  const orbs = useMemo(
    () => [
      { p: [-3.6, 1.8, -3], s: 0.5 },
      { p: [3.8, -1.6, -4], s: 0.7 },
      { p: [2.4, 2.6, -5], s: 0.4 },
    ],
    []
  );
  return orbs.map((o, i) => (
    <Float key={i} speed={1.2} rotationIntensity={0.4} floatIntensity={1.4}>
      <mesh position={o.p} scale={o.s}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>
    </Float>
  ));
}

/* Whole scene gently parallaxes toward the cursor (damped) */
function Rig({ children }) {
  const group = useRef();
  useFrame((state) => {
    if (!group.current) return;
    const tx = state.pointer.x * 0.35;
    const ty = state.pointer.y * 0.25;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, tx, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -ty, 0.04);
  });
  return <group ref={group}>{children}</group>;
}

export default function Hero3D() {
  return (
    <Canvas
      className="ss-hero3d-canvas"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#f4f4f4"]} />
      <fog attach="fog" args={["#f4f4f4", 8, 17]} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 6, 4]} intensity={2} color="#ffffff" />
      <pointLight position={[-6, -2, -2]} intensity={2.4} color={ACCENT} />
      <pointLight position={[4, 3, 5]} intensity={1.3} color="#ffffff" />

      <Rig>
        <Centerpiece />
        <AccentOrbs />
      </Rig>
      <ParticleField />
    </Canvas>
  );
}
