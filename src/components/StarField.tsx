"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useZenithStore } from "@/store/zenith";
import { getLST } from "@/lib/astronomy";
import { raDecToXYZ } from "@/lib/coordinates";
import { CelestialObject } from "@/lib/celestial";

interface StarFieldProps {
  stars: CelestialObject[];
}

const STAR_SPHERE_RADIUS = 400; // Radius of the celestial dome

export default function StarField({ stars }: StarFieldProps) {
  const { location, currentTime, setSelectedObject } = useZenithStore();

  const tiltedGroupRef = useRef<THREE.Group>(null);
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Construct geometry when star data changes
  useEffect(() => {
    if (stars.length === 0 || !geometryRef.current) return;

    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const star = stars[i];

      // 1. Calculate static 3D positions in equatorial coordinates (using RA/Dec)
      const [x, y, z] = raDecToXYZ(star.ra, star.dec, STAR_SPHERE_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 2. Set star colors
      tempColor.set(star.color || "#FFFFFF");
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // 3. Set magnitude-based point sizes (mag 0 -> 4.5, mag 6 -> 0.8)
      const rawSize = Math.max(0.5, 4.5 - star.magnitude);
      sizes[i] = rawSize;
    }

    const geometry = geometryRef.current;
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
  }, [stars]);

  // Rotate the star sphere in useFrame based on observer lat and Local Sidereal Time
  useFrame(() => {
    if (!tiltedGroupRef.current || !rotatingGroupRef.current || !location) return;

    const lat = location.lat;
    const lon = location.lon;

    // 1. Tilt celestial sphere polar axis by (90 - Latitude)
    const tiltRad = ((90 - lat) * Math.PI) / 180;
    tiltedGroupRef.current.rotation.x = tiltRad;

    // 2. Rotate sphere about the polar axis by LST
    const lstHours = getLST(new Date(currentTime), lon);
    const lstRad = -((lstHours * 15 * Math.PI) / 180);
    rotatingGroupRef.current.rotation.y = lstRad;
  });

  if (stars.length === 0) return null;

  return (
    <group ref={tiltedGroupRef}>
      <group ref={rotatingGroupRef}>
        <points
          onClick={(e) => {
            e.stopPropagation();
            if (e.index !== undefined) {
              const clickedStar = stars[e.index];
              if (clickedStar) {
                setSelectedObject(clickedStar);
              }
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "default";
          }}
        >
          <bufferGeometry ref={geometryRef} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexShader={`
              attribute float aSize;
              attribute vec3 aColor;
              varying vec3 vColor;
              void main() {
                vColor = aColor;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                // Size attenuation with distance
                gl_PointSize = aSize * (400.0 / -mvPosition.z);
              }
            `}
            fragmentShader={`
              varying vec3 vColor;
              void main() {
                // Soft glowing star particle
                float dist = distance(gl_PointCoord, vec2(0.5));
                if (dist > 0.5) discard;
                float intensity = smoothstep(0.5, 0.0, dist);
                // Extra core brightness
                intensity += pow(smoothstep(0.5, 0.0, dist * 2.0), 3.0) * 0.5;
                gl_FragColor = vec4(vColor, intensity);
              }
            `}
          />
        </points>
      </group>
    </group>
  );
}
