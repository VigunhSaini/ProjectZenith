"use client";

import { useEffect, useRef, useState } from "react";
import { CelestialObject } from "@/lib/celestial";
import { parseRA, parseDec } from "@/lib/coordinates";
import { raDecToAltAz, nextTransit } from "@/lib/astronomy";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const PLANETS: Array<{
  name: string;
  id: string;
  target: string; // JPL Horizons target body code
  color: string;
  magnitude: number;
}> = [
  { name: "Mercury", id: "planet-mercury", target: "199", color: "#B5A290", magnitude: 0.0 },
  { name: "Venus",   id: "planet-venus",   target: "299", color: "#E8CFAA", magnitude: -4.4 },
  { name: "Mars",    id: "planet-mars",    target: "499", color: "#C1440E", magnitude: 0.5 },
  { name: "Jupiter", id: "planet-jupiter", target: "599", color: "#C88B3A", magnitude: -2.0 },
  { name: "Saturn",  id: "planet-saturn",  target: "699", color: "#E4D191", magnitude: 0.7 },
  { name: "Uranus",  id: "planet-uranus",  target: "799", color: "#7FFFD4", magnitude: 5.7 },
  { name: "Neptune", id: "planet-neptune", target: "899", color: "#4B70DD", magnitude: 7.9 },
];

interface PlanetCache {
  timestamp: number;
  ra: number; // decimal hours
  dec: number; // decimal degrees
}

const planetCache = new Map<string, PlanetCache>();

/**
 * Build the Horizons CGI URL for a single planet's RA/Dec at the current time.
 */
function horizonsUrl(target: string): string {
  const now = new Date();
  const stop = new Date(now.getTime() + 60_000); // 1 minute window
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 16).replace("T", " ");

  const params = new URLSearchParams({
    format: "text",
    COMMAND: `'${target}'`,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CENTER: "500@399", // geocenter
    START_TIME: `'${fmt(now)}'`,
    STOP_TIME: `'${fmt(stop)}'`,
    STEP_SIZE: "1 m",
    QUANTITIES: "1", // RA & Dec only
  });

  return `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
}

/**
 * Parse RA/Dec from Horizons text output ($$SOE...$$EOE block).
 * Returns null if parsing fails.
 */
function parseHorizonsRaDec(
  text: string
): { ra: number; dec: number } | null {
  const soeIdx = text.indexOf("$$SOE");
  const eoeIdx = text.indexOf("$$EOE");
  if (soeIdx === -1 || eoeIdx === -1) return null;

  const block = text.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block.split("\n").filter((l) => l.trim());
  if (!lines.length) return null;

  // Horizons OBSERVER RA/Dec format:
  // "2024-Jan-01 00:00  *   HH MM SS.ff  +/-DD MM SS.f  ..."
  const line = lines[0].trim();
  // Match "HH MM SS.ff  sDD MM SS.f" pattern
  const match = line.match(
    /(\d{2}\s+\d{2}\s+[\d.]+)\s+([+-]\d{2}\s+\d{2}\s+[\d.]+)/
  );
  if (!match) return null;

  const ra = parseRA(match[1].replace(/\s+/g, " "));
  const dec = parseDec(match[2].replace(/\s+/g, " "));

  if (isNaN(ra) || isNaN(dec)) return null;
  return { ra, dec };
}

export function usePlanets(
  observerLat: number | null,
  observerLon: number | null
): { planets: CelestialObject[]; loading: boolean; error: string | null } {
  const [planets, setPlanets] = useState<CelestialObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAllPlanets = async () => {
      setLoading(true);
      setError(null);

      const now = new Date();
      const results: CelestialObject[] = [];
      let anyError = false;

      await Promise.allSettled(
        PLANETS.map(async (planet) => {
          // Check cache
          const cached = planetCache.get(planet.target);
          let ra: number, dec: number;

          if (cached && now.getTime() - cached.timestamp < CACHE_TTL_MS) {
            ra = cached.ra;
            dec = cached.dec;
          } else {
            try {
              const res = await fetch(horizonsUrl(planet.target));
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const text = await res.text();
              const parsed = parseHorizonsRaDec(text);
              if (!parsed) throw new Error("Parse failure");
              ra = parsed.ra;
              dec = parsed.dec;
              planetCache.set(planet.target, { timestamp: now.getTime(), ra, dec });
            } catch (err) {
              anyError = true;
              console.warn(`Horizons fetch failed for ${planet.name}:`, err);
              return;
            }
          }

          const altAz = raDecToAltAz(ra, dec, observerLat, observerLon, now);
          if (altAz.alt < 0) return; // below horizon

          const transit = nextTransit(ra, dec, observerLat, observerLon, now);

          results.push({
            id: planet.id,
            name: planet.name,
            category: "planet",
            az: altAz.az,
            alt: altAz.alt,
            ra,
            dec,
            distanceKm: 1e9, // approximate order-of-magnitude; Horizons doesn't return distance in qty=1
            magnitude: planet.magnitude,
            color: planet.color,
            nextTransit: transit?.toISOString() ?? null,
          });
        })
      );

      if (anyError && results.length === 0) {
        setError("Horizons API unavailable — planet data temporarily unavailable");
      }

      results.sort((a, b) => b.alt - a.alt);
      setPlanets(results);
      setLoading(false);
    };

    fetchAllPlanets();
  }, [observerLat, observerLon]);

  return { planets, loading, error };
}
