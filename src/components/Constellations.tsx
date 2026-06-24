"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";
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

interface ConstellationDef {
  name: string;
  connections: Array<[number, number]>;
}

const STAR_SPHERE_RADIUS = 398; // Slightly smaller than stars so lines render underneath them cleanly

export default function Constellations() {
  const { location, currentTime, mode } = useStore();
  const [constellations, setConstellations] = useState<ConstellationDef[]>([]);
  const [stars, setStars] = useState<Record<number, StarData>>({});

  const tiltedGroupRef = useRef<THREE.Group>(null);
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Load star data and constellation connections
  useEffect(() => {
    // 1. Fetch stars list to build lookup mapping
    fetch("/data/hyg_stars.json")
      .then((res) => res.json())
      .then((data: StarData[]) => {
        const starMap: Record<number, StarData> = {};
        data.forEach((s) => {
          starMap[s.id] = s;
        });
        setStars(starMap);
      })
      .catch((err) => console.error("Error loading stars for constellations:", err));

    // 2. Fetch constellation lines definitions
    fetch("/data/constellations.json")
      .then((res) => res.json())
      .then((data: ConstellationDef[]) => {
        setConstellations(data);
      })
      .catch((err) => console.error("Error loading constellations JSON:", err));
  }, []);

  // Update line geometry when datasets are available
  useEffect(() => {
    if (constellations.length === 0 || Object.keys(stars).length === 0 || !geometryRef.current) return;

    const linePoints: number[] = [];

    constellations.forEach((constellation) => {
      constellation.connections.forEach(([id1, id2]) => {
        const star1 = stars[id1];
        const star2 = stars[id2];

        if (star1 && star2) {
          // Calculate 3D position of both stars
          const [x1, y1, z1] = raDecToXYZ(star1.ra, star1.dec, STAR_SPHERE_RADIUS);
          const [x2, y2, z2] = raDecToXYZ(star2.ra, star2.dec, STAR_SPHERE_RADIUS);

          linePoints.push(x1, y1, z1);
          linePoints.push(x2, y2, z2);
        }
      });
    });

    const positions = new Float32Array(linePoints);
    const geometry = geometryRef.current;
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
  }, [constellations, stars]);

  // Rotate in sync with the stars
  useFrame(() => {
    if (!tiltedGroupRef.current || !rotatingGroupRef.current || !location) return;

    const lat = location.lat;
    const lon = location.lon;

    // Tilt celestial sphere by observer latitude
    const tiltRad = ((90 - lat) * Math.PI) / 180;
    tiltedGroupRef.current.rotation.x = tiltRad;

    // Rotate about polar axis by Sidereal Time
    const lstHours = getLST(currentTime, lon);
    const lstRad = -((lstHours * 15 * Math.PI) / 180);
    rotatingGroupRef.current.rotation.y = lstRad;
  });

  if (constellations.length === 0 || Object.keys(stars).length === 0) return null;

  // Visual configuration based on Mode:
  // Immersive: thin, warm, very faint lines
  // Scientific: sharp cyan/teal blueprint styling
  const lineColor = mode === "immersive" ? "#ffeedd" : "#00FFFF";
  const opacity = mode === "immersive" ? 0.08 : 0.3;

  return (
    <group ref={tiltedGroupRef}>
      <group ref={rotatingGroupRef}>
        <lineSegments>
          <bufferGeometry ref={geometryRef} />
          <lineBasicMaterial
            color={lineColor}
            transparent
            opacity={opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>
    </group>
  );
}
