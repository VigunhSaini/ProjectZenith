# Project Zenith 🌌

**Real-Time Cosmic Radar** — a live sky tracking platform showing satellites, planets, and stars visible from any location on Earth.

## Team Structure

| Member | Ownership |
|--------|-----------|
| **Member A** | CesiumJS globe, location selection, celestial data pipeline (`useZenith`) |
| **Member B** | Sky view UI, AR overlays, AI sky descriptions (reads from `useZenith`) |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A free [Cesium Ion](https://ion.cesium.com) account (for terrain + imagery)

### 2. Install Dependencies

```bash
npm install
# postinstall automatically copies Cesium assets → public/cesium/
```

### 3. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your NEXT_PUBLIC_CESIUM_ION_TOKEN
```

### 4. Generate Star Data

```bash
npm run prepare-stars
# Downloads HYG v3.8, filters to mag < 5, outputs public/data/hyg_stars.json
```

### 5. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## `useZenith` — Data Contract

The primary interface between Member A (data) and Member B (UI).

### Signature

```typescript
function useZenith(
  observerLat: number | null,   // Decimal degrees (-90 to 90)
  observerLon: number | null,   // Decimal degrees (-180 to 180)
  observerAltM?: number         // Altitude above ellipsoid in metres (default 0)
): UseZenithResult
```

### Return Type

```typescript
interface UseZenithResult {
  objects: CelestialObject[];   // All above-horizon objects, sorted alt desc
  loading: boolean;             // True while any sub-hook loads
  error: string | null;         // First error from any source, or null
  lastUpdated: string;          // ISO-8601 timestamp of last render
}
```

### CelestialObject Shape

```typescript
interface CelestialObject {
  id: string;              // e.g. "planet-mars", "star-11767", "sat-25544", "iss"
  name: string;            // Display name
  category: "star" | "planet" | "satellite" | "iss" | "moon";
  az: number;              // Azimuth [0, 360°), measured N→E
  alt: number;             // Altitude [-90, 90°]; above-horizon = positive
  ra: number;              // Right Ascension in decimal hours [0, 24)
  dec: number;             // Declination in decimal degrees
  distanceKm: number;      // Distance in km
  magnitude: number;       // Apparent visual magnitude
  color: string;           // CSS hex (spectral / category color)
  nextTransit: string | null;  // ISO-8601 of next meridian crossing
  lat?: number;            // Geodetic lat (satellites/ISS only)
  lon?: number;            // Geodetic lon (satellites/ISS only)
  altKm?: number;          // Altitude above ellipsoid in km (satellites/ISS only)
}
```

### Usage Example (Member B)

```tsx
import { useZenith } from "@/hooks/useZenith";

export default function SkyView({ lat, lon }: { lat: number; lon: number }) {
  const { objects, loading, error, lastUpdated } = useZenith(lat, lon);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <ul>
      {objects.map(obj => (
        <li key={obj.id}>
          {obj.name} — Alt: {obj.alt.toFixed(1)}° Az: {obj.az.toFixed(1)}°
        </li>
      ))}
    </ul>
  );
}
```

---

## Data Sources

| Source | Data | Rate Limit | Cache |
|--------|------|-----------|-------|
| [open-notify.org](https://api.open-notify.org/iss-now.json) | ISS position | ~1 req/s | None (5s poll) |
| [CelesTrak](https://celestrak.org/gp.php?GROUP=active&FORMAT=tle) | Active satellite TLEs | Reasonable | 24h localStorage |
| [NASA JPL Horizons](https://ssd.jpl.nasa.gov/api/horizons.api) | Planet RA/Dec | ~10 req/hr | 10 min in-memory |
| [HYG Database](https://github.com/astronexus/HYG-Database) | ~119k stars | One-time download | Static JSON |
| [Nominatim](https://nominatim.openstreetmap.org) | Geocoding | 1 req/s | None |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout (Cesium CSS + Inter font)
│   ├── page.tsx            # Landing: full-screen globe
│   └── sky/
│       └── page.tsx        # Sky view: useZenith consumer (Member B territory)
├── components/
│   ├── GlobeView.tsx       # CesiumJS globe (dynamic import, SSR disabled)
│   ├── LocationSearch.tsx  # Nominatim search + geolocation
│   └── ISSMarker.tsx       # Cesium entity for ISS position
├── hooks/
│   ├── useZenith.ts        # Master hook (public API)
│   ├── useISS.ts           # ISS position (5s poll)
│   ├── useSatellites.ts    # Active satellites SGP4 (24h cache)
│   ├── usePlanets.ts       # 7 planets from Horizons (10min cache)
│   └── useStars.ts         # Naked-eye stars from HYG JSON
├── lib/
│   ├── celestial.ts        # CelestialObject interface
│   ├── coordinates.ts      # RA/Dec, haversine, slant range
│   ├── satellite.ts        # satellite.js wrappers
│   └── astronomy.ts        # astronomy-engine wrappers
└── scripts/
    ├── prepare_stars.ts    # One-time star data generator
    └── copy-cesium-assets.mjs  # Postinstall Cesium copy
```

---

## Known Limitations / TODOs

- **Moon**: `useZenith` category includes `"moon"` but no `useMoon` hook is implemented yet. Member A can add it using `astronomy-engine`'s `GeoMoon()`.
- **ISS RA/Dec**: ISS is fast-moving; RA/Dec is set to 0/0 in the current implementation (only Az/Alt is meaningful for ISS).
- **Planet distances**: Horizons quantity `1` (RA/Dec) doesn't include distance; planet `distanceKm` is approximate (1 AU order of magnitude).
- **Satellite magnitudes**: Hard-coded to 3.0 (actual apparent magnitude calculation requires additional phase angle data).
- **Horizons rate limits**: If all 7 planet requests fire simultaneously on first load, this can hit soft rate limits. Consider staggering with `setTimeout`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Yes | Cesium Ion access token for terrain + imagery |
| `GEMINI_API_KEY` | Member B | Google Gemini API for AI sky descriptions |
