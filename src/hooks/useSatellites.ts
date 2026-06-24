"use client";

import { useEffect, useState } from "react";
import { CelestialObject } from "@/lib/celestial";
import { tleToAltAz, tleToGeodetic } from "@/lib/satellite";
import { nextTransit } from "@/lib/astronomy";

const CELESTRAK_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=2le";
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
  observerAltM = 0
): { satellites: CelestialObject[]; loading: boolean; error: string | null } {
  const [satellites, setSatellites] = useState<CelestialObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const loadSatellites = async () => {
      setLoading(true);
      setError(null);

      let tles = getCachedTLEs();

      if (!tles) {
        try {
          const res = await fetch(CELESTRAK_URL);
          if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
          const text = await res.text();
          tles = parseTLEText(text);
          setCachedTLEs(tles);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to fetch TLEs");
          setLoading(false);
          return;
        }
      }

      const now = new Date();
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
          now
        );

        if (altAz.alt < 0) continue; // below horizon

        const geo = tleToGeodetic(tle.line1, tle.line2, now);
        const transit = nextTransit(0, 0, observerLat, observerLon, now);

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
          nextTransit: transit?.toISOString() ?? null,
          lat: geo?.lat,
          lon: geo?.lon,
          altKm: geo?.altKm,
        });
      }

      // Sort by altitude descending, keep top MAX_SATS
      objects.sort((a, b) => b.alt - a.alt);
      setSatellites(objects.slice(0, MAX_SATS));
      setLoading(false);
    };

    loadSatellites();
  }, [observerLat, observerLon, observerAltM]);

  return { satellites, loading, error };
}
