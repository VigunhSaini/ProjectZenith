"use client";

import { useEffect, useState } from "react";
import { CelestialObject } from "@/lib/celestial";
import { raDecToAltAz, nextTransit } from "@/lib/astronomy";

const STARS_URL = "/data/hyg_stars.json";

interface HygStar {
  id: number;
  name: string;
  ra: number;   // decimal hours
  dec: number;  // decimal degrees
  mag: number;
  color: string;
  distLy: number;
}

const LY_TO_KM = 9.461e12;

export function useStars(
  observerLat: number | null,
  observerLon: number | null
): { stars: CelestialObject[]; loading: boolean; error: string | null } {
  const [stars, setStars] = useState<CelestialObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const loadStars = async () => {
      setLoading(true);
      setError(null);

      let hygData: HygStar[];
      try {
        const res = await fetch(STARS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading star data`);
        hygData = await res.json();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load star data"
        );
        setLoading(false);
        return;
      }

      const now = new Date();
      const result: CelestialObject[] = [];

      for (const star of hygData) {
        const altAz = raDecToAltAz(
          star.ra,
          star.dec,
          observerLat,
          observerLon,
          now
        );

        if (altAz.alt <= 0) continue;

        const transit = nextTransit(
          star.ra,
          star.dec,
          observerLat,
          observerLon,
          now
        );

        result.push({
          id: `star-${star.id}`,
          name: star.name || `HYG ${star.id}`,
          category: "star",
          az: altAz.az,
          alt: altAz.alt,
          ra: star.ra,
          dec: star.dec,
          distanceKm: star.distLy * LY_TO_KM,
          magnitude: star.mag,
          color: star.color,
          nextTransit: transit?.toISOString() ?? null,
        });
      }

      result.sort((a, b) => b.alt - a.alt);
      setStars(result);
      setLoading(false);
    };

    loadStars();
  }, [observerLat, observerLon]);

  return { stars, loading, error };
}
