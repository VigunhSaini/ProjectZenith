"use client";

import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useZenithStore } from "@/store/zenith";
import { altAzToXYZ } from "@/lib/coordinates";
import { CelestialObject } from "@/lib/celestial";

const ISS_SPHERE_RADIUS = 322; // Layered with satellites but slightly distinct
const MAX_TRAIL_POINTS = 35; // Longer trail for ISS

interface ISSProps {
  issObject: CelestialObject | null;
}

export default function ISS({ issObject }: ISSProps) {
  const { location, selectedObject, setSelectedObject, hoveredObject, setHoveredObject } = useZenithStore();
  const selectObject = setSelectedObject;

  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const historyRef = useRef<THREE.Vector3[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useFrame((state) => {
    if (!location || !issObject || issObject.alt < 0) return;

    // 1. Calculate 3D position
    const [x, y, z] = altAzToXYZ(issObject.alt, issObject.az, ISS_SPHERE_RADIUS);
    const currentPos = new THREE.Vector3(x, y, z);

    // 2. Position the ISS sphere
    if (meshRef.current) {
      meshRef.current.position.copy(currentPos);
    }

    // 3. Pulse the atmospheric glow effect
    if (glowRef.current) {
      glowRef.current.position.copy(currentPos);
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 4.0) * 0.15;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }

    // 4. Spin selection indicators
    if (ringRef.current) {
      ringRef.current.position.copy(currentPos);
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.6;
      ringRef.current.lookAt(0, 0, 0);
    }

    // 5. Update fading ISS trail (extra long orange trail)
    if (!isMobile) {
      const history = historyRef.current;
      
      if (history.length === 0 || history[history.length - 1].distanceTo(currentPos) > 0.4) {
        history.push(currentPos.clone());
        if (history.length > MAX_TRAIL_POINTS) {
          history.shift();
        }

        if (trailRef.current) {
          const points = [];
          for (let i = 0; i < history.length; i++) {
            points.push(history[i]);
          }
          while (points.length < MAX_TRAIL_POINTS) {
            points.unshift(currentPos);
          }
          trailRef.current.geometry.setFromPoints(points);
        }
      }
    }
  });

  if (!location || !issObject || issObject.alt < 0) return null;

  const isSelected = selectedObject?.id === issObject.id;
  const isHovered = hoveredObject?.id === issObject.id;

  const baseScale = isSelected ? 2.2 : isHovered ? 1.8 : 1.5;

  return (
    <group>
      {/* 1. Long Orange Orbit Trail */}
      {!isMobile && (
        <line ref={trailRef as unknown as React.Ref<SVGLineElement>}>
          <bufferGeometry />
          <lineBasicMaterial
            color="#FF8C00"
            transparent
            opacity={0.45}
            linewidth={2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </line>
      )}

      {/* 2. Glow Halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial
          color="#FF8C00"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 3. Interactive ISS Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(issObject);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredObject(issObject);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredObject(null);
          document.body.style.cursor = "default";
        }}
        scale={[baseScale, baseScale, baseScale]}
      >
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial
          color="#FF8C00"
          toneMapped={false}
        />
      </mesh>

      {/* 4. Selection Target Ring */}
      {isSelected && (
        <mesh ref={ringRef} scale={[baseScale, baseScale, baseScale]}>
          <ringGeometry args={[1.8, 2.0, 32]} />
          <meshBasicMaterial
            color="#FF4500"
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
