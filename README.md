# Project Zenith 🌌

**Project Zenith** is a real-time, high-fidelity cosmic radar and sky tracking platform that maps satellites, planets, and naked-eye stars visible from any location on Earth. Combining interactive 3D planetariums, automated satellite orbital propagation, and AI-powered astronomical telemetry analysis, it brings the cosmos directly to the web.

---

## 🚀 Key Features

* **3D Interactive Terrestrial Globe**: Built on CesiumJS, allowing users to select observer positions globally, perform reverse-geocoding searches, and track satellite/ISS passes globally.
* **3D Celestial Sky Dome**: Responsive React Three Fiber (R3F) planetarium displaying stars, planets, and satellites in horizontal altitude/azimuth coordinates.
* **Temporal Timeline Scrubber**: Rewind or fast-forward the sky state ±24 hours. Transit trajectories and SGP4 satellite propagation are updated in real-time client-side without redownloading orbits.
* **Camera Focus Tracking**: An intelligent camera controller dynamically centers and interpolates (`lerp`) the 3D viewport around selected astronomical objects.
* **AI Telemetry Cards**: Generates context-aware, poetic, or scientific sky descriptions using Google's Gemini models, with a secure local store cache and automatic Wikipedia summaries as a fallback.
* **Robust Fail-safes**:
  * **Cesium Ion Token Fallback**: If Cesium Ion authentication fails (e.g. invalid token), the globe automatically defaults to offline local `NaturalEarthII` imagery and standard `EllipsoidTerrainProvider` modes.
  * **CelesTrak API Proxy & curl Fallback**: Restricts TLE fetching to the optimized `visual` group and falls back to server-side `curl.exe` shell execution if standard Node fetch calls are blocked by API rate limits.
  * **Webpack Cache Fix**: Configured Next.js webpack persistent cache bypasses to prevent asset chunk corruption during active hot-reloads.
* **Skyprint Export**: Generates custom vectors of the visible sky and exports PNG posters showing cardinal coordinates, telemetry, and celestial positions.

---

## 🛠️ Technology Stack

* **Core**: Next.js 14 (App Router, dynamic routes, API server proxies)
* **3D Renderers**: CesiumJS (terrestrial globe view), Three.js via `@react-three/fiber` & `@react-three/drei` (celestial dome view)
* **State Management**: Zustand (coordinates live time, observer context, UI modes, and selected entities)
* **Astronomical Calculations**: `astronomy-engine` (planets transit & coordinates), `satellite.js` (SGP4 satellite orbital propagation)
* **AI Model**: Google Gemini API via server route proxies
* **Styling**: TailwindCSS & Vanilla CSS (supporting modern glassmorphism UI layouts, animated radar screens, and dark-nebula gradients)

---

## 📂 Architecture

```
src/
├── app/
│   ├── layout.tsx            # Root layout (Cesium CSS + Font imports)
│   ├── page.tsx              # Landing: Interactive 3D globe selection view
│   └── sky/
│       └── page.tsx          # Sky view: Main planetarium layout (Member B territory)
│   └── api/
│       ├── celestrak/
│       │   └── route.ts      # TLE satellite proxy with curl fallback
│       ├── gemini/
│       │   └── route.ts      # Gemini API route with input validations
│       └── horizons/
│           └── route.ts      # NASA Horizons proxy with strict planet target allowlist
├── components/
│   ├── GlobeView.tsx         # CesiumJS globe wrapper with offline image fallbacks
│   ├── LocationSearch.tsx    # Geolocation lookup and Nominatim address search
│   ├── SkyCanvas.tsx         # R3F Celestial Dome with lerp CameraController
│   └── ui/
│       ├── HUDOverlay.tsx    # Sidebar layout and constellation/grid controls
│       ├── ModeToggle.tsx    # Skeuomorphic Immersive/Scientific toggle
│       ├── ObjectCard.tsx    # Telemetry card details and typewriter loading status
│       ├── SkyprintModal.tsx # Canvas vector exporter for celestial posters
│       ├── TelemetryPanel.tsx# Right-hand panel for azimuth, altitude, and transit alerts
│       └── Timeline.tsx      # Date range scrubber for temporal offsets
├── hooks/
│   ├── useZenith.ts          # Master hook coordinating all astronomical elements
│   ├── useISS.ts             # ISS tracking pipeline (5-second polling interval)
│   ├── usePlanets.ts         # JPL Horizon query scheduler with sequential fetch delays
│   ├── useSatellites.ts      # TLE resolver & SGP4 SGP orbital propagator
│   ├── useStars.ts           # HYG catalog renderer (mag < 5 filter)
│   └── useGemini.ts          # AI telemetry hooks with local Wikipedia fallbacks
├── lib/
│   ├── astronomy.ts          # astronomy-engine wrappers
│   ├── celestial.ts          # CelestialObject and data schemas
│   ├── coordinates.ts        # RA/Dec calculations, local sidereal conversions
│   ├── satellite.ts          # satellite.js SGP4 calculation helper
│   └── wikipedia.ts          # Wikipedia REST proxy client
└── scripts/
    ├── prepare_stars.ts      # Star catalog filter (HYG mag < 5 generator)
    └── copy-cesium-assets.mjs# Post-install asset bundle copy
```

---

## 🧭 Data Contract (`useZenith`)

The standard interface bridging the celestial data calculations and the rendering components.

### Hook Signature
```typescript
function useZenith(
  observerLat: number | null,   // Decimal degrees (-90 to 90)
  observerLon: number | null,   // Decimal degrees (-180 to 180)
  observerAltM?: number         // Altitude above ellipsoid in meters (default: 0)
): UseZenithResult
```

### Return Shape
```typescript
interface UseZenithResult {
  objects: CelestialObject[];   // List of visible celestial objects, sorted by altitude (descending)
  loading: boolean;             // True if sub-hooks are fetching dependencies
  error: string | null;         // Error banner text or null
  lastUpdated: string;          // ISO-8601 timestamp of last calculated frame
}
```

### CelestialObject Properties
```typescript
interface CelestialObject {
  id: string;                  // Unique key, e.g. "planet-mars", "star-11767", "sat-25544", "iss"
  name: string;                // Render display title
  category: "star" | "planet" | "satellite" | "iss" | "moon";
  az: number;                  // Azimuth [0, 360°), measured North -> East
  alt: number;                 // Altitude [-90, 90°], positive = above horizon
  ra: number;                  // Right Ascension in decimal hours [0, 24)
  dec: number;                 // Declination in decimal degrees
  distanceKm: number;          // Distance in kilometers
  magnitude: number;           // Apparent visual magnitude
  color: string;               // Category/Spectral CSS hex code
  nextTransit: string | null;  // ISO-8601 timestamp of next meridian crossing
  lat?: number;                // Geodetic latitude (satellites/ISS only)
  lon?: number;                // Geodetic longitude (satellites/ISS only)
  altKm?: number;              // Altitude above ellipsoid in km (satellites/ISS only)
}
```

---

## 📡 Data Sources

| Provider | Purpose | Rate-Limits | Cache / Optimization |
|---|---|---|---|
| [open-notify.org](https://api.open-notify.org/iss-now.json) | Live ISS Location | ~1 req/sec | 5-second interval poll |
| [CelesTrak](https://celestrak.org) | Active Satellites (TLEs) | Variable | Local storage / Visual group filter |
| [NASA JPL Horizons](https://ssd.jpl.nasa.gov/api/horizons.api) | Planets (RA/Dec) | ~10 req/hour | Sequential 300ms call delays |
| [HYG Database](https://github.com/astronexus/HYG-Database) | Star Catalog | One-time | Filtered static JSON (Mag < 5) |
| [Nominatim](https://nominatim.openstreetmap.org) | Reverse Geocoding | 1 req/sec | Zustand coordinate cache |

---

## ⚙️ Environment Variables

Add the following environment variables to your `.env.local` configuration:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Public Client | Cesium access token (Terrain, World Imagery fallback) |
| `GEMINI_API_KEY` | Server Side | Google AI developer API key (poetic/scientific text generation) |

---

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
npm install
# Post-install script automatically mirrors CesiumJS modules into public/cesium/
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### 3. Generate Star Catalog
```bash
npm run prepare-stars
# Downloads the HYG catalog, filters for naked-eye visibility, and outputs to public/data/
```

### 4. Launch Development Server
```bash
npm run dev
# Server initiates on http://localhost:3000
```
