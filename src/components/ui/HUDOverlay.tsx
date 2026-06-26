"use client";

import { useZenithStore } from "@/store/zenith";
import { CelestialObject } from "@/lib/celestial";
import { useState, useMemo } from "react";

interface HUDOverlayProps {
  objects: CelestialObject[];
}

export default function HUDOverlay({ objects }: HUDOverlayProps) {
  const {
    selectedObject,
    setSelectedObject,
    showGrid,
    toggleGrid,
    showConstellations,
    toggleConstellations,
  } = useZenithStore();
  const [filter, setFilter] = useState<"all" | "planet" | "satellite" | "star">("all");

  // Group and count objects for HUD stats box
  const stats = useMemo(() => {
    const counts = { planets: 0, satellites: 0, stars: 0, iss: 0 };
    objects.forEach((obj) => {
      if (obj.category === "planet") counts.planets++;
      else if (obj.category === "satellite") counts.satellites++;
      else if (obj.category === "star") counts.stars++;
      else if (obj.category === "iss") counts.iss++;
    });
    return counts;
  }, [objects]);

  // Filter objects for the sidebar list
  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      if (filter === "all") return true;
      if (filter === "satellite") return obj.category === "satellite" || obj.category === "iss";
      return obj.category === filter;
    });
  }, [objects, filter]);

  const categoryColors: Record<string, string> = {
    iss: "#ffaa00",
    satellite: "#00e5b0",
    planet: "#ff5577",
    star: "#a8ccff",
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none" id="scientific-hud-overlay">
      {/* ─── Left Sidebar: Object List & Overlay Controls ─── */}
      <div
        className="absolute left-6 top-20 bottom-28 w-80 rounded-xl border flex flex-col pointer-events-auto"
        style={{
          background: "rgba(6, 13, 31, 0.92)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(0, 212, 255, 0.15)",
          boxShadow: "0 0 30px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5">
          <h2
            className="text-xs font-bold tracking-widest text-[#00e5b0]"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            OVERHEAD SYSTEMS
          </h2>
          <p className="text-[10px] text-white/40 uppercase mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
            RADAR RADIAL ANGLE RADIAN
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex border-b border-white/5 text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
          {(["all", "planet", "satellite", "star"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="flex-1 py-2 text-center border-r last:border-r-0 border-white/5 hover:bg-white/5 transition-colors uppercase"
              style={{
                color: filter === type ? "#00e5b0" : "#7888a8",
                backgroundColor: filter === type ? "rgba(0, 229, 176, 0.05)" : "transparent",
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Scrollable Object List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pointer-events-auto" id="hud-objects-sidebar-list">
          {filteredObjects.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-[#4a5a78]" style={{ fontFamily: "var(--font-inter)" }}>
              No objects above horizon
            </div>
          ) : (
            filteredObjects.map((obj) => {
              const isSelected = selectedObject?.id === obj.id;
              const color = categoryColors[obj.category] || "#fff";
              const isDim = obj.magnitude !== undefined && obj.magnitude > 6.5;
              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObject(obj)}
                  className="p-3 rounded-lg border cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? "rgba(0, 229, 176, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    borderColor: isSelected ? "#00e5b0" : "rgba(255, 255, 255, 0.05)",
                    opacity: isDim ? 0.55 : 1.0,
                  }}
                  id={`hud-item-${obj.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 max-w-[170px] truncate">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span
                        className="text-xs font-bold text-white truncate max-w-[95px]"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {obj.name}
                      </span>
                      {isDim && (
                        <span
                          className="text-[8px] text-[#ffaa00] border border-[#ffaa00]/25 px-1 rounded flex items-center font-bold tracking-tight bg-[#ffaa00]/5 scale-90"
                          style={{ fontFamily: "var(--font-mono)" }}
                          title="Optical aid required (mag > 6.5)"
                        >
                          🔭 AID
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        color,
                        backgroundColor: `${color}15`,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {obj.category}
                    </span>
                  </div>

                  <div
                    className="flex justify-between text-[10px] text-[#7888a8]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <span>ALT: {obj.alt.toFixed(1)}°</span>
                    <span>AZ: {obj.az.toFixed(1)}°</span>
                    <span>MAG: {obj.magnitude.toFixed(1)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Controls Footer */}
        <div className="p-3 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            <span className="text-white/40">GRID BOUNDARY LAYER:</span>
            <button
              onClick={toggleGrid}
              className="px-2 py-0.5 rounded border transition-colors"
              style={{
                borderColor: showGrid ? "#00e5b0" : "rgba(255,255,255,0.1)",
                color: showGrid ? "#00e5b0" : "rgba(255,255,255,0.3)",
              }}
            >
              {showGrid ? "ACTIVE" : "STBY"}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            <span className="text-white/40">CONSTELLATIONS:</span>
            <button
              onClick={toggleConstellations}
              className="px-2 py-0.5 rounded border transition-colors"
              style={{
                borderColor: showConstellations ? "#00e5b0" : "rgba(255,255,255,0.1)",
                color: showConstellations ? "#00e5b0" : "rgba(255,255,255,0.3)",
              }}
            >
              {showConstellations ? "ACTIVE" : "STBY"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Top Left: Mission HUD Stats Panel ─── */}
      <div
        className="absolute left-6 top-20 mt-16 ml-80 w-64 p-3 rounded-lg border hidden lg:block"
        style={{
          background: "rgba(6, 13, 31, 0.85)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(0, 212, 255, 0.12)",
        }}
      >
        <div className="flex flex-col gap-2 text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="text-[#00e5b0]">🛰️ LEO PROPAGATED SATELLITES</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <div className="text-white/40">PLANETS</div>
              <div className="text-sm font-bold text-white mt-0.5">{stats.planets}</div>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <div className="text-white/40">SATELLITES</div>
              <div className="text-sm font-bold text-white mt-0.5">{stats.satellites + stats.iss}</div>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <div className="text-white/40">STARS</div>
              <div className="text-sm font-bold text-white mt-0.5">{stats.stars}</div>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <div className="text-white/40">TOTAL DETECTED</div>
              <div className="text-sm font-bold text-[#00e5b0] mt-0.5">
                {stats.planets + stats.satellites + stats.stars + stats.iss}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
