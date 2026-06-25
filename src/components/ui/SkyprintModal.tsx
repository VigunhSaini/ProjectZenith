"use client";

import { useZenithStore } from "@/store/zenith";
import { CelestialObject } from "@/lib/celestial";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

interface SkyprintModalProps {
  objects: CelestialObject[];
}

export default function SkyprintModal({ objects }: SkyprintModalProps) {
  const { showSkyprint, setShowSkyprint, location, currentTime: currentTimeMs } = useZenithStore();
  const currentTime = useMemo(() => new Date(currentTimeMs), [currentTimeMs]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!showSkyprint || !location || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = "#010208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw card background styling
    ctx.strokeStyle = "rgba(0, 212, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Poster Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PROJECT ZENITH", canvas.width / 2, 70);

    ctx.fillStyle = "rgba(0, 212, 255, 0.6)";
    ctx.font = "bold 11px JetBrains Mono, monospace";
    ctx.fillText("COSMIC RADAR RECORD — THE CELESTIAL EYE", canvas.width / 2, 95);

    // Draw Circular Sky Dome Projection
    const cx = canvas.width / 2;
    const cy = 420;
    const r = 320;

    // Radial gradient representing depth of space
    const skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    skyGrad.addColorStop(0, "#09173c");
    skyGrad.addColorStop(0.7, "#030612");
    skyGrad.addColorStop(1, "#010208");

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = skyGrad;
    ctx.fill();

    // Outer horizon ring
    ctx.strokeStyle = "rgba(0, 212, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle Altitude helper rings (30° and 60° elevation)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    [30, 60].forEach((alt) => {
      const ringRadius = r * ((90 - alt) / 90);
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs intersecting at zenith
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Compass cardinal direction labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Orbitron, sans-serif";
    ctx.textBaseline = "middle";

    ctx.fillText("N", cx, cy - r - 20); // North
    ctx.fillText("S", cx, cy + r + 20); // South
    ctx.fillText("E", cx + r + 20, cy); // East
    ctx.fillText("W", cx - r - 20, cy); // West

    // Project and draw celestial objects
    objects.forEach((obj) => {
      if (obj.alt < 0) return; // Skip objects below horizon

      // Radius: Zenith (90° alt) is at center, Horizon (0° alt) is at boundary
      const distanceFraction = (90 - obj.alt) / 90;
      const objectRadius = r * distanceFraction;

      // Coordinate geometry projection: North (Az=0) is up
      const angleRad = (obj.az * Math.PI) / 180;
      const x = cx + objectRadius * Math.sin(angleRad);
      const y = cy - objectRadius * Math.cos(angleRad);

      // Dot size based on apparent magnitude
      const dotSize = Math.max(1.5, Math.min(8, (8 - obj.magnitude) * 0.8));

      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.shadowColor = obj.color;
      ctx.shadowBlur = obj.alt > 80 ? 12 : 2; // Extra glow if near zenith
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      // Label named planets and key objects
      if (obj.category === "planet" || obj.category === "iss" || (obj.category === "star" && !obj.name.startsWith("HYG"))) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`  ${obj.name}`, x, y);
      }
    });

    // Draw Footer Metadata Box
    const footerY = 800;
    ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(50, footerY - 30, canvas.width - 100, 110);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(location.name, canvas.width / 2, footerY + 5);

    ctx.fillStyle = "rgba(232, 244, 248, 0.6)";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(
      `COORD: LAT ${location.lat.toFixed(4)}° / LON ${location.lon.toFixed(4)}°`,
      canvas.width / 2,
      footerY + 28
    );

    const timeStr = currentTime.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
    ctx.fillText(timeStr, canvas.width / 2, footerY + 48);

    // Save as URL link data
    setDownloadUrl(canvas.toDataURL("image/png"));
  }, [showSkyprint, location, objects, currentTime]);

  if (!showSkyprint) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] select-none p-4 animate-fade-in">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="w-[min(520px,100vw-32px)] flex flex-col items-center rounded-xl p-5 border"
        style={{
          background: "rgba(6, 13, 31, 0.95)",
          borderColor: "rgba(0, 212, 255, 0.2)",
          boxShadow: "0 0 40px rgba(0, 212, 255, 0.1)",
        }}
      >
        <div className="w-full flex justify-between items-center mb-4 border-b border-white/5 pb-2">
          <span
            className="text-xs font-bold tracking-widest text-[#00e5b0]"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            SAVING SKY DOME
          </span>
          <button
            onClick={() => setShowSkyprint(false)}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Hidden high-res canvas rendering */}
        <canvas
          ref={canvasRef}
          width={800}
          height={940}
          className="w-full aspect-[800/940] rounded border border-white/10 shadow-lg"
          style={{ maxWidth: "400px" }}
        />

        <p className="text-[10px] text-white/50 text-center mt-3 max-w-[340px]" style={{ fontFamily: "var(--font-inter)" }}>
          A snapshot of all planets, satellites, and stars above your local horizon at this exact coordinate and timestamp.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full mt-5">
          <button
            onClick={() => setShowSkyprint(false)}
            className="flex-1 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Cancel
          </button>
          
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`zenith-${location?.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`}
              onClick={() => setShowSkyprint(false)}
              className="flex-1 py-2.5 rounded text-xs font-semibold uppercase tracking-wider text-center text-[#010208] transition-colors"
              style={{
                fontFamily: "var(--font-inter)",
                background: "linear-gradient(135deg, #00ffcc 0%, #00a880 100%)",
                boxShadow: "0 0 15px rgba(0, 229, 176, 0.4)",
              }}
            >
              💾 Save Poster
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
