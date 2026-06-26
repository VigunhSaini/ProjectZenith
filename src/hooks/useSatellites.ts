"use client";

import { useEffect, useState, useMemo } from "react";
import { CelestialObject } from "@/lib/celestial";
import { parseTleToSatrec, propagateSatrec } from "@/lib/satellite";
import type * as satellite from "satellite.js";

const CELESTRAK_URL = "/api/celestrak";
const CACHE_KEY = "zenith_satellites_tle_v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SATS = 200;

interface CachedTLEs {
  timestamp: number;
  tles: Array<{ name: string; line1: string; line2: string }>;
}

interface SatRecordData {
  name: string;
  line1: string;
  line2: string;
  satrec: satellite.SatRec;
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
  const [satellitesData, setSatellitesData] = useState<SatRecordData[]>([]);
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
        const satRecords: SatRecordData[] = [];
        for (const p of cached) {
          const satrec = parseTleToSatrec(p.line1, p.line2);
          if (satrec) {
            satRecords.push({
              name: p.name,
              line1: p.line1,
              line2: p.line2,
              satrec,
            });
          }
        }
        setSatellitesData(satRecords);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(CELESTRAK_URL);
        if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseTLEText(text);
        
        const satRecords: SatRecordData[] = [];
        for (const p of parsed) {
          const satrec = parseTleToSatrec(p.line1, p.line2);
          if (satrec) {
            satRecords.push({
              name: p.name,
              line1: p.line1,
              line2: p.line2,
              satrec,
            });
          }
        }

        setCachedTLEs(parsed);
        setSatellitesData(satRecords);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch TLEs");
      } finally {
        setLoading(false);
      }
    };

    loadTLEs();
  }, [observerLat, observerLon]);

  // 1. Coarse filter based on observer's latitude (recomputed only when location or database changes)
  const filteredSatellites = useMemo(() => {
    if (observerLat === null || satellitesData.length === 0) {
      return [];
    }

    const latObsAbs = Math.abs(observerLat);
    const RAD_TO_DEG = 180 / Math.PI;
    const DEG_TO_RAD = Math.PI / 180;
    const Re = 6378.137;
    const elevLimitRad = 10 * DEG_TO_RAD;
    const cosElev = Math.cos(elevLimitRad);

    const filtered: SatRecordData[] = [];

    for (const item of satellitesData) {
      // Skip ISS (handled by useISS)
      if (item.line1.includes("25544")) continue;

      try {
        // Parse inclination from line 2 (columns 9-16)
        const i = parseFloat(item.line2.slice(8, 16));
        const iMax = i > 90 ? 180 - i : i;
        const minLatDiff = latObsAbs - iMax;

        if (minLatDiff > 0) {
          // Parse mean motion from line 2 (columns 53-63)
          const n_day = parseFloat(item.line2.slice(52, 63));
          const n_rad_s = (n_day * 2 * Math.PI) / 86400;
          const mu = 398600.4418;
          const a = Math.pow(mu / (n_rad_s * n_rad_s), 1/3);
          const h = a - Re;

          const ratio = (Re / (Re + h)) * cosElev;
          if (ratio <= 1.0) {
            const maxThetaRad = Math.acos(ratio) - elevLimitRad;
            const maxThetaDeg = maxThetaRad * RAD_TO_DEG;

            if (minLatDiff > maxThetaDeg) {
              continue; // Skip propagation: this satellite can never exceed 10 degrees elevation
            }
          }
        }
      } catch {
        // In case of parsing issues, do not skip
      }

      filtered.push(item);
    }

    return filtered;
  }, [satellitesData, observerLat]);

  // 2. High-frequency propagation loop (runs on pre-filtered satellites)
  const satellites = useMemo(() => {
    if (observerLat === null || observerLon === null || filteredSatellites.length === 0) {
      return [];
    }

    const objects: CelestialObject[] = [];

    for (const item of filteredSatellites) {
      const result = propagateSatrec(
        item.satrec,
        observerLat,
        observerLon,
        observerAltM,
        time
      );

      if (!result) continue;
      if (result.alt < 10) continue; // 10 degrees filter

      objects.push({
        id: `sat-${item.line1.slice(2, 7).trim()}`,
        name: item.name,
        category: "satellite",
        az: result.az,
        alt: result.alt,
        ra: 0,
        dec: 0,
        distanceKm: result.rangeSat,
        magnitude: 3.0,
        color: "#00BFFF",
        nextTransit: null, // computed lazily on selection to prevent major CPU/SGP4 bisection lag
        lat: result.geo?.lat,
        lon: result.geo?.lon,
        altKm: result.geo?.altKm,
      });
    }

    // Sort by altitude descending, keep top MAX_SATS
    objects.sort((a, b) => b.alt - a.alt);
    return objects.slice(0, MAX_SATS);
  }, [filteredSatellites, observerLat, observerLon, observerAltM, time]);

  return { satellites, loading, error };
}
