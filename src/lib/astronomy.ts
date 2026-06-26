/**
 * Astronomical computation helpers using astronomy-engine.
 */

import * as Astronomy from "astronomy-engine";

export interface AltAz {
  az: number; // degrees [0, 360)
  alt: number; // degrees [-90, 90]
}

/**
 * Convert RA/Dec (J2000) to local Altitude/Azimuth for a given observer and time.
 *
 * @param ra   Right Ascension in decimal hours
 * @param dec  Declination in decimal degrees
 * @param lat  Observer latitude in degrees
 * @param lon  Observer longitude in degrees (east positive)
 * @param date Observation time
 */
export function raDecToAltAz(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date
): AltAz {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const time = Astronomy.MakeTime(date);

  // astronomy-engine Horizon expects RA in hours and Dec in degrees
  const hor = Astronomy.Horizon(time, observer, ra, dec, "normal");

  return {
    az: hor.azimuth,
    alt: hor.altitude,
  };
}

/**
 * Get Local Sidereal Time (LST) in decimal hours (0 to 24)
 * for a given date and longitude (east positive).
 */
export function getLST(date: Date, lon: number): number {
  const astTime = Astronomy.MakeTime(date);
  const gmst = Astronomy.SiderealTime(astTime);
  return (gmst + lon / 15 + 24) % 24;
}

/**
 * Find the next meridian transit (upper culmination) of a fixed RA/Dec object
 * within the next 24 hours from `fromDate`. Returns null if none found.
 *
 * Uses 1-minute step with sub-minute bisection search — astronomy-engine's SearchHourAngle only
 * works on built-in solar system bodies, not arbitrary RA/Dec coordinates.
 */
export function nextTransit(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  fromDate: Date
): Date | null {
  // Suppress unused parameter warnings — dec and lat aren't used in LST calc
  void dec;
  void lat;

  // Search in 1-minute steps over 24 hours
  const stepMs = 60 * 1000;
  const maxMs = 24 * 3600 * 1000;

  let prevHA: number | null = null;
  for (let dt = 0; dt <= maxMs; dt += stepMs) {
    const t = new Date(fromDate.getTime() + dt);
    const lst = getLST(t, lon);
    // Hour Angle = LST - RA, normalised to [-12, 12)
    let ha = lst - ra;
    if (ha > 12) ha -= 24;
    if (ha < -12) ha += 24;

    if (prevHA !== null && prevHA < 0 && ha >= 0) {
      // Negative→positive HA zero crossing = upper transit
      // Bisection search loop over the 1-minute step window to refine transit time
      let low = fromDate.getTime() + dt - stepMs;
      let high = fromDate.getTime() + dt;

      for (let i = 0; i < 10; i++) { // 10 iterations yields sub-second accuracy
        const mid = (low + high) / 2;
        const midLst = getLST(new Date(mid), lon);
        let midHa = midLst - ra;
        if (midHa > 12) midHa -= 24;
        if (midHa < -12) midHa += 24;

        if (midHa < 0) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return new Date((low + high) / 2);
    }
    prevHA = ha;
  }

  return null;
}
