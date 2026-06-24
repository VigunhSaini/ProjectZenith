"use client";

import { useEffect, useRef, useState } from "react";
import { CelestialObject } from "@/lib/celestial";
import { slantRange } from "@/lib/coordinates";
import { nextTransit } from "@/lib/astronomy";

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const POLL_INTERVAL_MS = 5_000;

interface ISSApiResponse {
  latitude: number;
  longitude: number;
  altitude: number;
}

// ISS TLE — fallback static TLE (will be updated when useSatellites loads)
// These are used to compute Alt/Az from observer position.
// For the live position we use open-notify for lat/lon, but we still need
// alt/az so we compute via the look-angle formula directly.
const ISS_NORAD_ID = "25544";

export interface UseISSResult {
  issPosition: { lat: number; lon: number; altKm: number } | null;
  issObject: CelestialObject | null;
}

export function useISS(
  observerLat: number | null,
  observerLon: number | null,
  observerAltM = 0
): UseISSResult {
  const [issPosition, setIssPosition] = useState<{
    lat: number;
    lon: number;
    altKm: number;
  } | null>(null);
  const [issObject, setIssObject] = useState<CelestialObject | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const fetchISS = async () => {
      try {
        const res = await fetch(ISS_URL);
        if (!res.ok) return;
        const data: ISSApiResponse = await res.json();

        const lat = data.latitude;
        const lon = data.longitude;
        const altKm = data.altitude; // WhereTheISS gives exact altitude in km

        setIssPosition({ lat, lon, altKm });

        // Compute Alt/Az from observer to ISS
        // We compute elevation using spherical trig since open-notify doesn't
        // give alt/az directly.
        const toRad = (d: number) => (d * Math.PI) / 180;
        const toDeg = (r: number) => (r * 180) / Math.PI;

        const Re = 6371;
        const observerAltKm = observerAltM / 1000;

        // Central angle between observer and sub-satellite point
        const dLat = toRad(lat - observerLat);
        const dLon = toRad(lon - observerLon);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(observerLat)) *
            Math.cos(toRad(lat)) *
            Math.sin(dLon / 2) ** 2;
        const centralAngle = 2 * Math.asin(Math.sqrt(a));

        // Elevation angle
        const ro = Re + observerAltKm;
        const rs = Re + altKm;
        const elev = Math.atan(
          (rs * Math.cos(centralAngle) - ro) / (rs * Math.sin(centralAngle))
        );
        const altDeg = toDeg(elev);

        // Azimuth: bearing from observer to sub-satellite point
        const y = Math.sin(toRad(lon - observerLon)) * Math.cos(toRad(lat));
        const x =
          Math.cos(toRad(observerLat)) * Math.sin(toRad(lat)) -
          Math.sin(toRad(observerLat)) *
            Math.cos(toRad(lat)) *
            Math.cos(toRad(lon - observerLon));
        const az = (toDeg(Math.atan2(y, x)) + 360) % 360;

        // Slant range
        const range = slantRange(observerAltKm, altKm, altDeg);

        // Next transit (approximate for ISS: ~90-min orbit so within 90 min)
        const transit = nextTransit(0, 0, observerLat, observerLon, new Date());

        setIssObject({
          id: `sat-${ISS_NORAD_ID}`,
          name: "ISS (Zarya)",
          category: "iss",
          az,
          alt: altDeg,
          ra: 0,
          dec: 0,
          distanceKm: range,
          magnitude: -3.0,
          color: "#FF8C00",
          nextTransit: transit?.toISOString() ?? null,
          lat,
          lon,
          altKm,
        });
      } catch {
        // silently ignore network errors
      }
    };

    fetchISS();
    intervalRef.current = setInterval(fetchISS, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [observerLat, observerLon, observerAltM]);

  return { issPosition, issObject };
}
