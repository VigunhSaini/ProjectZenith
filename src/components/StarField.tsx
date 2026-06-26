"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useZenithStore } from "@/store/zenith";
import { getLST } from "@/lib/astronomy";
import { raDecToXYZ } from "@/lib/coordinates";

interface StarData {
  id: number;
  name: string;
  ra: number;
  dec: number;
  mag: number;
  color: string;
  distLy: number;
}

const STAR_SPHERE_RADIUS = 400; // Radius of the celestial dome

export default function StarField() {
  const { location, currentTime } = useZenithStore();
  const [stars, setStars] = useState<StarData[]>([]);
  
  const tiltedGroupRef = useRef<THREE.Group>(null);
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Load star data
  useEffect(() => {
    fetch("/data/hyg_stars.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load star data");
        return res.json();
      })
      .then((data: StarData[]) => {
        setStars(data);
      })
      .catch((err) => console.error("Error loading star field:", err));
  }, []);

  // Construct geometry when star data changes
  useEffect(() => {
    if (stars.length === 0 || !geometryRef.current) return;

    // Filter stars for mobile/performance if needed
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const filteredStars = isMobile ? stars.filter((s) => s.mag < 5.0) : stars;

    const count = filteredStars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const star = filteredStars[i];

      // 1. Calculate static 3D positions in equatorial coordinates
      const [x, y, z] = raDecToXYZ(star.ra, star.dec, STAR_SPHERE_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 2. Set star colors based on spectral class color in dataset
      tempColor.set(star.color || "#FFFFFF");
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // 3. Set magnitude-based point sizes
      // Brighter stars (lower magnitude) get larger sizes
      // Visual scale: mag 0 -> size 4.0, mag 6 -> size 0.8
      const rawSize = Math.max(0.5, 4.5 - star.mag);
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
    // At lat=90 (North Pole), NCP is at zenith. Tilt is 0.
    // At lat=0 (Equator), NCP is on horizon. Tilt is 90 deg.
    const tiltRad = ((90 - lat) * Math.PI) / 180;
    tiltedGroupRef.current.rotation.x = tiltRad;

    // 2. Rotate sphere about the polar axis by LST
    // We rotate in the negative direction because the Earth's rotation
    // causes the sky to rotate westward (east to west)
    const lstHours = getLST(new Date(currentTime), lon);
    const lstRad = -((lstHours * 15 * Math.PI) / 180);
    rotatingGroupRef.current.rotation.y = lstRad;
  });

  if (stars.length === 0) return null;

  return (
    <group ref={tiltedGroupRef}>
      <group ref={rotatingGroupRef}>
        <points>
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
