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
    if (!posVel.position || typeof posVel.position === "boolean") return null;

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
    if (!posVel.position || typeof posVel.position === "boolean") return FAILURE;

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
