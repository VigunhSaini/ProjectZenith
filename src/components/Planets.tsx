"use client";

import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useZenithStore } from "@/store/zenith";
import { altAzToXYZ } from "@/lib/coordinates";
import { CelestialObject } from "@/lib/celestial";

const PLANET_SPHERE_RADIUS = 300; // Position distance from origin

interface PlanetsProps {
  planets: CelestialObject[];
}

export default function Planets({ planets }: PlanetsProps) {
  const { location, selectedObject, setSelectedObject, hoveredObject, setHoveredObject } = useZenithStore();
  const selectObject = setSelectedObject;

  if (!location || planets.length === 0) return null;

  return (
    <group>
      {planets.map((planet) => {
        // Calculate 3D horizontal position in observer coordinate system
        const [x, y, z] = altAzToXYZ(planet.alt, planet.az, PLANET_SPHERE_RADIUS);
        const position = new THREE.Vector3(x, y, z);

        const isSelected = selectedObject?.id === planet.id;
        const isHovered = hoveredObject?.id === planet.id;

        return (
          <PlanetMesh
            key={planet.id}
            planet={planet}
            position={position}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={() => selectObject(planet)}
            onHover={(hover) => setHoveredObject(hover ? planet : null)}
          />
        );
      })}
    </group>
  );
}

interface PlanetMeshProps {
  planet: CelestialObject;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hover: boolean) => void;
}

function PlanetMesh({ planet, position, isSelected, isHovered, onClick, onHover }: PlanetMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Dynamic scale factor for hover and selection
  const baseScale = getBasePlanetScale(planet.name);
  const scale = baseScale * (isSelected ? 1.4 : isHovered ? 1.2 : 1.0);

  // Slowly rotate the planet and spin the selection ring
  useFrame((state) => {
    // 1. Slow planetary spin
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.005;
    }

    // 2. Rotate selection ring
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.5;
    }

    // 3. Make the planet billboard-face the camera if we have rings or text
    if (groupRef.current) {
      // Look at camera but keep up vector consistent
      groupRef.current.lookAt(0, 0, 0);
    }
  });

  // Generate planet-specific material/shaders with useMemo to prevent GPU memory leaks
  const material = useMemo(() => {
    return getPlanetMaterial(planet.name, planet.color);
  }, [planet.name, planet.color]);

  // Clean up WebGL resources
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* 1. Interactive Sphere */}
      <mesh
        ref={sphereRef}
        material={material}
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
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* 2. Saturn's Ring */}
      {planet.name === "Saturn" && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[1.4, 2.5, 64]} />
          <meshBasicMaterial
            color="#E4D191"
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* 3. Selection Ring (Sci-fi rotating dashed circle) */}
      {isSelected && (
        <mesh ref={ringRef}>
          <ringGeometry args={[2.8, 3.0, 32]} />
          <meshBasicMaterial
            color="#00FFFF"
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            wireframe // Renders lines instead of triangles
          />
        </mesh>
      )}

      {/* 4. Glowing Atmosphere / Halo (for Venus, Jupiter, Mars) */}
      {(isHovered || isSelected) && (
        <mesh>
          <sphereGeometry args={[1.15, 16, 16]} />
          <meshBasicMaterial
            color={planet.color}
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

/**
 * Returns a custom Three.js Material for a planet to match its celestial characteristics.
 */
function getPlanetMaterial(name: string, colorHex: string) {
  if (name === "Jupiter") {
    // Custom shader material for Jupiter's gas bands
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color("#C88B3A") }, // beige
        color2: { value: new THREE.Color("#8B4513") }, // brown
        color3: { value: new THREE.Color("#FFF8DC") }, // light white
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        void main() {
          // Create horizontal stripes based on UV.y
          float y = vUv.y * 12.0;
          float stripe = sin(y) * cos(y * 0.5) * 0.5 + 0.5;
          
          vec3 finalColor;
          if (stripe < 0.3) {
            finalColor = mix(color1, color2, stripe / 0.3);
          } else {
            finalColor = mix(color2, color3, (stripe - 0.3) / 0.7);
          }
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }

  // Venus: Intense glowing white-yellow cloud deck
  if (name === "Venus") {
    return new THREE.MeshBasicMaterial({
      color: "#FFE7BA",
      toneMapped: false,
    });
  }

  // Standard planets: glowing basic mesh material to maintain look in dome
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
  });
}

/**
 * Returns baseline visual sizing scales for planets so they have relative sizing
 * but remain readable in the 3D scene (scaled up from real ratios).
 */
function getBasePlanetScale(name: string): number {
  switch (name) {
    case "Mercury":
      return 1.4;
    case "Venus":
      return 2.5;
    case "Mars":
      return 1.8;
    case "Jupiter":
      return 5.0;
    case "Saturn":
      return 4.2;
    case "Uranus":
      return 3.2;
    case "Neptune":
      return 3.0;
    default:
      return 2.0;
  }
}
