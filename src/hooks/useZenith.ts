"use client";

import { useMemo } from "react";
import { CelestialObject } from "@/lib/celestial";
import { useISS } from "./useISS";
import { useSatellites } from "./useSatellites";
import { usePlanets } from "./usePlanets";
import { useStars } from "./useStars";
import { useZenithStore } from "@/store/zenith";

export interface UseZenithResult {
  /** All above-horizon celestial objects, sorted by altitude descending */
  objects: CelestialObject[];
  /** True while any sub-hook is still loading */
  loading: boolean;
  /** First error encountered across sub-hooks, or null */
  error: string | null;
  /** ISO-8601 timestamp of last data refresh */
  lastUpdated: string;
}

/**
 * Master hook for Project Zenith.
 *
 * Combines ISS, satellite, planet, and star data pipelines into a single
 * sorted CelestialObject array for consumption by Member B's sky view.
 *
 * @param observerLat  Observer latitude in decimal degrees (null = no location selected)
 * @param observerLon  Observer longitude in decimal degrees (null = no location selected)
 * @param observerAltM Observer altitude above ellipsoid in metres (default 0)
 *
 * @example
 * ```tsx
 * const { lat, lon } = useObserverLocation();
 * const { objects, loading, error, lastUpdated } = useZenith(lat, lon);
 * ```
 */
export function useZenith(
  observerLat: number | null,
  observerLon: number | null,
  observerAltM = 0
): UseZenithResult {
  const currentTimeMs = useZenithStore((state) => state.currentTime);

  // Convert the numeric timestamp to a Date once per change.
  // useMemo ensures the same Date reference is reused when the value hasn't changed,
  // preventing unnecessary re-renders in sub-hook dependency arrays.
  const currentTime = useMemo(() => new Date(currentTimeMs), [currentTimeMs]);

  const { issObject } = useISS(observerLat, observerLon, observerAltM, currentTime);
  const { satellites, loading: satLoading, error: satError } = useSatellites(
    observerLat,
    observerLon,
    observerAltM,
    currentTime
  );
  const { planets, loading: planetLoading, error: planetError } = usePlanets(
    observerLat,
    observerLon,
    currentTime
  );
  const { stars, loading: starLoading, error: starError } = useStars(
    observerLat,
    observerLon,
    currentTime
  );

  const loading = satLoading || planetLoading || starLoading;
  const error = satError ?? planetError ?? starError ?? null;

  const objects = useMemo<CelestialObject[]>(() => {
    const all: CelestialObject[] = [
      ...(issObject ? [issObject] : []),
      ...satellites,
      ...planets,
      ...stars,
    ];
    // Sort by altitude descending (highest in sky first)
    return all.sort((a, b) => b.alt - a.alt);
  }, [issObject, satellites, planets, stars]);

  // lastUpdated: regenerate when objects array changes identity or time changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastUpdated = useMemo(() => new Date().toISOString(), [issObject, satellites, planets, stars, currentTime]);

  return { objects, loading, error, lastUpdated };
}
