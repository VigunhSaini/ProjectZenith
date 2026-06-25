/**
 * TLE → geodetic / alt-az via satellite.js (SGP4/SDP4).
 */

import * as satellite from "satellite.js";

export interface GeodeticPosition {
  lat: number; // degrees
  lon: number; // degrees
  altKm: number; // km above ellipsoid
}

export interface AltAzResult {
  az: number; // degrees [0, 360)
  alt: number; // degrees [-90, 90]
  rangeSat: number; // km slant range
}

const FAILURE: AltAzResult = { az: 0, alt: -1, rangeSat: 0 };

/**
 * Propagate a TLE to geodetic position at the given date.
 * Returns null on propagation failure.
 */
export function tleToGeodetic(
  tleLine1: string,
  tleLine2: string,
  date: Date
): GeodeticPosition | null {
  try {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position || typeof posVel.position === "boolean") return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);

    return {
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      altKm: geo.height,
    };
  } catch {
    return null;
  }
}

/**
 * Compute azimuth, altitude, and slant range from observer to satellite at given date.
 * Returns FAILURE sentinel on propagation error.
 */
export function tleToAltAz(
  tleLine1: string,
  tleLine2: string,
  observerLat: number,
  observerLon: number,
  observerAltM: number,
  date: Date
): AltAzResult {
  try {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position || typeof posVel.position === "boolean") return FAILURE;

    const gmst = satellite.gstime(date);
    const observerGd: satellite.GeodeticLocation = {
      latitude: satellite.degreesToRadians(observerLat),
      longitude: satellite.degreesToRadians(observerLon),
      height: observerAltM / 1000, // satellite.js expects km
    };

    const lookAngles = satellite.ecfToLookAngles(
      observerGd,
      satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst)
    );

    return {
      az: (satellite.degreesLat(lookAngles.azimuth) + 360) % 360,
      alt: satellite.degreesLat(lookAngles.elevation),
      rangeSat: lookAngles.rangeSat,
    };
  } catch {
    return FAILURE;
  }
}

/**
 * Find the next elevation peak (approximate transit) for a satellite
 * by propagating forward in 15-second steps over a 2-hour window.
 *
 * Returns the Date of the highest predicted elevation, or null on failure.
 * Only called lazily (on object selection) — NOT during bulk load.
 */
export function nextSatelliteTransit(
  tleLine1: string,
  tleLine2: string,
  observerLat: number,
  observerLon: number,
  observerAltM: number,
  fromDate: Date
): Date | null {
  try {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const observerGd: satellite.GeodeticLocation = {
      latitude: satellite.degreesToRadians(observerLat),
      longitude: satellite.degreesToRadians(observerLon),
      height: observerAltM / 1000,
    };

    const STEP_MS = 15_000;         // 15-second resolution
    const WINDOW_MS = 2 * 3600_000; // 2-hour look-ahead

    let peakAlt = -Infinity;
    let peakDate: Date | null = null;
    let wasAboveHorizon = false;

    for (let dt = 0; dt <= WINDOW_MS; dt += STEP_MS) {
      const t = new Date(fromDate.getTime() + dt);
      const posVel = satellite.propagate(satrec, t);
      if (!posVel || !posVel.position || typeof posVel.position === "boolean") continue;

      const gmst = satellite.gstime(t);
      const lookAngles = satellite.ecfToLookAngles(
        observerGd,
        satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst)
      );
      const altDeg = satellite.degreesLat(lookAngles.elevation);

      if (altDeg > 0) {
        wasAboveHorizon = true;
        if (altDeg > peakAlt) {
          peakAlt = altDeg;
          peakDate = t;
        }
      } else if (wasAboveHorizon) {
        // Dropped below horizon after a pass — we found the peak
        break;
      }
    }

    return peakDate;
  } catch {
    return null;
  }
}
