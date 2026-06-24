"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import LocationSearch from "@/components/LocationSearch";

// Dynamic import — CesiumJS cannot run during SSR
const GlobeView = dynamic(() => import("@/components/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="globe-loading">
      <div className="globe-loading-spinner" />
      <p>Initialising globe…</p>
    </div>
  ),
});

// ISSMarker also needs Cesium — lazy loaded after globe mounts
const ISSMarker = dynamic(() => import("@/components/ISSMarker"), {
  ssr: false,
});

export default function LandingPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cesiumViewer, setCesiumViewer] = useState<unknown>(null);

  const handleGlobeReady = useCallback((viewer: unknown) => {
    setCesiumViewer(viewer);
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string) => {
      setSelectedLocation({ lat, lon, name });
      setFlyTarget({ lat, lon });

      // After fly-to animation (~2.5s), show "Looking up your sky…" and navigate
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          router.push(`/sky?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}`);
        }, 1800);
      }, 2600);
    },
    [router]
  );

  const handleGlobeClick = useCallback(
    (lat: number, lon: number) => {
      handleLocationSelect(lat, lon, `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    },
    [handleLocationSelect]
  );

  return (
    <main className="globe-page" id="main-landing">
      {/* Full-screen globe */}
      <GlobeView
        onLocationSelect={handleGlobeClick}
        flyToLocation={flyTarget}
        onGlobeReady={handleGlobeReady}
      />

      {/* ISS marker on globe */}
      <ISSMarker
        viewer={cesiumViewer}
        observerLat={selectedLocation?.lat ?? null}
        observerLon={selectedLocation?.lon ?? null}
      />

      {/* Hero overlay */}
      {!isTransitioning && !selectedLocation && (
        <div className="hero-overlay" id="hero-overlay">
          <div className="hero-content">
            <div className="hero-badge">🌌 Real-Time Cosmic Radar</div>
            <h1 className="hero-title">Project Zenith</h1>
            <p className="hero-subtitle">
              Click anywhere on Earth — or search below — to see what&apos;s in
              your sky right now.
            </p>
          </div>
        </div>
      )}

      {/* Transition overlay */}
      {isTransitioning && (
        <div className="transition-overlay" id="sky-transition-overlay">
          <div className="transition-content">
            <div className="transition-spinner" />
            <p className="transition-text">Looking up your sky…</p>
            {selectedLocation && (
              <p className="transition-location">{selectedLocation.name}</p>
            )}
          </div>
        </div>
      )}

      {/* Location search — bottom-center */}
      {!isTransitioning && (
        <div className="search-overlay" id="search-overlay">
          <LocationSearch onLocationSelect={handleLocationSelect} />
        </div>
      )}
    </main>
  );
}
