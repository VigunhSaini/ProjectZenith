"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useZenithStore } from "@/store/zenith";
import { altAzToXYZ } from "@/lib/coordinates";
import { CelestialObject } from "@/lib/celestial";
import { parseTleToSatrec, propagateSatrec } from "@/lib/satellite";

const SATELLITE_SPHERE_RADIUS = 280; // Layered inside planets/stars for clear visual depth
const MAX_TRAIL_POINTS = 20;

interface SatellitesProps {
  satellites: CelestialObject[];
}

export default function Satellites({ satellites }: SatellitesProps) {
  const { location, selectedObject, setSelectedObject, hoveredObject, setHoveredObject } = useZenithStore();
  const selectObject = setSelectedObject;

  if (!location || satellites.length === 0) return null;

  return (
    <group>
      {satellites.map((sat) => {
        const isSelected = selectedObject?.id === sat.id;
        const isHovered = hoveredObject?.id === sat.id;

        // Compute 3D coordinate in the render pass to establish the base transform
        const [x, y, z] = altAzToXYZ(sat.alt, sat.az, SATELLITE_SPHERE_RADIUS);
        const position = new THREE.Vector3(x, y, z);

        return (
          <SatelliteMesh
            key={sat.id}
            sat={sat}
            position={position}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={() => selectObject(sat)}
            onHover={(hover) => setHoveredObject(hover ? sat : null)}
          />
        );
      })}
    </group>
  );
}

interface SatelliteMeshProps {
  sat: CelestialObject;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hover: boolean) => void;
}

function SatelliteMesh({ sat, position, isSelected, isHovered, onClick, onHover }: SatelliteMeshProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const historyRef = useRef<THREE.Vector3[]>([]);

  // Performance tuning: detect mobile to disable trails
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const [orbitPoints, setOrbitPoints] = useState<THREE.Vector3[]>([]);
  const { location, currentTime } = useZenithStore();

  // Pre-calculate full orbit path lines when selected for active tracking
  useEffect(() => {
    if (!isSelected || !sat.line1 || !sat.line2 || !location) {
      setOrbitPoints([]);
      return;
    }

    const points: THREE.Vector3[] = [];
    const satrec = parseTleToSatrec(sat.line1, sat.line2);
    if (!satrec) return;

    const baseTime = new Date(currentTime);
    // Draw orbit path over 90-minute period (-30 minutes to +60 minutes)
    for (let minOffset = -30; minOffset <= 60; minOffset += 2) {
      const propTime = new Date(baseTime.getTime() + minOffset * 60 * 1000);
      const result = propagateSatrec(
        satrec,
        location.lat,
        location.lon,
        0,
        propTime
      );
      if (result && result.alt > 0) {
        const [x, y, z] = altAzToXYZ(result.alt, result.az, SATELLITE_SPHERE_RADIUS);
        points.push(new THREE.Vector3(x, y, z));
      }
    }
    setOrbitPoints(points);
  }, [isSelected, sat.line1, sat.line2, location, currentTime]);

  const orbitLine = useMemo(() => {
    if (orbitPoints.length === 0) return null;
    const geom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const mat = new THREE.LineBasicMaterial({
      color: "#00FFFF",
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geom, mat);
  }, [orbitPoints]);

  // Update selection ring rotation and accumulate trail history in useFrame
  useFrame((state) => {
    // 1. Rotate and billboard the selection ring
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.8;
      ringRef.current.lookAt(0, 0, 0); // Always face center of sky
    }

    // 2. Update fading trail history
    if (!isMobile) {
      const history = historyRef.current;
      
      // If position changed significantly or history is empty, record it
      if (history.length === 0 || history[history.length - 1].distanceTo(position) > 0.5) {
        history.push(position.clone());
        if (history.length > MAX_TRAIL_POINTS) {
          history.shift();
        }

        // Re-upload line positions to WebGL buffer geometry
        if (trailRef.current) {
          const points = [];
          for (let i = 0; i < history.length; i++) {
            points.push(history[i]);
          }
          
          // Pad the line geometry if not enough points yet
          while (points.length < MAX_TRAIL_POINTS) {
            points.unshift(position);
          }

          trailRef.current.geometry.setFromPoints(points);
        }
      }
    }
  });

  const baseScale = isSelected ? 1.5 : isHovered ? 1.2 : 1.0;

  return (
    <group>
      {/* 1. Fading Orbit Trail (hidden on mobile for performance) */}
      {!isMobile && (
        <line ref={trailRef as unknown as React.Ref<SVGLineElement>}>
          <bufferGeometry />
          <lineBasicMaterial
            color="#00BFFF"
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </line>
      )}

      {/* 1.5 Pre-computed Full Orbit Path (visible when selected for active tracking) */}
      {isSelected && orbitLine && <primitive object={orbitLine} />}

      {/* 2. Interactive Satellite Dot (Increased sphere size from 0.6 to 1.6 for visibility at 280 units distance) */}
      <mesh
        position={position}
        scale={[baseScale, baseScale, baseScale]}
      >
        <sphereGeometry args={[1.6, 8, 8]} />
        <meshBasicMaterial
          color="#00BFFF"
          toneMapped={false}
        />
      </mesh>

      {/* 2.5 Invisible Click Collider (makes it easy to click tiny dots) */}
      <mesh
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[14, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 3. Selected object visual indicator */}
      {isSelected && (
        <mesh ref={ringRef} position={position} scale={[baseScale, baseScale, baseScale]}>
          <ringGeometry args={[2.5, 2.8, 16]} />
          <meshBasicMaterial
            color="#00FFFF"
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
            wireframe
          />
        </mesh>
      )}

      {/* 4. Hover Glow Halo */}
      {isHovered && (
        <mesh position={position}>
          <sphereGeometry args={[2.8, 8, 8]} />
          <meshBasicMaterial
            color="#00BFFF"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
