"use client";

import { useEffect, useRef, useState } from "react";
import { CelestialObject } from "@/lib/celestial";
import { slantRange } from "@/lib/coordinates";
import { tleToAltAz, tleToGeodetic } from "@/lib/satellite";


const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const POLL_INTERVAL_MS = 5_000;
const ISS_NORAD_ID = "25544";

const FALLBACK_ISS_TLE = {
  line1: "1 25544U 98067A   26175.56834032  .00017169  00000-0  30386-3 0  9990",
  line2: "2 25544  51.6409 308.2045 0004543 273.7438 174.1524 15.49887714459814"
};

function getISSTLE(): { line1: string; line2: string } | null {
  try {
    const raw = localStorage.getItem("zenith_satellites_tle");
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const issTle = cached.tles.find((t: { line1: string; line2: string }) => t.line1.includes("25544"));
    if (issTle) return { line1: issTle.line1, line2: issTle.line2 };
  } catch { }
  return null;
}

interface ISSApiResponse {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface UseISSResult {
  issPosition: { lat: number; lon: number; altKm: number } | null;
  issObject: CelestialObject | null;
}

export function useISS(
  observerLat: number | null,
  observerLon: number | null,
  observerAltM = 0,
  time: Date = new Date()
): UseISSResult {
  const [issPosition, setIssPosition] = useState<{
    lat: number;
    lon: number;
    altKm: number;
  } | null>(null);
  const [issObject, setIssObject] = useState<CelestialObject | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to fetch live ISS position
  const fetchLiveISS = async () => {
    try {
      const res = await fetch(ISS_URL);
      if (!res.ok) return null;
      const data: ISSApiResponse = await res.json();
      return {
        lat: data.latitude,
        lon: data.longitude,
        altKm: data.altitude,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (observerLat === null || observerLon === null) return;

    const isLive = Math.abs(time.getTime() - Date.now()) < 15000;

    const updateISS = async () => {
      let lat: number, lon: number, altKm: number;
      let altAz: { az: number; alt: number; rangeSat: number };

      if (isLive) {
        const livePos = await fetchLiveISS();
        if (livePos) {
          lat = livePos.lat;
          lon = livePos.lon;
          altKm = livePos.altKm;

          // Compute Alt/Az from observer to ISS using spherical trig/look-angles
          const toRad = (d: number) => (d * Math.PI) / 180;
          const toDeg = (r: number) => (r * 180) / Math.PI;
          const Re = 6371;
          const observerAltKm = observerAltM / 1000;

          const dLat = toRad(lat - observerLat);
          const dLon = toRad(lon - observerLon);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(observerLat)) *
            Math.cos(toRad(lat)) *
            Math.sin(dLon / 2) ** 2;
          const centralAngle = 2 * Math.asin(Math.sqrt(a));

          const ro = Re + observerAltKm;
          const rs = Re + altKm;
          const elev = Math.atan(
            (rs * Math.cos(centralAngle) - ro) / (rs * Math.sin(centralAngle))
          );
          const altDeg = toDeg(elev);

          const y = Math.sin(toRad(lon - observerLon)) * Math.cos(toRad(lat));
          const x =
            Math.cos(toRad(observerLat)) * Math.sin(toRad(lat)) -
            Math.sin(toRad(observerLat)) *
            Math.cos(toRad(lat)) *
            Math.cos(toRad(lon - observerLon));
          const az = (toDeg(Math.atan2(y, x)) + 360) % 360;
          const range = slantRange(observerAltKm, altKm, altDeg);

          altAz = { az, alt: altDeg, rangeSat: range };
        } else {
          // Fall back to TLE if fetch fails
          const tle = getISSTLE() || FALLBACK_ISS_TLE;
          const geo = tleToGeodetic(tle.line1, tle.line2, time);
          if (!geo) return;
          lat = geo.lat;
          lon = geo.lon;
          altKm = geo.altKm;
          altAz = tleToAltAz(tle.line1, tle.line2, observerLat, observerLon, observerAltM, time);
        }
      } else {
        // Scrubbing mode: propagate via TLE
        const tle = getISSTLE() || FALLBACK_ISS_TLE;
        const geo = tleToGeodetic(tle.line1, tle.line2, time);
        if (!geo) return;
        lat = geo.lat;
        lon = geo.lon;
        altKm = geo.altKm;
        altAz = tleToAltAz(tle.line1, tle.line2, observerLat, observerLon, observerAltM, time);
      }

      setIssPosition({ lat, lon, altKm });

      if (altAz.alt >= 10) {
        setIssObject({
          id: `sat-${ISS_NORAD_ID}`,
          name: "ISS (Zarya)",
          category: "iss",
          az: altAz.az,
          alt: altAz.alt,
          ra: 0,
          dec: 0,
          distanceKm: altAz.rangeSat,
          magnitude: -3.0,
          color: "#FF8C00",
          // nextTransit intentionally null: ISS is a fast-moving LEO object —
          // the fixed-star LST bisection in nextTransit() is not meaningful for it.
          nextTransit: null,
          lat,
          lon,
          altKm,
        });
      } else {
        setIssObject(null);
      }
    };

    updateISS();

    // Only set up interval polling if we are live
    if (isLive) {
      intervalRef.current = setInterval(updateISS, POLL_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [observerLat, observerLon, observerAltM, time]);

  return { issPosition, issObject };
}
