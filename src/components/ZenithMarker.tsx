"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";

const ZENITH_MARKER_HEIGHT = 200; // Fixed height straight overhead

export default function ZenithMarker() {
  const { mode, showGrid } = useStore();
  const ringRef = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    // Rotate crosshairs in opposite directions for dynamic sci-fi HUD feel
    if (ringRef.current) {
      ringRef.current.rotation.z = elapsed * 0.2;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -elapsed * 0.1;
    }
  });

  // Only render in Scientific Mode, or when grid overlay is requested
  const isVisible = mode === "scientific" || showGrid;
  if (!isVisible) return null;

  const color = "#00FF66"; // Neon green radar color

  return (
    <group position={[0, ZENITH_MARKER_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {/* 1. Outer target ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[8, 8.3, 32]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>

      {/* 2. Inner ticks ring */}
      <mesh ref={ringRef2}>
        <ringGeometry args={[5, 5.2, 4]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.5}
          wireframe
        />
      </mesh>

      {/* 3. Center small dot */}
      <mesh>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* 4. Cardinal ticks (crosshair cross) */}
      <mesh>
        <ringGeometry args={[0.5, 3.5, 4]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>
    </group>
  );
}
