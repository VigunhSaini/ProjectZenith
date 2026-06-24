"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useZenith } from "@/hooks/useZenith";
import type { CelestialObject } from "@/lib/celestial";

function SkyContent() {
  const params = useSearchParams();
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const lon = params.get("lon") ? parseFloat(params.get("lon")!) : null;
  const name = params.get("name") ?? "Unknown Location";

  const { objects, loading, error, lastUpdated } = useZenith(lat, lon);

  const categoryColors: Record<string, string> = {
    iss: "#FF8C00",
    satellite: "#00BFFF",
    planet: "#FFD700",
    star: "#FFFFFF",
    moon: "#D0D0D0",
  };

  return (
    <main className="sky-page" id="sky-view">
      {/* Header */}
      <header className="sky-header" id="sky-header">
        <a href="/" className="sky-back-btn" id="back-to-globe">
          ← Globe
        </a>
        <div className="sky-location">
          <span className="sky-location-name">📍 {name}</span>
          {lat && lon && (
            <span className="sky-location-coords">
              {lat.toFixed(4)}°, {lon.toFixed(4)}°
            </span>
          )}
        </div>
        <div className="sky-meta">
          {loading && <span className="sky-loading-badge">⟳ Loading…</span>}
          {!loading && (
            <span className="sky-count-badge">{objects.length} objects above horizon</span>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="sky-error" id="sky-error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Object list */}
      <div className="sky-objects-container" id="sky-objects-list">
        {loading && objects.length === 0 && (
          <div className="sky-empty">
            <div className="sky-empty-spinner" />
            <p>Computing your sky…</p>
          </div>
        )}

        {objects.map((obj: CelestialObject) => (
          <div
            key={obj.id}
            className="sky-object-card"
            id={`sky-object-${obj.id}`}
            style={{ borderLeftColor: categoryColors[obj.category] ?? "#fff" }}
          >
            <div className="sky-object-header">
              <span
                className="sky-object-dot"
                style={{ backgroundColor: obj.color }}
              />
              <span className="sky-object-name">{obj.name}</span>
              <span
                className="sky-object-category"
                style={{ color: categoryColors[obj.category] }}
              >
                {obj.category.toUpperCase()}
              </span>
            </div>

            <div className="sky-object-coords">
              <span title="Altitude">↑ {obj.alt.toFixed(1)}°</span>
              <span title="Azimuth">⟳ {obj.az.toFixed(1)}°</span>
              <span title="Magnitude">★ {obj.magnitude.toFixed(1)}</span>
            </div>

            <div className="sky-object-detail">
              <span>RA {obj.ra.toFixed(3)}h</span>
              <span>Dec {obj.dec.toFixed(2)}°</span>
              {obj.nextTransit && (
                <span title="Next transit" suppressHydrationWarning>
                  ⊙{" "}
                  {new Date(obj.nextTransit).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Debug JSON — Member B can replace this entire block */}
      <details className="sky-debug" id="sky-debug-json">
        <summary suppressHydrationWarning>Raw useZenith output ({objects.length} objects, last updated: {new Date(lastUpdated).toLocaleTimeString()})</summary>
        <pre>{JSON.stringify({ objects, loading, error, lastUpdated }, null, 2)}</pre>
      </details>
    </main>
  );
}

export default function SkyPage() {
  return (
    <Suspense fallback={
      <div className="sky-loading-full">
        <div className="sky-empty-spinner" />
        <p>Loading sky view…</p>
      </div>
    }>
      <SkyContent />
    </Suspense>
  );
}
