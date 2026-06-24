"use client";

/**
 * usePlanets — computes positions + distances for the 7 naked-eye planets
 * using astronomy-engine entirely client-side.
 *
 * Benefits over the previous JPL Horizons approach:
 *  - No network requests (eliminates rate-limit errors, Bug 5)
 *  - Real geocentric distances in km (fixes hardcoded 1e9, Bug 4)
 *  - Instant results — no async latency
 *  - Works offline
 */

import { useEffect, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { CelestialObject } from "@/lib/celestial";
import { nextTransit } from "@/lib/astronomy";

// AU → km
const AU_TO_KM = 1.495978707e8;

interface PlanetDef {
  name: string;
  id: string;
  body: Astronomy.Body;
  color: string;
}

const PLANETS: PlanetDef[] = [
  { name: "Mercury", id: "planet-mercury", body: Astronomy.Body.Mercury, color: "#B5A290" },
  { name: "Venus",   id: "planet-venus",   body: Astronomy.Body.Venus,   color: "#E8CFAA" },
  { name: "Mars",    id: "planet-mars",    body: Astronomy.Body.Mars,    color: "#C1440E" },
  { name: "Jupiter", id: "planet-jupiter", body: Astronomy.Body.Jupiter, color: "#C88B3A" },
  { name: "Saturn",  id: "planet-saturn",  body: Astronomy.Body.Saturn,  color: "#E4D191" },
  { name: "Uranus",  id: "planet-uranus",  body: Astronomy.Body.Uranus,  color: "#7FFFD4" },
  { name: "Neptune", id: "planet-neptune", body: Astronomy.Body.Neptune, color: "#4B70DD" },
];

/**
 * Get the apparent visual magnitude of a planet using astronomy-engine.
 * Falls back to a reasonable fixed value if the call fails.
 */
function getPlanetMagnitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  try {
    return Astronomy.Illumination(body, time).mag;
  } catch {
    // Fallback magnitudes (approximate)
    const fallback: Partial<Record<Astronomy.Body, number>> = {
      [Astronomy.Body.Mercury]: 0.0,
      [Astronomy.Body.Venus]:   -4.4,
      [Astronomy.Body.Mars]:    0.5,
      [Astronomy.Body.Jupiter]: -2.0,
      [Astronomy.Body.Saturn]:  0.7,
      [Astronomy.Body.Uranus]:  5.7,
      [Astronomy.Body.Neptune]: 7.9,
    };
    return fallback[body] ?? 4.0;
  }
}

export function usePlanets(
  observerLat: number | null,
  observerLon: number | null
): { planets: CelestialObject[]; loading: boolean; error: string | null } {
  const [planets, setPlanets] = useState<CelestialObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    try {
      const now = new Date();
      const time = Astronomy.MakeTime(now);
      const observer = new Astronomy.Observer(observerLat, observerLon, 0);

      const results: CelestialObject[] = [];

      for (const planet of PLANETS) {
        // Equatorial coordinates (apparent RA/Dec, J2000)
        const equatorial = Astronomy.Equator(planet.body, time, observer, true, true);
        const ra  = equatorial.ra;   // decimal hours
        const dec = equatorial.dec;  // decimal degrees

        // Horizontal coordinates
        const hor = Astronomy.Horizon(time, observer, ra, dec, "normal");
        if (hor.altitude < 0) continue; // below horizon

        // Geocentric distance in km
        const distanceKm = equatorial.dist * AU_TO_KM;

        // Next transit (cheap 1-minute step LST bisection)
        const transit = nextTransit(ra, dec, observerLat, observerLon, now);

        // Apparent visual magnitude
        const magnitude = getPlanetMagnitude(planet.body, time);

        results.push({
          id: planet.id,
          name: planet.name,
          category: "planet",
          az: hor.azimuth,
          alt: hor.altitude,
          ra,
          dec,
          distanceKm,
          magnitude,
          color: planet.color,
          nextTransit: transit?.toISOString() ?? null,
        });
      }

      results.sort((a, b) => b.alt - a.alt);
      setPlanets(results);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planet computation failed");
      setLoading(false);
    }
  }, [observerLat, observerLon]);

  return { planets, loading, error };
}
