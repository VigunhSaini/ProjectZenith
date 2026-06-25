"use client";

import { useEffect, Suspense, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useZenith } from "@/hooks/useZenith";
import { useZenithStore } from "@/store/zenith";
import Topbar from "@/components/ui/Topbar";
import Timeline from "@/components/ui/Timeline";
import HUDOverlay from "@/components/ui/HUDOverlay";
import ObjectCard from "@/components/ui/ObjectCard";
import TelemetryPanel from "@/components/ui/TelemetryPanel";
import SkyprintModal from "@/components/ui/SkyprintModal";

const categoryColors: Record<string, string> = {
  iss: "#ffaa00",
  satellite: "#00e5b0",
  planet: "#ff5577",
  star: "#a8ccff",
};

function SkyContent() {
  const params = useSearchParams();
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lon = params.get("lon") ? parseFloat(params.get("lon")!) : null;
  const name = params.get("name") ?? "Unknown Location";

  const {
    mode,
    selectedObject,
    setSelectedObject,
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

  // ── Pinch-to-zoom state ──────────────────────────────────────────────────
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Mouse drag to pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [scale]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Scroll wheel to zoom
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.91;
    setScale((prev) => Math.max(0.5, Math.min(4, prev * delta)));
  }, []);

  // Touch handlers for panning & zooming
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      if (scale <= 1) return;
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [scale]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastPinchDist.current;
      setScale((prev) => Math.max(0.5, Math.min(4, prev * delta)));
      lastPinchDist.current = dist;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onWheel, onTouchStart, onTouchMove, onTouchEnd]);

  // Double-tap / double-click to reset zoom
  const onDoubleClick = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Projection math for canvas overlay
  const projectedObjects = useMemo(() => {
    return objects
      .filter((obj) => obj.alt >= 0)
      .slice(0, 45)
      .map((obj) => {
        const radiusFraction = (90 - obj.alt) / 90;
        const radiusPercent = radiusFraction * 40;
        const angleRad = (obj.az * Math.PI) / 180;
        const x = 50 + radiusPercent * Math.sin(angleRad);
        const y = 50 - radiusPercent * Math.cos(angleRad);
        const dotSize = Math.max(2, Math.min(8, (8 - obj.magnitude) * 0.8));
        const color = categoryColors[obj.category] || "#fff";
        return { ...obj, x, y, dotSize, color };
      });
  }, [objects]);

  return (
    <main
      className="relative w-screen h-screen bg-[#010208] text-white overflow-hidden"
      id="sky-view"
      style={{ cursor: scale > 1 ? "grab" : "default" }}
    >
      {/* ─── Backdrop ─── */}
      <div className="absolute inset-0 z-0 select-none overflow-hidden bg-radial-cosmic pointer-events-none">
        {/* Nebula glows — reduced size to avoid GPU paint thrash */}
        <div className="absolute top-1/4 left-1/4 w-[45vw] h-[45vw] rounded-full blur-[100px] bg-purple-glow opacity-20 animate-drift-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] rounded-full blur-[120px] bg-blue-glow opacity-15 animate-drift-reverse" />
        {/* Rich starfield pattern */}
        <div className="absolute inset-0 bg-stars opacity-60" />
      </div>

      {/* ─── Zoomable / Pannable Canvas Layer ─── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
        style={{ touchAction: "none" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          {/* Coordinate frame circle */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vh,78vw)] aspect-square rounded-full border transition-all duration-500"
            style={{
              borderColor: isScientific ? "rgba(0, 212, 255, 0.12)" : "rgba(255, 255, 255, 0.02)",
              boxShadow: isScientific ? "0 0 50px rgba(0, 212, 255, 0.03)" : "none",
            }}
          >
            {/* Scientific grid rings */}
            {isScientific && (
              <>
                <div className="absolute inset-0 rounded-full border border-white/5 animate-radar-sweep pointer-events-none" />
                {/* 30° Ring */}
                <div className="absolute w-[66.6%] h-[66.6%] inset-0 m-auto rounded-full border border-white/5 flex items-center justify-center">
                  <span className="absolute text-white/20 font-bold" style={{ fontFamily: "var(--font-mono)", fontSize: `${8 / scale}px`, top: `${4 / scale}px` }}>60°</span>
                </div>
                {/* 60° Ring */}
                <div className="absolute w-[33.3%] h-[33.3%] inset-0 m-auto rounded-full border border-white/5 flex items-center justify-center">
                  <span className="absolute text-white/20 font-bold" style={{ fontFamily: "var(--font-mono)", fontSize: `${8 / scale}px`, top: `${4 / scale}px` }}>30°</span>
                </div>
                {/* Crosshairs */}
                <div className="absolute w-full h-[1px] top-1/2 bg-white/5" />
                <div className="absolute h-full w-[1px] left-1/2 bg-white/5" />
                {/* Compass */}
                <span className="absolute top-0 left-1/2 font-bold text-white/40" style={{ fontFamily: "var(--font-orbitron)", fontSize: `${10 / scale}px`, transform: `translate(-50%, -${24 / scale}px)` }}>N</span>
                <span className="absolute bottom-0 left-1/2 font-bold text-white/40" style={{ fontFamily: "var(--font-orbitron)", fontSize: `${10 / scale}px`, transform: `translate(-50%, ${24 / scale}px)` }}>S</span>
                <span className="absolute right-0 top-1/2 font-bold text-white/40" style={{ fontFamily: "var(--font-orbitron)", fontSize: `${10 / scale}px`, transform: `translate(${24 / scale}px, -50%)` }}>E</span>
                <span className="absolute left-0 top-1/2 font-bold text-white/40" style={{ fontFamily: "var(--font-orbitron)", fontSize: `${10 / scale}px`, transform: `translate(-${24 / scale}px, -50%)` }}>W</span>
                {/* Zenith crosshair */}
                <div className="absolute inset-0 m-auto w-4 h-4 flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00e5b0]" />
                  <div className="absolute w-3 h-[1px] bg-[#00e5b0]/55" />
                  <div className="absolute h-3 w-[1px] bg-[#00e5b0]/55" />
                </div>
              </>
            )}

            {/* Projected sky objects */}
            <div className="absolute inset-0 pointer-events-auto">
              {projectedObjects.map((obj) => {
                const isSelected = selectedObject?.id === obj.id;
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObject(obj)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-150 outline-none"
                    style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                    id={`canvas-node-${obj.id}`}
                    title={`${obj.name} (${obj.category})`}
                  >
                    <span
                      className="block rounded-full transition-all duration-200"
                      style={{
                        width: `${isSelected ? obj.dotSize + 4 : obj.dotSize}px`,
                        height: `${isSelected ? obj.dotSize + 4 : obj.dotSize}px`,
                        backgroundColor: obj.color,
                        boxShadow: isSelected
                          ? `0 0 14px ${obj.color}, 0 0 4px ${obj.color}`
                          : `0 0 4px ${obj.color}`,
                      }}
                    />
                    {isSelected && (
                      <span
                        className="absolute inset-[-6px] rounded-full border border-dashed animate-spin-slow pointer-events-none"
                        style={{ borderColor: obj.color }}
                      />
                    )}
                    {isScientific && (
                      <span
                        className="absolute text-white/50 truncate font-medium"
                        style={{
                          fontFamily: "var(--font-inter)",
                          fontSize: `${9 / scale}px`,
                          top: `${12 / scale}px`,
                          left: `${12 / scale}px`,
                          maxWidth: `${80 / scale}px`
                        }}
                      >
                        {obj.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Zoom Controls */}
      <div
        className="fixed bottom-28 right-6 z-50 flex flex-col items-center gap-2 p-1.5 rounded-xl border select-none transition-all duration-300 hover:border-[#00e5b0]/30"
        style={{
          background: isScientific ? "rgba(6, 13, 31, 0.92)" : "rgba(3, 5, 15, 0.8)",
          backdropFilter: "blur(20px)",
          borderColor: isScientific ? "rgba(0, 212, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
          boxShadow: isScientific ? "0 4px 30px rgba(0, 212, 255, 0.08)" : "0 4px 30px rgba(0, 0, 0, 0.6)",
        }}
        id="radar-zoom-controls"
      >
        <button
          onClick={() => setScale((prev) => Math.min(4, prev * 1.2))}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 hover:border-[#00e5b0]/30 hover:bg-[#00e5b0]/10 text-white/70 hover:text-[#00e5b0] transition-all text-xs font-bold active:scale-90"
          title="Zoom In"
        >
          ＋
        </button>
        <span
          className="text-[9px] font-bold text-center w-10 select-none cursor-default"
          style={{
            fontFamily: "var(--font-mono)",
            color: scale !== 1 ? "#00e5b0" : "rgba(255,255,255,0.4)",
          }}
        >
          {(scale * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => setScale((prev) => Math.max(0.5, prev / 1.2))}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 hover:border-[#00e5b0]/30 hover:bg-[#00e5b0]/10 text-white/70 hover:text-[#00e5b0] transition-all text-xs font-bold active:scale-90"
          title="Zoom Out"
        >
          －
        </button>
        {(scale !== 1 || offset.x !== 0 || offset.y !== 0) && (
          <button
            onClick={onDoubleClick}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#ff5577]/20 hover:border-[#ff5577]/40 hover:bg-[#ff5577]/10 text-[#ff5577]/70 hover:text-[#ff5577] transition-all text-[10px] font-bold active:scale-90 mt-1"
            title="Reset Zoom & Pan"
          >
            ⟲
          </button>
        )}
      </div>

      {/* ─── Overlay UI Shell ─── */}
      <Topbar totalObjects={objects.length} />

      {/* Loading spinner — fixed border-top color */}
      {loading && objects.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{ border: "2px solid rgba(0,229,176,0.15)", borderTopColor: "#00e5b0" }}
          />
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
            Syncing orbital telemetry…
          </p>
        </div>
      )}

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
