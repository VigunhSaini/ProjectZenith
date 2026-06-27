"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useZenith } from "@/hooks/useZenith";
import { useZenithStore } from "@/store/zenith";
import Topbar from "@/components/ui/Topbar";
import Timeline from "@/components/ui/Timeline";
import HUDOverlay from "@/components/ui/HUDOverlay";
import ObjectCard from "@/components/ui/ObjectCard";
import TelemetryPanel from "@/components/ui/TelemetryPanel";
import SkyprintModal from "@/components/ui/SkyprintModal";
import dynamic from "next/dynamic";
import OnboardingTutorial from "@/components/ui/OnboardingTutorial";
import { motion, AnimatePresence } from "framer-motion";

const SkyCanvas = dynamic(() => import("@/components/SkyCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#010208] flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{ border: "2px solid rgba(0,229,176,0.15)", borderTopColor: "#00e5b0" }}
      />
    </div>
  ),
});

function SkyContent() {
  const params = useSearchParams();
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lon = params.get("lon") ? parseFloat(params.get("lon")!) : null;
  const name = params.get("name") ?? "Unknown Location";

  const {
    mode,
    setLocation,
  } = useZenithStore();

  // Update observer location in store on mount
  useEffect(() => {
    if (lat !== null && lon !== null) {
      setLocation({ lat, lon, name });
    }
  }, [lat, lon, name, setLocation]);

  // Load objects using Member A's hook
  const { objects, loading, error } = useZenith(lat, lon);

  const isScientific = mode === "scientific";

  return (
    <main
      className="relative w-screen h-screen bg-[#010208] text-white overflow-hidden"
      id="sky-view"
    >
      {/* ─── 3D Sky Dome View ─── */}
      <SkyCanvas objects={objects} />

      {/* ─── Overlay UI Shell ─── */}
      <Topbar totalObjects={objects.length} />

      {/* Full-screen Loading Overlay */}
      <AnimatePresence>
        {loading && objects.length === 0 && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-[#010208]"
          >
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: "3px solid rgba(0, 229, 176, 0.15)", borderTopColor: "#00e5b0" }}
            />
            <p className="text-sm font-semibold tracking-widest text-[#00e5b0]/80 uppercase" style={{ fontFamily: "var(--font-mono)" }}>
              Syncing local sky alignments…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 border rounded-lg flex items-center gap-2 z-50 text-xs font-semibold"
          style={{
            backgroundColor: "rgba(255, 85, 119, 0.08)",
            borderColor: "rgba(255, 85, 119, 0.3)",
            color: "#ff5577",
            fontFamily: "var(--font-inter)",
          }}
          id="sky-error-banner"
        >
          ⚠️ {error}
        </div>
      )}

      {isScientific && <HUDOverlay objects={objects} />}
      <ObjectCard />
      <TelemetryPanel />
      <Timeline />
      <SkyprintModal objects={objects} />
      <OnboardingTutorial
        currentScreen="sky"
        isLoaded={!loading}
        objects={objects}
      />
    </main>
  );
}

export default function SkyPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#010208] flex flex-col items-center justify-center gap-4 text-white/30 z-[200]">
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.6)" }}
        />
        <p className="text-xs uppercase font-bold tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
          Loading sky console…
        </p>
      </div>
    }>
      <SkyContent />
    </Suspense>
  );
}

