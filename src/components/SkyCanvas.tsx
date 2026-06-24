"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { CelestialObject } from "@/lib/celestial";

import StarField from "./StarField";
import Constellations from "./Constellations";
import Planets from "./Planets";
import Satellites from "./Satellites";
import ISS from "./ISS";
import ZenithMarker from "./ZenithMarker";

interface SkyCanvasProps {
  objects: CelestialObject[];
}

export default function SkyCanvas({ objects }: SkyCanvasProps) {
  const { mode, showGrid, selectObject } = useStore();

  // Filter central data objects by category for child components
  const planets = objects.filter((o) => o.category === "planet");
  const satellites = objects.filter((o) => o.category === "satellite");
  const issObject = objects.find((o) => o.category === "iss") || null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at center, #0a0e17 0%, #030508 100%)",
        overflow: "hidden",
      }}
      id="sky-canvas-container"
    >
      <Canvas
        shadows
        camera={{
          fov: 65,
          near: 0.1,
          far: 1000,
          position: [0, 2, 5], // Positioned slightly up/back to pivot from inside
        }}
        onPointerMissed={() => {
          // Deselect when clicking empty sky
          selectObject(null);
        }}
      >
        {/* Lights */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />

        {/* 3D Scene Components */}
        <StarField />
        <Constellations />
        <Planets planets={planets} />
        <Satellites satellites={satellites} />
        <ISS issObject={issObject} />
        <ZenithMarker />

        {/* Compass & Horizon HUD Grid */}
        <HorizonHUD isVisible={mode === "scientific" || showGrid} />

        {/* Controls - Pivot camera around origin, locked to upper hemisphere */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1}
          maxDistance={50}
          minPolarAngle={0}                // Look straight up (Zenith)
          maxPolarAngle={Math.PI / 2 - 0.02} // Look down to just above horizon
          target={[0, 0, 0]}               // Look-around pivot center
        />
      </Canvas>

      {/* Crosshair target overlay */}
      {mode === "scientific" && (
        <div className="hud-crosshair-overlay">
          <div className="hud-ring" />
          <div className="hud-center-dot" />
        </div>
      )}
    </div>
  );
}

interface HorizonHUDProps {
  isVisible: boolean;
}

/**
 * Renders cardinal direction indicators (N, E, S, W) and altitude grid lines
 * to build the mission-control HUD look for Scientific Mode.
 */
function HorizonHUD({ isVisible }: HorizonHUDProps) {
  if (!isVisible) return null;

  // Generate elevation concentric rings
  const ringAngles = [30, 60]; // 30 and 60 degrees altitude rings
  const radius = 300;

  return (
    <group>
      {/* 1. Compass cardinal labels on the horizon plane */}
      <CompassLabel label="N" position={[0, 1.2, -50]} color="#00FF66" />
      <CompassLabel label="S" position={[0, 1.2, 50]} color="#00FF66" />
      <CompassLabel label="E" position={[50, 1.2, 0]} color="#00FF66" />
      <CompassLabel label="W" position={[-50, 1.2, 0]} color="#00FF66" />

      {/* 2. Horizon reference circle */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[120, 122, 64]} />
        <meshBasicMaterial
          color="#00FF66"
          side={THREE.DoubleSide}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* 3. Concentric Altitude Rings (Dome grids) */}
      {ringAngles.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const ringRadius = radius * Math.cos(rad);
        const ringHeight = radius * Math.sin(rad);

        return (
          <mesh
            key={angle}
            position={[0, ringHeight, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[ringRadius - 0.5, ringRadius + 0.5, 64]} />
            <meshBasicMaterial
              color="#00FF66"
              side={THREE.DoubleSide}
              transparent
              opacity={0.1}
            />
          </mesh>
        );
      })}

      {/* 4. Azimuth Meridian Lines (Dome vertical segments) */}
      {[0, 45, 90, 135].map((angle) => {
        return <MeridianLine key={angle} angle={angle} radius={radius} color="#00FF66" />;
      })}
    </group>
  );
}

interface MeridianLineProps {
  angle: number;
  radius: number;
  color: string;
}

function MeridianLine({ angle, radius, color }: MeridianLineProps) {
  const geometry = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (!geometry.current) return;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.sin(rad);
    const z = radius * Math.cos(rad);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-x, 0, -z),
      new THREE.Vector3(0, radius, 0),
      new THREE.Vector3(x, 0, z),
    ]);

    const points = curve.getPoints(32);
    geometry.current.setFromPoints(points);
  }, [angle, radius]);

  return (
    <line>
      <bufferGeometry ref={geometry} />
      <lineBasicMaterial color={color} transparent opacity={0.08} />
    </line>
  );
}

interface CompassLabelProps {
  label: string;
  position: [number, number, number];
  color: string;
}

/**
 * Text billboard labels for N, E, S, W directions on the horizon plane.
 * Generates dynamic CanvasTexture for maximum speed and zero extra libraries.
 */
function CompassLabel({ label, position, color }: CompassLabelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Nice high-tech HUD styling
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(64, 64, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "Bold 44px monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 64, 64);
    }
    setTexture(new THREE.CanvasTexture(canvas));
  }, [label, color]);

  useFrame(() => {
    if (meshRef.current) {
      // Look at camera but stay vertical
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.8}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

