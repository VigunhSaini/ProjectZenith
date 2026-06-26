"use client";

import { useZenithStore } from "@/store/zenith";
import { useGemini } from "@/hooks/useGemini";
import { formatDist, formatRA, formatDec } from "@/lib/coordinates";
import { motion, AnimatePresence } from "framer-motion";

export default function TelemetryPanel() {
  const { selectedObject, setSelectedObject, location, mode } = useZenithStore();
  const isScientific = mode === "scientific";

  // Fetch AI description
  const { description, loading, error } = useGemini(
    selectedObject,
    "scientific",
    location
  );

  if (!selectedObject || !isScientific) return null;

  const categoryColors: Record<string, string> = {
    iss: "#ffaa00",
    satellite: "#00e5b0",
    planet: "#ff5577",
    star: "#a8ccff",
  };

  const accentColor = categoryColors[selectedObject.category] || "#00e5b0";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "110%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "110%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed top-20 right-6 bottom-28 w-80 rounded-xl border flex flex-col pointer-events-auto z-40 select-none overflow-hidden"
        style={{
          background: "rgba(6, 13, 31, 0.92)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(0, 212, 255, 0.15)",
          borderLeft: `3px solid ${accentColor}`,
          boxShadow: "0 0 35px rgba(0, 0, 0, 0.6)",
        }}
        id="scientific-telemetry-panel"
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h2
              className="text-xs font-bold tracking-widest text-[#00e5b0]"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              RADAR TELEMETRY
            </h2>
            <span className="text-[9px] text-white/30 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              ID: {selectedObject.id.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => setSelectedObject(null)}
            className="w-6 h-6 rounded flex items-center justify-center border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors text-[10px]"
            id="close-telemetry-panel"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {/* Object title segment */}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-inter)" }}>
              {selectedObject.name}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}15`,
                fontFamily: "var(--font-mono)",
              }}
            >
              {selectedObject.category}
            </span>
          </div>

          {/* Grid telemetry data */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">AZIMUTH</span>
              <span className="text-white text-xs">{selectedObject.az.toFixed(2)}°</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">ALTITUDE</span>
              <span className="text-white text-xs">{selectedObject.alt.toFixed(2)}°</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">R.A. (RIGHT ASC.)</span>
              <span className="text-white text-xs">{formatRA(selectedObject.ra)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">DEC (DECLINATION)</span>
              <span className="text-white text-xs">{formatDec(selectedObject.dec)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">DISTANCE</span>
              <span className="text-white text-xs truncate">{formatDist(selectedObject.distanceKm)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-white/30 block mb-0.5">MAGNITUDE</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white text-xs">{selectedObject.magnitude.toFixed(2)}</span>
                {selectedObject.magnitude > 6.5 && (
                  <span
                    className="text-[8px] text-[#ffaa00] border border-[#ffaa00]/25 px-1 py-0.5 rounded font-bold tracking-tight bg-[#ffaa00]/5"
                    style={{ fontFamily: "var(--font-mono)" }}
                    title="Optical aid required to observe (visual magnitude > 6.5)"
                  >
                    🔭 OPTICAL AID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Gemini AI Context area */}
          <div className="flex flex-col border-t border-white/5 pt-4">
            <span
              className="text-[9px] uppercase tracking-wider text-[#00e5b0] mb-2 font-bold"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              System Astronomical Context
            </span>
            <div className="min-h-[72px] rounded bg-black/35 border border-white/5 p-3 leading-relaxed text-[11px] text-white/80">
              {loading ? (
                <div className="flex items-center gap-2 text-white/30" style={{ fontFamily: "var(--font-inter)" }}>
                  <span className="w-1 h-1 rounded-full bg-white/30 animate-ping" />
                  <span>Loading server telemetry analysis…</span>
                </div>
              ) : error ? (
                <span className="text-red-400" style={{ fontFamily: "var(--font-inter)" }}>
                  ⚠️ Load failed: {error}
                </span>
              ) : (
                <p style={{ fontFamily: "var(--font-inter)" }}>{description}</p>
              )}
            </div>
          </div>

          {/* Meridian Culmination Transit */}
          <div className="border-t border-white/5 pt-4 flex flex-col gap-1 text-[10px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            <span className="text-white/30">NEXT MERIDIAN TRANSIT:</span>
            <span className="text-[#ffaa00]" suppressHydrationWarning>
              {selectedObject.nextTransit
                ? new Date(selectedObject.nextTransit).toLocaleString([], {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "Transit coordinates out of local window"}
            </span>
          </div>

        </div>

        {/* Alert triggers */}
        <div className="p-4 border-t border-white/5">
          <button
            className="w-full py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-150 border"
            style={{
              fontFamily: "var(--font-orbitron)",
              borderColor: "rgba(0, 229, 176, 0.4)",
              color: "#00e5b0",
              backgroundColor: "rgba(0, 229, 176, 0.05)",
            }}
            onClick={() => alert(`Zenith crossing alarm activated for ${selectedObject.name}`)}
            id="scientific-alert-btn"
          >
            🛰️ Engage Radar Crossing Alarm
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
