"use client";

import { useZenithStore } from "@/store/zenith";
import { motion } from "framer-motion";

export default function ModeToggle() {
  const { mode, setMode } = useZenithStore();
  const isImmersive = mode === "immersive";

  return (
    <div className="flex items-center gap-3 select-none" id="mode-toggle-switch">
      <span
        onClick={() => setMode("immersive")}
        className="hidden sm:inline text-xs font-semibold tracking-widest cursor-pointer transition-colors duration-200"
        style={{
          fontFamily: "var(--font-inter)",
          color: isImmersive ? "#4078ff" : "#4a5a78",
          textShadow: isImmersive ? "0 0 8px rgba(64, 120, 255, 0.4)" : "none",
        }}
      >
        IMMERSIVE
      </span>

      {/* Recessed physical switch track */}
      <div
        onClick={() => setMode(isImmersive ? "scientific" : "immersive")}
        className="relative w-[60px] h-[30px] rounded-[15px] cursor-pointer border border-white/5 transition-all duration-300"
        style={{
          background: "linear-gradient(180deg, #02030a, #0c1628)",
          boxShadow: `
            inset 0 2px 5px rgba(0, 0, 0, 0.8),
            inset 0 -1px 2px rgba(255, 255, 255, 0.04),
            0 0 12px ${isImmersive ? "rgba(64,120,255,0.2)" : "rgba(0,229,176,0.2)"}
          `,
        }}
      >
        {/* Toggle knob */}
        <motion.div
          animate={{ x: isImmersive ? 4 : 30 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className="absolute top-[2px] w-[24px] h-[24px] rounded-full"
          style={{
            background: isImmersive
              ? "linear-gradient(145deg, #6090ff, #3060cc)"
              : "linear-gradient(145deg, #00ffcc, #00a880)",
            boxShadow: `
              0 2px 6px rgba(0, 0, 0, 0.6),
              0 0 10px ${isImmersive ? "rgba(64, 120, 255, 0.6)" : "rgba(0, 229, 176, 0.6)"},
              inset 0 1px 2px rgba(255, 255, 255, 0.4)
            `,
          }}
        >
          {/* Shine highlight */}
          <div className="absolute top-[3px] left-[4px] w-[9px] h-[5px] rounded-[3px] bg-white/40" />
        </motion.div>
      </div>

      <span
        onClick={() => setMode("scientific")}
        className="hidden sm:inline text-xs font-semibold tracking-widest cursor-pointer transition-colors duration-200"
        style={{
          fontFamily: "var(--font-inter)",
          color: !isImmersive ? "#00e5b0" : "#4a5a78",
          textShadow: !isImmersive ? "0 0 8px rgba(0, 229, 176, 0.4)" : "none",
        }}
      >
        SCIENTIFIC
      </span>
    </div>
  );
}
