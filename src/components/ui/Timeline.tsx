"use client";

import { useZenithStore } from "@/store/zenith";
import { useState, useMemo, useEffect } from "react";

export default function Timeline() {
  const { mode, setCurrentTime } = useZenithStore();
  const isScientific = mode === "scientific";
  
  // Track offset in seconds (value of range input)
  const [offset, setOffset] = useState(0);

  // Sync state back to Zustand store on slider movement
  const handleSliderChange = (val: number) => {
    setOffset(val);
    setCurrentTime(Date.now() + val * 1000);
  };

  // Reset to live when clicking "LIVE"
  const handleResetToLive = () => {
    setOffset(0);
    setCurrentTime(Date.now());
  };

  // Format offset for display
  const offsetString = useMemo(() => {
    if (offset === 0) return "LIVE";
    const prefix = offset > 0 ? "+" : "-";
    const absOffset = Math.abs(offset);
    const h = Math.floor(absOffset / 3600);
    const m = Math.floor((absOffset % 3600) / 60);
    const s = absOffset % 60;
    return `${prefix}${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }, [offset]);

  // Keep date synced in background if we are live (offset === 0)
  useEffect(() => {
    if (offset !== 0) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [offset, setCurrentTime]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(650px,calc(100vw-32px))] p-4 rounded-xl border z-50 transition-all duration-300 select-none"
      style={{
        background: isScientific ? "rgba(6, 13, 31, 0.92)" : "rgba(3, 5, 15, 0.65)",
        backdropFilter: "blur(20px)",
        borderColor: isScientific ? "rgba(0, 212, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
        boxShadow: isScientific ? "0 4px 30px rgba(0, 212, 255, 0.08)" : "0 4px 30px rgba(0, 0, 0, 0.5)",
      }}
      id="zenith-timeline"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase font-bold tracking-widest text-[#7888a8]"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          ⏱️ Temporal Scrubber
        </span>

        {/* Status display */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded"
            style={{
              fontFamily: "var(--font-mono)",
              color: offset === 0 ? (isScientific ? "#00e5b0" : "#4078ff") : "#ffaa00",
              backgroundColor: offset === 0 
                ? (isScientific ? "rgba(0, 229, 176, 0.1)" : "rgba(64, 120, 255, 0.1)") 
                : "rgba(255, 170, 0, 0.1)",
            }}
          >
            {offsetString}
          </span>
          {offset !== 0 && (
            <button
              onClick={handleResetToLive}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-all duration-150"
              style={{
                fontFamily: "var(--font-inter)",
                borderColor: isScientific ? "rgba(0, 229, 176, 0.3)" : "rgba(64, 120, 255, 0.3)",
                color: isScientific ? "#00e5b0" : "#4078ff",
                backgroundColor: "transparent",
              }}
            >
              Reset to Live
            </button>
          )}
        </div>
      </div>

      {/* Slider Input */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-white/30 font-bold" style={{ fontFamily: "var(--font-mono)" }}>-24H</span>
        <input
          type="range"
          min={-86400}
          max={86400}
          value={offset}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4078ff] outline-none"
          style={{
            accentColor: isScientific ? "#00e5b0" : "#4078ff",
          }}
          id="timeline-slider-input"
        />
        <span className="text-[10px] text-white/30 font-bold" style={{ fontFamily: "var(--font-mono)" }}>+24H</span>
      </div>

      {/* Tick Marks */}
      <div className="flex justify-between px-7 mt-1.5 text-[9px] text-white/20 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
        <span>PAST</span>
        <span>NOW</span>
        <span>FUTURE</span>
      </div>
    </div>
  );
}
