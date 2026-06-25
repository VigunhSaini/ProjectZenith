"use client";

import { useEffect, useState, useMemo } from "react";
import { CelestialObject } from "@/lib/celestial";
import { tleToAltAz, tleToGeodetic } from "@/lib/satellite";

const CELESTRAK_URL = "/api/celestrak";
const CACHE_KEY = "zenith_satellites_tle";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SATS = 200;

interface CachedTLEs {
  timestamp: number;
  tles: Array<{ name: string; line1: string; line2: string }>;
}

function parseTLEText(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: Array<{ name: string; line1: string; line2: string }> = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      result.push({ name, line1, line2 });
    }
  }
  return result;
}

function getCachedTLEs(): CachedTLEs["tles"] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedTLEs = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached.tles;
  } catch {
    return null;
  }
}

function setCachedTLEs(
  tles: Array<{ name: string; line1: string; line2: string }>
) {
  try {
    const data: CachedTLEs = { timestamp: Date.now(), tles };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable
  }
}

export function useSatellites(
  observerLat: number | null,
  observerLon: number | null,
  observerAltM = 0,
  time: Date = new Date()
): { satellites: CelestialObject[]; loading: boolean; error: string | null } {
  const [tles, setTles] = useState<Array<{ name: string; line1: string; line2: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const loadTLEs = async () => {
      setLoading(true);
      setError(null);

      const cached = getCachedTLEs();

      // Only use cached TLEs if they represent a full fetch (more than 5 satellites)
      if (cached && cached.length > 5) {
        setTles(cached);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(CELESTRAK_URL);
        if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseTLEText(text);
        setCachedTLEs(parsed);
        setTles(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch TLEs");
      } finally {
        setLoading(false);
      }
    };

    loadTLEs();
  }, [observerLat, observerLon]);

  const satellites = useMemo(() => {
    if (observerLat === null || observerLon === null || tles.length === 0) {
      return [];
    }

    const objects: CelestialObject[] = [];

    for (const tle of tles) {
      // Skip ISS (handled by useISS)
      if (tle.line1.includes("25544")) continue;

      const altAz = tleToAltAz(
        tle.line1,
        tle.line2,
        observerLat,
        observerLon,
        observerAltM,
        time
      );

      if (altAz.alt < 0) continue; // below horizon

      const geo = tleToGeodetic(tle.line1, tle.line2, time);

      objects.push({
        id: `sat-${tle.line1.slice(2, 7).trim()}`,
        name: tle.name,
        category: "satellite",
        az: altAz.az,
        alt: altAz.alt,
        ra: 0,
        dec: 0,
        distanceKm: altAz.rangeSat,
        magnitude: 3.0,
        color: "#00BFFF",
        nextTransit: null, // computed lazily on selection to prevent major CPU/SGP4 bisection lag
        lat: geo?.lat,
        lon: geo?.lon,
        altKm: geo?.altKm,
      });
    }

    // Sort by altitude descending, keep top MAX_SATS
    objects.sort((a, b) => b.alt - a.alt);
    return objects.slice(0, MAX_SATS);
  }, [tles, observerLat, observerLon, observerAltM, time]);

  return { satellites, loading, error };
}
