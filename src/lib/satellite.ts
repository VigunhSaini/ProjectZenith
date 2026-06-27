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
  ra?: number;
  dec?: number;
}

const FAILURE: AltAzResult = { az: 0, alt: -1, rangeSat: 0, ra: 0, dec: 0 };
const RAD_TO_DEG = 180 / Math.PI;

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

    const pos = posVel.position as satellite.EciVec3<number>;
    const d = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const dec = Math.asin(pos.z / d) * (180 / Math.PI);
    let raRad = Math.atan2(pos.y, pos.x);
    if (raRad < 0) raRad += 2 * Math.PI;
    const ra = raRad * (12 / Math.PI);

    return {
      az: ((lookAngles.azimuth * RAD_TO_DEG) + 360) % 360,
      alt: lookAngles.elevation * RAD_TO_DEG,
      rangeSat: lookAngles.rangeSat,
      ra,
      dec,
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
      const altDeg = lookAngles.elevation * RAD_TO_DEG;

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

/**
 * Safely parse TLE lines into a satellite record.
 * Returns null if parsing fails.
 */
export function parseTleToSatrec(tleLine1: string, tleLine2: string): satellite.SatRec | null {
  try {
    return satellite.twoline2satrec(tleLine1, tleLine2);
  } catch {
    return null;
  }
}

export interface PropagatedSatResult {
  alt: number;
  az: number;
  rangeSat: number;
  geo: GeodeticPosition | null;
  ra: number;
  dec: number;
}

/**
 * Propagate a pre-parsed satellite record, compute look angles, and return positions.
 * Geodetic coordinates are only calculated if the satellite is above 10 degrees elevation.
 */
export function propagateSatrec(
  satrec: satellite.SatRec,
  observerLat: number,
  observerLon: number,
  observerAltM: number,
  date: Date
): PropagatedSatResult | null {
  try {
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position || typeof posVel.position === "boolean") return null;

    const gmst = satellite.gstime(date);
    const observerGd: satellite.GeodeticLocation = {
      latitude: satellite.degreesToRadians(observerLat),
      longitude: satellite.degreesToRadians(observerLon),
      height: observerAltM / 1000,
    };

    const lookAngles = satellite.ecfToLookAngles(
      observerGd,
      satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst)
    );

    const alt = lookAngles.elevation * RAD_TO_DEG;
    const az = ((lookAngles.azimuth * RAD_TO_DEG) + 360) % 360;

    // Only compute geodetic position if it passes the 10 degree visibility limit to save CPU
    let geo: GeodeticPosition | null = null;
    if (alt >= 10) {
      const geoLoc = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
      geo = {
        lat: satellite.degreesLat(geoLoc.latitude),
        lon: satellite.degreesLong(geoLoc.longitude),
        altKm: geoLoc.height,
      };
    }

    const pos = posVel.position as satellite.EciVec3<number>;
    const d = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const dec = Math.asin(pos.z / d) * (180 / Math.PI);
    let raRad = Math.atan2(pos.y, pos.x);
    if (raRad < 0) raRad += 2 * Math.PI;
    const ra = raRad * (12 / Math.PI);

    return {
      alt,
      az,
      rangeSat: lookAngles.rangeSat,
      geo,
      ra,
      dec,
    };
  } catch {
    return null;
  }
}

/**
 * Compute the approximate visual magnitude of a satellite.
 * Standard LEO satellites are typically magnitude 5.0 to 6.5.
 * Brighter ones (like ISS) are around -1.3 standard magnitude.
 * Larger or older payloads might range between 3.5 and 5.5.
 * Small cubesats or debris are around 7.0 to 9.0.
 *
 * We estimate the standard magnitude based on NORAD ID or name,
 * and adjust for distance (slant range).
 */
export function calculateSatelliteMagnitude(rangeKm: number, noradIdOrName: string): number {
  let stdMag = 6.0;

  const idOrNameUpper = noradIdOrName.toUpperCase();
  if (idOrNameUpper.includes("ISS") || idOrNameUpper.includes("25544")) {
    stdMag = -1.3;
  } else if (idOrNameUpper.includes("STARLINK")) {
    // Starlink satellites are moderately bright
    stdMag = 5.2;
  } else if (idOrNameUpper.includes("HST") || idOrNameUpper.includes("HUBBLE") || idOrNameUpper.includes("20580")) {
    stdMag = 1.5;
  } else if (idOrNameUpper.includes("TIANGONG") || idOrNameUpper.includes("CSS") || idOrNameUpper.includes("49258")) {
    stdMag = 1.5;
  } else if (idOrNameUpper.includes("SKYNET")) {
    // Skynet geosync/comms are standard mag ~6.0
    stdMag = 6.2;
  } else {
    // Deterministic standard magnitude based on NORAD ID hash (between 5.5 and 7.5)
    const numMatch = noradIdOrName.match(/\d+/);
    const idNum = numMatch ? parseInt(numMatch[0], 10) : 0;
    stdMag = 5.5 + ((idNum % 20) / 20) * 2.0; // 5.5 to 7.5
  }

  // Slant range visual magnitude formula:
  // V = Vstd + 5 * log10(range / 1000)
  const safeRange = Math.max(10, rangeKm);
  const mag = stdMag + 5 * Math.log10(safeRange / 1000);

  // Clamp visual magnitude to a realistic range (-6 to 10)
  return Math.round(Math.max(-6, Math.min(10, mag)) * 100) / 100;
}

