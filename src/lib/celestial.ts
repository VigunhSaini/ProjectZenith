/**
 * Shared CelestialObject interface — Project Zenith data contract.
 * Both Member A (data pipeline) and Member B (sky view) consume this shape.
 */

export type CelestialCategory =
  | "star"
  | "planet"
  | "satellite"
  | "iss"
  | "moon";

export interface CelestialObject {
  /** Unique, stable identifier e.g. "planet-mars", "star-11767", "iss", "sat-25544" */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Category for rendering decisions */
  category: CelestialCategory;

  // ── Horizontal coordinates (observer-centric) ──────────────────────────────
  /** Azimuth in degrees [0, 360), measured N→E */
  az: number;
  /** Altitude in degrees [-90, 90]; objects below horizon have alt < 0 */
  alt: number;

  // ── Equatorial coordinates ─────────────────────────────────────────────────
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, 90] */
  dec: number;

  // ── Distance ───────────────────────────────────────────────────────────────
  /** Distance in km. For stars, converted from parsecs. For ISS, slant range. */
  distanceKm: number;

  // ── Visual properties ──────────────────────────────────────────────────────
  /** Apparent visual magnitude */
  magnitude: number;
  /** CSS hex color derived from spectral class / B-V index */
  color: string;

  // ── Transit ────────────────────────────────────────────────────────────────
  /** ISO-8601 datetime string of next meridian transit (best effort) */
  nextTransit: string | null;

  // ── Optional extras ────────────────────────────────────────────────────────
  /** For satellites / ISS: geodetic latitude */
  lat?: number;
  /** For satellites / ISS: geodetic longitude */
  lon?: number;
  /** For satellites / ISS: altitude above ellipsoid in km */
  altKm?: number;
}
