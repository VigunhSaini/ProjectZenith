"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useZenith } from "@/hooks/useZenith";
import SkyCanvas from "./SkyCanvas";
import LocationSearch from "./LocationSearch";
import GlobeView from "./GlobeView";
import ISSMarker from "./ISSMarker";

export default function SkyViewDemo() {
  const { location, setLocation, currentTime, setCurrentTime, mode, setMode, selectedObject } = useStore();

  // Master data hook that fetches stars, planets, satellites, and ISS visible at zenith
  const { objects, loading, error } = useZenith(
    location ? location.lat : null,
    location ? location.lon : null
  );

  // Set default location to Tokyo on mount if none selected
  useEffect(() => {
    if (!location) {
      setLocation({
        lat: 35.6762,
        lon: 139.6503,
        name: "Tokyo",
      });
    }
  }, [location, setLocation]);

  // Tick the simulation clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      // If we are not scrubbing, advance time
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [setCurrentTime]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", color: "#fff", fontFamily: "sans-serif" }}>
      {/* 1. Main 3D Sky Dome View */}
      <SkyCanvas objects={objects} />

      {/* 2. HUD Overlay Control Panel */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          background: "rgba(10, 15, 28, 0.75)",
          backdropFilter: "blur(8px)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          maxWidth: "320px",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", color: "#00FF66" }}>🌌 Project Zenith</h2>
        <p style={{ margin: "0 0 15px 0", fontSize: "0.85rem", color: "#aaa" }}>
          Looking up at the sky dome from <b>{location?.name || "Selecting..."}</b>
        </p>

        {/* Mode Toggle Switch */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <span style={{ fontSize: "0.9rem" }}>Mode:</span>
          <button
            onClick={() => setMode(mode === "immersive" ? "scientific" : "immersive")}
            style={{
              background: mode === "scientific" ? "#00FF66" : "#444",
              color: mode === "scientific" ? "#000" : "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            {mode}
          </button>
        </div>

        {/* Stats / Selected Object info */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            padding: "10px",
            borderRadius: "6px",
            fontSize: "0.8rem",
          }}
        >
          {selectedObject ? (
            <div>
              <div style={{ fontWeight: "bold", color: "#00FFFF", marginBottom: "5px" }}>
                🎯 Selected: {selectedObject.name}
              </div>
              <div>Type: {selectedObject.category.toUpperCase()}</div>
              <div>Alt: {selectedObject.alt.toFixed(1)}°</div>
              <div>Az: {selectedObject.az.toFixed(1)}°</div>
              <div>Dist: {(selectedObject.distanceKm / 1000).toFixed(0)}k km</div>
            </div>
          ) : (
            <div style={{ color: "#888", textAlign: "center" }}>Click any star, planet, or satellite to select</div>
          )}
        </div>
      </div>

      {/* 3. Location Picker Drawer */}
      <div style={{ position: "absolute", bottom: "20px", left: "20px", zIndex: 10 }}>
        <LocationSearch
          onLocationSelect={(lat: number, lon: number, name: string) => {
            setLocation({ lat, lon, name });
          }}
        />
      </div>

      {/* 4. Loading indicator */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "1.5rem",
          }}
        >
          🛰 Loading Celestial Data...
        </div>
      )}
    </div>
  );
}
