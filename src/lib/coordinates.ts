/**
 * Coordinate utilities for Project Zenith.
 * RA/Dec parsing, formatting, and distance helpers.
 */

// ── RA / Dec parsing ──────────────────────────────────────────────────────────

/**
 * Parse RA from "HH MM SS.ss" or "HH:MM:SS.ss" format into decimal hours.
 * Supports partial inputs (e.g. "12:30"), defaulting missing components to 0.
 */
export function parseRA(ra: string): number {
  const parts = ra.trim().split(/[\s:]+/).map(Number);
  if (parts.length === 0 || isNaN(parts[0])) return NaN;
  
  const h = parts[0];
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h + m / 60 + s / 3600;
}

/**
 * Parse Declination from "+/-DD MM SS.s" or "+/-DD:MM:SS.s" into decimal degrees.
 * Supports partial inputs (e.g. "+45 12"), defaulting missing components to 0.
 */
export function parseDec(dec: string): number {
  const trimmed = dec.trim();
  const sign = trimmed.startsWith("-") ? -1 : 1;
  const parts = trimmed.replace(/^[+-]/, "").split(/[\s:]+/).map(Number);
  if (parts.length === 0 || isNaN(parts[0])) return NaN;
  
  const d = parts[0];
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return sign * (d + m / 60 + s / 3600);
}

// ── RA / Dec formatting ───────────────────────────────────────────────────────

/**
 * Format decimal RA hours as "HH h MM m SS.s s".
 */
export function formatRA(ra: number): string {
  const h = Math.floor(ra);
  const rem = (ra - h) * 60;
  const m = Math.floor(rem);
  const s = ((rem - m) * 60).toFixed(1);
  return `${h}h ${m}m ${s}s`;
}

/**
 * Format decimal Dec degrees as "+/-DD° MM' SS.s\"".
 */
export function formatDec(dec: number): string {
  const sign = dec < 0 ? "-" : "+";
  const abs = Math.abs(dec);
  const d = Math.floor(abs);
  const rem = (abs - d) * 60;
  const m = Math.floor(rem);
  const s = ((rem - m) * 60).toFixed(1);
  return `${sign}${d}° ${m}' ${s}"`;
}

// ── Distance helpers ──────────────────────────────────────────────────────────

const R_EARTH_KM = 6371.0;

/**
 * Haversine great-circle distance in km between two lat/lon points.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

/**
 * Slant range (km) from observer on Earth's surface to a satellite.
 * Uses the law of cosines in the observer-centred triangle.
 *
 * @param observerAltKm  Observer altitude above ellipsoid in km
 * @param satAltKm       Satellite altitude above ellipsoid in km
 * @param elevationDeg   Elevation angle from observer to satellite in degrees
 */
export function slantRange(
  observerAltKm: number,
  satAltKm: number,
  elevationDeg: number
): number {
  const Re = R_EARTH_KM;
  const elevRad = (elevationDeg * Math.PI) / 180;
  const ro = Re + observerAltKm;
  const rs = Re + satAltKm;
  // Law of cosines: rs² = ro² + d² - 2·ro·d·sin(elev) but rearranged for d
  const sinEl = Math.sin(elevRad);
  const d =
    -ro * sinEl + Math.sqrt(Math.max(0, rs ** 2 - ro ** 2 * (1 - sinEl ** 2)));
  return d;
}

/**
 * Human-readable distance string (km or ly).
 */
export function formatDist(km: number): string {
  const LY_KM = 9.461e12;
  if (km >= LY_KM) return `${(km / LY_KM).toFixed(2)} ly`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(0)}k km`;
  return `${km.toFixed(1)} km`;
}

/**
 * Convert Altitude and Azimuth (in degrees) to 3D Cartesian coordinates (X, Y, Z)
 * on a dome of a given radius.
 *
 * Convention:
 * - Center is (0, 0, 0)
 * - +Y is Zenith (straight up, Alt = 90)
 * - +Z is North (Alt = 0, Az = 0)
 * - +X is East (Alt = 0, Az = 90)
 */
export function altAzToXYZ(altDeg: number, azDeg: number, radius: number): [number, number, number] {
  const altRad = (altDeg * Math.PI) / 180;
  const azRad = (azDeg * Math.PI) / 180;

  const y = radius * Math.sin(altRad);
  const horiz = radius * Math.cos(altRad);
  const x = horiz * Math.sin(azRad);
  const z = -horiz * Math.cos(azRad); // flip to match compass N at -Z

  return [x, y, z];
}

/**
 * Convert Right Ascension (in decimal hours 0-24) and Declination (in degrees)
 * to 3D Cartesian coordinates (X, Y, Z) on a sphere of a given radius.
 *
 * Convention (Equatorial frame):
 * - Pole is +Y (Dec = +90)
 * - Equator plane is XZ
 * - RA = 0 is along +Z
 * - RA = 6h is along +X
 */
export function raDecToXYZ(raHours: number, decDeg: number, radius: number): [number, number, number] {
  const decRad = (decDeg * Math.PI) / 180;
  const raRad = (raHours * 15 * Math.PI) / 180; // 1 hour = 15 degrees

  const y = radius * Math.sin(decRad);
  const horiz = radius * Math.cos(decRad);
  const x = horiz * Math.sin(raRad);
  const z = horiz * Math.cos(raRad);

  return [x, y, z];
}

