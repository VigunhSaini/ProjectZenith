"use client";

import { useZenithStore } from "@/store/zenith";
import ModeToggle from "./ModeToggle";
import Link from "next/link";
import { useMemo } from "react";
import { getLST, toUTCDate } from "@/lib/astronomy";
import tzlookup from "tz-lookup";

interface TopbarProps {
  totalObjects: number;
}

// Format high-precision Local Sidereal Time (LST) from astronomy.ts
function getFormattedLST(date: Date, lon: number): string {
  const lst = getLST(date, lon);

  const h = Math.floor(lst);
  const m = Math.floor((lst - h) * 60);
  const s = Math.floor(((lst - h) * 60 - m) * 60);

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Topbar({ totalObjects }: TopbarProps) {
  const { mode, location, setShowSkyprint, currentTime: currentTimeMs } = useZenithStore();
  const isScientific = mode === "scientific";

  // Convert the numeric store timestamp to a Date once per change (stable reference)
  const activeTime = useMemo(() => new Date(currentTimeMs), [currentTimeMs]);

  const lstTime = useMemo(() => {
    if (!location) return "00:00:00";
    return getFormattedLST(activeTime, location.lon);
  }, [activeTime, location]);

  const formattedTime = useMemo(() => {
    const timezone = location
      ? tzlookup(location.lat, location.lon)
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    return activeTime.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [activeTime, location]);

  const formattedDate = useMemo(() => {
    const timezone = location
      ? tzlookup(location.lat, location.lon)
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    return activeTime.toLocaleDateString("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, [activeTime, location]);

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 transition-all duration-300 select-none border-b"
      style={{
        background: isScientific ? "rgba(6, 13, 31, 0.92)" : "rgba(3, 5, 15, 0.5)",
        backdropFilter: "blur(20px)",
        borderColor: isScientific ? "rgba(0, 212, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
      }}
      id="zenith-topbar"
    >
      {/* Left: Navigation and Location Info */}
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border"
          style={{
            fontFamily: "var(--font-inter)",
            color: isScientific ? "#00e5b0" : "#4078ff",
            backgroundColor: isScientific ? "rgba(0, 229, 176, 0.04)" : "rgba(64, 120, 255, 0.04)",
            borderColor: isScientific ? "rgba(0, 229, 176, 0.2)" : "rgba(64, 120, 255, 0.2)",
          }}
          id="back-to-globe"
        >
          <span className="text-sm">←</span> Globe
        </Link>

        <div className="h-6 w-[1px] bg-white/10" />

        <div className="flex flex-col">
          <span
            className="text-sm font-semibold tracking-wide text-white"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            📍 {location?.name || "Unknown Location"}
          </span>
          {location && (
            <span
              className="text-[10px] uppercase tracking-wider opacity-60"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              LAT: {location.lat.toFixed(4)}° / LON: {location.lon.toFixed(4)}°
            </span>
          )}
        </div>
      </div>

      {/* Center: Mission Control Telemetry (Scientific Mode only) */}
      {isScientific && (
        <div
          className="hidden md:flex items-center gap-6 px-5 py-1.5 rounded-full bg-black/40 border border-white/5"
          style={{ fontFamily: "var(--font-mono)" }}
          id="scientific-telemetry-header"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5b0] animate-pulse" />
            <span className="text-[11px] text-white/50">RADAR:</span>
            <span className="text-[11px] font-bold text-[#00e5b0]">{totalObjects} SKY OBJECTS</span>
          </div>
          <div className="w-[1px] h-3 bg-white/15" />
          <div className="text-[11px] text-white/50">
            LST: <span className="text-white font-bold" suppressHydrationWarning>{lstTime}</span>
          </div>
          <div className="w-[1px] h-3 bg-white/15" />
          <div className="text-[11px] text-white/50">
            J2000: <span className="text-white font-bold" suppressHydrationWarning>{(2440587.5 + toUTCDate(activeTime).getTime() / 86400000).toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Right: Toggle Switch and Download */}
      <div className="flex items-center gap-6">
        {/* Time and Date display */}
        <div className="hidden sm:flex flex-col text-right" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="text-sm font-semibold text-white tracking-wide" suppressHydrationWarning>{formattedTime}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest" suppressHydrationWarning>{formattedDate}</span>
        </div>

        <ModeToggle />

        <button
          onClick={() => setShowSkyprint(true)}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200"
          style={{
            fontFamily: "var(--font-inter)",
            background: isScientific
              ? "linear-gradient(135deg, #00ffcc 0%, #00a880 100%)"
              : "linear-gradient(135deg, #4078ff 0%, #7c55f0 100%)",
            color: "#010208",
            boxShadow: isScientific
              ? "0 0 15px rgba(0, 229, 176, 0.4)"
              : "0 0 15px rgba(64, 120, 255, 0.4)",
          }}
          id="skyprint-trigger-btn"
        >
          📷 Save Sky
        </button>
      </div>
    </header>
  );
}
