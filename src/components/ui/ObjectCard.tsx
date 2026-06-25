"use client";

import { useZenithStore } from "@/store/zenith";
import { useGemini } from "@/hooks/useGemini";
import { formatDist } from "@/lib/coordinates";
import { motion, AnimatePresence } from "framer-motion";

export default function ObjectCard() {
  const { selectedObject, setSelectedObject, location, mode } = useZenithStore();
  const isImmersive = mode === "immersive";

  // Fetch AI description
  const { description, loading, error } = useGemini(
    selectedObject,
    "immersive",
    location
  );

  if (!selectedObject || !isImmersive) return null;

  const categoryColors: Record<string, string> = {
    iss: "#ffaa00",
    satellite: "#00e5b0",
    planet: "#ff5577",
    star: "#a8ccff",
  };

  const color = categoryColors[selectedObject.category] || "#4078ff";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "120%", x: "-50%", opacity: 0 }}
        animate={{ y: 0, x: "-50%", opacity: 1 }}
        exit={{ y: "120%", x: "-50%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed bottom-[110px] left-1/2 w-[min(540px,calc(100vw-32px))] rounded-2xl border p-6 pointer-events-auto z-40 select-none overflow-hidden"
        style={{
          background: "rgba(3, 5, 15, 0.88)",
          backdropFilter: "blur(28px)",
          borderColor: `${color}30`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 30px ${color}10`,
        }}
        id="immersive-object-card"
      >
        {/* Subtle ambient backglow inside the card */}
        <div
          className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-20 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
            <h2
              className="text-lg font-bold tracking-wider text-white"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {selectedObject.name}
            </h2>
            <span
              className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}08`,
                fontFamily: "var(--font-mono)",
              }}
            >
              {selectedObject.category}
            </span>
          </div>

          <button
            onClick={() => setSelectedObject(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-150 text-xs"
            id="close-immersive-card"
          >
            ✕
          </button>
        </div>

        {/* AI Educational description */}
        <div className="mb-6 min-h-[56px] flex flex-col justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-white/40" style={{ fontFamily: "var(--font-inter)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
              <span>Consulting telemetry archive…</span>
            </div>
          ) : error ? (
            <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-inter)" }}>
              ⚠️ Could not retrieve explanation: {error}
            </p>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-sm leading-relaxed text-white/80 italic font-light font-serif"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              &ldquo;{description}&rdquo;
            </motion.p>
          )}
        </div>

        {/* Numeric Telemetry Grid */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4 mb-5">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold" style={{ fontFamily: "var(--font-inter)" }}>
              Distance
            </span>
            <span className="text-sm font-semibold text-white mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {formatDist(selectedObject.distanceKm)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold" style={{ fontFamily: "var(--font-inter)" }}>
              Elevation
            </span>
            <span className="text-sm font-semibold text-white mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {selectedObject.alt.toFixed(1)}°
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold" style={{ fontFamily: "var(--font-inter)" }}>
              Next Zenith
            </span>
            <span
              className="text-sm font-semibold mt-1 truncate"
              style={{
                fontFamily: "var(--font-mono)",
                color: selectedObject.alt > 80 ? "#00e5b0" : "#ffaa00",
              }}
            >
              {selectedObject.alt > 80 ? "Overhead" : selectedObject.nextTransit ? "Transit pending" : "Unavailable"}
            </span>
          </div>
        </div>

        {/* Call to Action Button */}
        <button
          className="w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border"
          style={{
            fontFamily: "var(--font-inter)",
            borderColor: `${color}60`,
            color: color,
            backgroundColor: `${color}05`,
            boxShadow: `0 0 10px ${color}05`,
          }}
          onClick={() => alert(`Zenith notification set for ${selectedObject.name}!`)}
          id="immersive-notify-btn"
        >
          🔔 Notify me at Zenith
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
