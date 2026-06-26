"use client";

import { useEffect, useState, useMemo } from "react";
import { CelestialObject } from "@/lib/celestial";
import { raDecToAltAz } from "@/lib/astronomy";

const STARS_URL = "/data/hyg_stars.json";

interface HygStar {
  id: number;
  name: string;
  designation: string;
  ra: number;   // decimal hours
  dec: number;  // decimal degrees
  mag: number;
  color: string;
  distLy: number;
}

const LY_TO_KM = 9.461e12;

export function useStars(
  observerLat: number | null,
  observerLon: number | null,
  time: Date = new Date()
): { stars: CelestialObject[]; loading: boolean; error: string | null } {
  const [hygData, setHygData] = useState<HygStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const loadStars = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(STARS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading star data`);
        const data = await res.json();
        setHygData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load star data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadStars();
  }, [observerLat, observerLon]);

  const stars = useMemo(() => {
    if (observerLat === null || observerLon === null || hygData.length === 0) {
      return [];
    }

    const result: CelestialObject[] = [];

    for (const star of hygData) {
      const altAz = raDecToAltAz(
        star.ra,
        star.dec,
        observerLat,
        observerLon,
        time
      );

      if (altAz.alt <= 0) continue;

      // Only include named stars or very bright stars (magnitude < 3.0)
      const hasName = star.name && star.name.trim() !== "";
      const isBright = star.mag < 3.0;
      if (!hasName && !isBright) continue;

      result.push({
        id: `star-${star.id}`,
        name: hasName ? star.name : star.designation,
        category: "star",
        az: altAz.az,
        alt: altAz.alt,
        ra: star.ra,
        dec: star.dec,
        distanceKm: star.distLy * LY_TO_KM,
        magnitude: star.mag,
        color: star.color,
        nextTransit: null, // computed lazily on selection
      });
    }

    return result.sort((a, b) => b.alt - a.alt);
  }, [hygData, observerLat, observerLon, time]);

  return { stars, loading, error };
}
