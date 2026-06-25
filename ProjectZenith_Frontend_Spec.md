# Project Zenith: The Celestial Eye
## Frontend Specification

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack Detail](#2-tech-stack-detail)
3. [Screen Architecture](#3-screen-architecture)
4. [Screen 1 — Landing Globe](#4-screen-1--landing-globe)
5. [Screen 2 — Sky View](#5-screen-2--sky-view)
6. [The Two Modes](#6-the-two-modes)
7. [The Skeuomorphic Toggle](#7-the-skeuomorphic-toggle)
8. [Object Detail Panel](#8-object-detail-panel)
9. [Skyprint Feature](#9-skyprint-feature)
10. [Timeline Scrubber](#10-timeline-scrubber)
11. [Data Flow to UI](#11-data-flow-to-ui)
12. [Animations & Transitions](#12-animations--transitions)
13. [Component Tree](#13-component-tree)
14. [Design System](#14-design-system)
15. [Performance Strategy](#15-performance-strategy)

---

## 1. Project Structure

```
project-zenith/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing route
│   ├── sky/
│   │   └── page.tsx              # Sky view route
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── globe/
│   │   ├── CesiumGlobe.tsx       # CesiumJS 3D Earth
│   │   └── LocationPicker.tsx    # Click-to-select on globe
│   │
│   ├── sky/
│   │   ├── SkyCanvas.tsx         # React Three Fiber root canvas
│   │   ├── StarField.tsx         # 120k particle star system
│   │   ├── Planets.tsx           # Solar system body meshes
│   │   ├── Satellites.tsx        # Live satellite dots + trails
│   │   ├── ISS.tsx               # ISS with special highlight
│   │   ├── Constellations.tsx    # Constellation line drawings
│   │   └── ZenithMarker.tsx      # Crosshair at 90° overhead
│   │
│   ├── ui/
│   │   ├── ModeToggle.tsx        # Skeuomorphic flip switch
│   │   ├── Topbar.tsx            # Navigation + live clock
│   │   ├── SearchBar.tsx         # City/coordinate input
│   │   ├── ObjectCard.tsx        # Immersive click panel
│   │   ├── TelemetryPanel.tsx    # Scientific click panel
│   │   ├── Timeline.tsx          # Past/future scrubber
│   │   ├── HUDOverlay.tsx        # Scientific mode HUD
│   │   └── SkyprintModal.tsx     # Downloadable sky poster
│   │
│   └── shared/
│       ├── Nebula.tsx            # CSS background nebula layers
│       └── TransitionOverlay.tsx # Globe → Sky animation
│
├── hooks/
│   ├── useSatellites.ts          # CelesTrak fetch + satellite.js
│   ├── useISS.ts                 # OpenNotify polling
│   ├── usePlanets.ts             # NASA Horizons fetch
│   ├── useStars.ts               # HYG database loader
│   ├── useZenith.ts              # Astronomy Engine transforms
│   ├── useGemini.ts              # AI description fetcher
│   └── useNow.ts                 # Live clock (1s interval)
│
├── lib/
│   ├── satellite.ts              # satellite.js wrappers
│   ├── astronomy.ts              # Astronomy Engine wrappers
│   ├── coordinates.ts            # RA/Dec → Alt/Az conversion
│   ├── gemini.ts                 # Gemini API client
│   └── wikipedia.ts              # Wikipedia API client
│
├── store/
│   └── zenith.ts                 # Zustand global state
│
└── data/
    └── hygdata_v3.csv            # HYG star database (static)
```

---

## 2. Tech Stack Detail

### Core Framework
```
Next.js 14 (App Router)
React 18
TypeScript
```
Next.js handles routing between the landing globe and sky view. Server components for initial data fetching (star database, TLE files). Client components for all interactive and 3D elements.

### 3D Rendering
```
CesiumJS                → Landing globe only
React Three Fiber       → Sky view only
@react-three/drei       → Helpers (Stars, OrbitControls, etc.)
Three.js                → Underlying engine for R3F
```
These two never run simultaneously. CesiumJS unmounts when transitioning to sky view. React Three Fiber mounts after.

### UI & Animation
```
Framer Motion           → All page + component transitions
Tailwind CSS            → Panel and overlay styling
```

### Data & Math
```
satellite.js            → TLE orbital propagation (client-side)
astronomy-engine        → Coordinate transforms (client-side)
Zustand                 → Global state (location, mode, selected object, time)
```

### AI
```
Google Gemini API       → Educational descriptions
Wikipedia REST API      → Fallback descriptions
```

---

## 3. Screen Architecture

```
┌─────────────────────────────────────────────────────┐
│                 SCREEN 1: LANDING                    │
│                                                      │
│   CesiumJS Globe (full screen)                       │
│   + Search bar overlay                               │
│   + Mode toggle overlay                              │
│   + Quick location chips                             │
└──────────────────┬──────────────────────────────────┘
                   │ User selects location
                   ▼
┌─────────────────────────────────────────────────────┐
│              TRANSITION ANIMATION                    │
│   CesiumJS camera zooms to selected point           │
│   Framer Motion fade: Globe out → Sky in            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                SCREEN 2: SKY VIEW                    │
│                                                      │
│   React Three Fiber Canvas (full screen)            │
│   ├── StarField (particles)                          │
│   ├── Planets (meshes)                               │
│   ├── Satellites (animated points)                   │
│   ├── ISS (highlighted)                              │
│   ├── Constellations (line segments)                 │
│   └── ZenithMarker (crosshair)                       │
│                                                      │
│   UI Overlay (Framer Motion, mode-aware)            │
│   ├── Topbar                                         │
│   ├── ModeToggle                                     │
│   ├── HUDOverlay (scientific only)                   │
│   └── Timeline                                       │
└──────────────────┬──────────────────────────────────┘
                   │ User clicks object
                   ▼
┌─────────────────────────────────────────────────────┐
│              SCREEN 3: OBJECT DETAIL                 │
│   Immersive → card slides up from bottom            │
│   Scientific → panel slides in from right           │
└─────────────────────────────────────────────────────┘
```

---

## 4. Screen 1 — Landing Globe

### What CesiumJS Renders
- Photorealistic Earth using Bing Maps satellite imagery
- Real terrain elevation (Cesium World Terrain)
- City lights layer on the night side
- Atmosphere glow at the limb
- Cloud layer overlay
- ISS position dot orbiting in real time (from OpenNotify)

### UI Overlays on Top of Globe
```
┌────────────────────────────────────────────────────┐
│  PROJECT ZENITH                    [IMMERSIVE ⟵ ⟶ SCIENTIFIC] │
├────────────────────────────────────────────────────┤
│                                                    │
│              [  CesiumJS Globe  ]                  │
│                                                    │
│   ┌──────────────────────────────┐  ┌──────────┐  │
│   │ 🔍 Enter city or coords...   │  │ LOOK UP ↑│  │
│   └──────────────────────────────┘  └──────────┘  │
│                                                    │
│   New Delhi   Mumbai   Tokyo   London   New York   │
│                                                    │
│   📍 Use My Location                               │
└────────────────────────────────────────────────────┘
```

### CesiumJS Setup
```typescript
// components/globe/CesiumGlobe.tsx

const viewer = new Cesium.Viewer('cesium-container', {
  terrainProvider: Cesium.createWorldTerrain(),
  imageryProvider: new Cesium.BingMapsImageryProvider({
    url: 'https://dev.virtualearth.net',
    mapStyle: Cesium.BingMapsStyle.AERIAL,
  }),
  skyBox: new Cesium.SkyBox({ sources: skyboxSources }),
  skyAtmosphere: new Cesium.SkyAtmosphere(),
  scene3DOnly: true,
  animation: false,
  timeline: false,
  fullscreenButton: false,
});

// Click handler — picks lat/lon from globe surface
viewer.screenSpaceEventHandler.setInputAction((click) => {
  const cartesian = viewer.camera.pickEllipsoid(click.position);
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  handleLocationSelect({ lat, lon });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
```

---

## 5. Screen 2 — Sky View

### The Celestial Sphere Concept

The sky view is a React Three Fiber scene. The camera is placed at the origin (0,0,0) representing the user standing on Earth. Every object is placed on an invisible sphere around the camera at a position calculated from its **altitude** and **azimuth**.

```
Altitude 90°  = directly above camera = top of sphere
Altitude 0°   = horizon               = equator of sphere
Azimuth 0°    = North
Azimuth 90°   = East
Azimuth 180°  = South
Azimuth 270°  = West
```

Converting Alt/Az to 3D XYZ position:
```typescript
// lib/coordinates.ts

export function altAzToXYZ(alt: number, az: number, radius: number) {
  const altRad = (alt * Math.PI) / 180;
  const azRad  = (az  * Math.PI) / 180;

  // In Three.js: Y is up, Z is toward viewer, X is right
  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  return { x, y, z };
}
```

### What's Inside the Three.js Scene

#### StarField
```typescript
// components/sky/StarField.tsx
// Uses @react-three/drei <Stars> with HYG data

import { Stars } from '@react-three/drei';

// 120,000 stars from HYG database
// Each star positioned using its actual RA/Dec converted to Alt/Az
// Colour based on spectral type (O=blue, G=yellow, M=red)
// Size based on magnitude (brighter = larger point)
```

#### Satellites
```typescript
// components/sky/Satellites.tsx

// Every frame:
// 1. Get current timestamp (or scrubber time)
// 2. For each satellite TLE: satellite.js computes lat/lon/alt
// 3. Astronomy Engine converts to Alt/Az for user location
// 4. If altitude > 0 (above horizon): render dot at altAzToXYZ position
// 5. Store last N positions as trail line

// Fast-moving objects (ISS, LEO sats) have visible trails
// Each satellite is a <mesh> with <sphereGeometry> and emissive material
```

#### Planets
```typescript
// components/sky/Planets.tsx

// Planet positions from NASA Horizons (fetched on load for current day)
// Converted to Alt/Az via Astronomy Engine
// Rendered as larger glowing spheres with custom shaders
// Jupiter: banded texture, orange-brown
// Mars: reddish, slightly smaller
// Venus: bright white, near horizon
```

#### Constellations
```typescript
// components/sky/Constellations.tsx

// Constellation data: JSON file with star pairs (line segments)
// Each pair: two HYG star IDs
// Draw <Line> between their 3D positions on the celestial sphere
// Opacity: 0.15 immersive, 0.35 scientific
// Labels: only visible in scientific mode
```

### Three.js Scene Setup
```typescript
// components/sky/SkyCanvas.tsx

<Canvas
  camera={{ position: [0, 0, 0], fov: 75 }}
  style={{ background: '#010208' }}
>
  <ambientLight intensity={0.01} />

  {/* Star field — always visible */}
  <StarField stars={hyg120k} userLocation={location} time={currentTime} />

  {/* Solar system */}
  <Planets positions={planetPositions} mode={mode} />

  {/* Live satellites */}
  <Satellites tleData={tleData} userLocation={location} time={currentTime} />

  {/* ISS special */}
  <ISS position={issPosition} userLocation={location} />

  {/* Constellation lines */}
  <Constellations visible={showConstellations} mode={mode} />

  {/* Zenith crosshair at top */}
  <ZenithMarker />

  {/* Camera stays at origin, user looks around */}
  <OrbitControls
    enableZoom={false}
    enablePan={false}
    rotateSpeed={-0.3}
    minPolarAngle={0}
    maxPolarAngle={Math.PI / 2}  // Can't look below horizon
  />
</Canvas>
```

---

## 6. The Two Modes

The 3D scene is **identical** in both modes. Only the React UI layer overlaid on top changes.

### State
```typescript
// store/zenith.ts (Zustand)

interface ZenithStore {
  mode: 'immersive' | 'scientific';
  location: { lat: number; lon: number; name: string } | null;
  selectedObject: CelestialObject | null;
  currentTime: Date;
  setMode: (mode: 'immersive' | 'scientific') => void;
  setLocation: (loc: Location) => void;
  setSelectedObject: (obj: CelestialObject | null) => void;
  setCurrentTime: (t: Date) => void;
}
```

### Immersive Mode UI Layer
```
┌──────────────────────────────────────────────────────┐
│  ← Globe  |  New Delhi            [IM ⟵⟶ SCI] [✦]   │  ← minimal topbar
├──────────────────────────────────────────────────────┤
│                                                      │
│         [  3D SPACE SCENE — full screen  ]           │
│               objects glow and pulse                 │
│              no labels unless hovered                │
│                                                      │
├──────────────────────────────────────────────────────┤
│  PAST [─────────●──────────────────────────] FUTURE  │  ← subtle timeline
└──────────────────────────────────────────────────────┘
```

### Scientific Mode UI Layer
```
┌──────────────────────────────────────────────────────┐
│  ← Globe | New Delhi | 10 OBJ 3 LEO | LIVE 22:41  [IM ⟵⟶ SCI]  │
├──────────────────────────────────────────────────────┤
│                              │                       │
│   [  3D SCENE + grid  ]      │   OVERHEAD (10)       │
│                              │   ─────────────────   │
│   • all objects labelled     │   ISS        02:14    │
│   • altitude rings visible   │   SL-4821    00:47    │
│   • coordinate readouts      │   Jupiter    Active   │
│   • zenith crosshair         │   Mars       03:22    │
│                              │   Sirius     03:41    │
│   corner: LST / EPOCH / AZ   │   ...                 │
├──────────────────────────────┴───────────────────────┤
│  PAST [──────────●─────────────────] FUTURE [SKYPRINT]│
└──────────────────────────────────────────────────────┘
```

### Mode Transition with Framer Motion
```typescript
// The overlay morphs — scene stays
<AnimatePresence mode="wait">
  {mode === 'immersive' ? (
    <motion.div key="immersive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <ImmersiveOverlay />
    </motion.div>
  ) : (
    <motion.div key="scientific"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <ScientificOverlay />
    </motion.div>
  )}
</AnimatePresence>
```

---

## 7. The Skeuomorphic Toggle

The toggle is a physical-feeling flip switch. It uses CSS gradients and box shadows to create depth, and Framer Motion for the spring animation.

```typescript
// components/ui/ModeToggle.tsx

export function ModeToggle() {
  const { mode, setMode } = useZenithStore();
  const isImmersive = mode === 'immersive';

  return (
    <div className="flex items-center gap-3">
      <span style={{ color: isImmersive ? '#4078ff' : '#445566' }}>
        IMMERSIVE
      </span>

      {/* The switch track */}
      <motion.div
        onClick={() => setMode(isImmersive ? 'scientific' : 'immersive')}
        style={{
          width: 60,
          height: 30,
          borderRadius: 15,
          cursor: 'pointer',
          position: 'relative',
          // Inset shadow creates the recessed track look
          background: 'linear-gradient(180deg, #0a0a1a, #15152a)',
          boxShadow: `
            inset 0 2px 5px rgba(0,0,0,0.7),
            inset 0 -1px 2px rgba(255,255,255,0.04),
            0 0 12px ${isImmersive ? 'rgba(64,120,255,0.3)' : 'rgba(0,229,176,0.3)'}
          `,
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Knob */}
        <motion.div
          animate={{ left: isImmersive ? 3 : 31 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            top: 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: isImmersive
              ? 'linear-gradient(145deg, #6090ff, #3060cc)'
              : 'linear-gradient(145deg, #00ffcc, #00a880)',
            boxShadow: `
              0 2px 6px rgba(0,0,0,0.5),
              0 0 12px ${isImmersive ? 'rgba(64,120,255,0.7)' : 'rgba(0,229,176,0.7)'},
              inset 0 1px 3px rgba(255,255,255,0.35)
            `,
          }}
        >
          {/* Shine on knob */}
          <div style={{
            position: 'absolute',
            top: 4, left: 5,
            width: 9, height: 5,
            borderRadius: 5,
            background: 'rgba(255,255,255,0.4)',
          }} />
        </motion.div>
      </motion.div>

      <span style={{ color: !isImmersive ? '#00e5b0' : '#445566' }}>
        SCIENTIFIC
      </span>
    </div>
  );
}
```

**Visual breakdown of what makes it feel physical:**
- Inset shadow on the track = recessed channel
- Radial gradient on knob = dome shape
- Inner shine highlight on knob = light reflection
- Outer glow changes color per mode = LED indicator feel
- Spring animation on knob = physical bounce

---

## 8. Object Detail Panel

### Immersive Mode — Bottom Card

Slides up from the bottom of the screen when any object is clicked.

```typescript
// Framer Motion slide-up
<motion.div
  initial={{ y: '100%', opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: '100%', opacity: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  style={{
    position: 'fixed',
    bottom: 60,            // above timeline
    left: '50%',
    transform: 'translateX(-50%)',
    width: 500,
    background: 'rgba(3,5,15,0.90)',
    backdropFilter: 'blur(24px)',
    borderRadius: 16,
    border: '1px solid rgba(64,120,255,0.2)',
  }}
>
  {/* Object name + poetic Gemini description + key stats */}
  {/* Notify me button */}
</motion.div>
```

Content in immersive card:
```
┌────────────────────────────────────────┐
│  ● Jupiter                          ✕  │
│                                        │
│  "628 million km above you right now.  │
│   The light reaching your eyes left    │
│   Jupiter 34 minutes ago..."           │
│                   — Gemini generated   │
│                                        │
│  Distance    Elevation    Next zenith  │
│  628M km     62°          Active now   │
│                                        │
│  [🔔 Notify me at zenith]              │
└────────────────────────────────────────┘
```

### Scientific Mode — Right Panel

Slides in from the right side.

```
┌───────────────────────────────┐
│  ● Jupiter           [×]      │
│  Gas Giant · Sol-V            │
│  ─────────────────────────── │
│  ELEVATION    DISTANCE        │
│  62.3°        628.7M km       │
│                               │
│  R.A.         DEC.            │
│  05h 10m      +22° 12′        │
│                               │
│  AZIMUTH      MAGNITUDE       │
│  127.4°       -2.4            │
│  ─────────────────────────── │
│  NEXT ZENITH PASS             │
│  ┌─────────────────────────┐ │
│  │      Active Now         │ │
│  │  Visible until 03:12    │ │
│  └─────────────────────────┘ │
│                               │
│  GEMINI DESCRIPTION           │
│  Jupiter is currently at      │
│  opposition. Angular diameter │
│  48.4 arcseconds. Io, Europa, │
│  Ganymede visible tonight...  │
│                               │
│  [🔔 Alert at zenith]         │
└───────────────────────────────┘
```

### Gemini Integration
```typescript
// hooks/useGemini.ts

export function useGemini(object: CelestialObject, mode: Mode, location: Location) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!object) return;
    setLoading(true);

    const prompt = mode === 'immersive'
      ? `Describe ${object.name} poetically. It is currently ${object.elev}° above the horizon
         from ${location.name}, ${object.dist} away. The light reaching the viewer left
         ${object.name} ${object.lightTime} ago. 2-3 sentences, emotional and personal.`
      : `Provide precise astronomical context for ${object.name}. Current apparition details,
         visibility from ${location.lat}°N, key observational facts. Be specific and technical.
         3-4 sentences.`;

    fetch('/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
      .then(r => r.json())
      .then(d => { setDescription(d.text); setLoading(false); });

  }, [object?.id, mode]);

  return { description, loading };
}
```

---

## 9. Skyprint Feature

A downloadable personalized sky poster. Generated client-side using an HTML Canvas.

```typescript
// components/ui/SkyprintModal.tsx

// What the poster contains:
// - Circular sky dome (canvas arc)
// - All currently visible objects plotted at correct angular positions
// - Cardinal direction labels (N S E W)
// - User's location name
// - Exact timestamp
// - "Your unique zenith window" label

function generateSkyprint(objects, location, time) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#010208';
  ctx.fillRect(0, 0, 800, 900);

  // Sky dome circle
  const cx = 400, cy = 420, r = 340;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, '#0d2560');
  gradient.addColorStop(1, '#010208');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw each object
  objects.forEach(obj => {
    const { x, y } = altAzToCanvasXY(obj.alt, obj.az, cx, cy, r);
    ctx.beginPath();
    ctx.arc(x, y, dotSize(obj), 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();
  });

  // Location + timestamp text
  ctx.fillStyle = '#c8d8f8';
  ctx.font = 'bold 28px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(location.name, cx, 820);

  // Trigger download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenith-${location.name}-${Date.now()}.png`;
    a.click();
  });
}
```

---

## 10. Timeline Scrubber

The bottom bar lets users scrub through time. All positions recalculate for the selected timestamp.

```typescript
// components/ui/Timeline.tsx

// Default: NOW (center position)
// Drag left: go back up to 24 hours
// Drag right: go forward up to 24 hours

// On change:
// - setCurrentTime(newTimestamp) in Zustand store
// - All hooks (useSatellites, usePlanets etc.) re-run with new time
// - satellite.js accepts any timestamp → recalculates positions
// - Astronomy Engine accepts any timestamp → recalculates Alt/Az
// - Three.js scene updates object positions in next frame

<input
  type="range"
  min={-86400}    // -24 hours in seconds
  max={86400}     // +24 hours in seconds
  defaultValue={0}
  onChange={(e) => {
    const offsetSeconds = Number(e.target.value);
    const newTime = new Date(Date.now() + offsetSeconds * 1000);
    setCurrentTime(newTime);
  }}
/>
```

---

## 11. Data Flow to UI

```
┌─────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                          │
│                                                             │
│  OpenNotify → useISS → ISS.tsx                             │
│  CelesTrak  → useSatellites → satellite.js → useZenith     │
│  NASA Horizons → usePlanets → useZenith                    │
│  HYG CSV → useStars → StarField.tsx                        │
│                         ↓                                   │
│              useZenith (Astronomy Engine)                   │
│         converts everything to Alt/Az                       │
│                         ↓                                   │
│              altAzToXYZ() for each object                   │
│                         ↓                                   │
│         Three.js positions updated every frame             │
│                         ↓                                   │
│              User sees live sky                             │
└─────────────────────────────────────────────────────────────┘
```

### Update Frequencies
| Source | Update Interval |
|--------|----------------|
| ISS position (OpenNotify) | Every 5 seconds |
| Satellite positions (satellite.js) | Every 1 second (client-side) |
| Planet positions (NASA Horizons) | Once on load, cached for session |
| Star positions (HYG) | Once on load, static |
| Gemini descriptions | On object click |
| Three.js render loop | 60 fps |

---

## 12. Animations & Transitions

### Globe → Sky Transition
```typescript
// 1. CesiumJS camera zooms into selected lat/lon
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(lon, lat, 500),
  duration: 2.0,
});

// 2. After zoom completes:
// Framer Motion fades out CesiumJS container
// Framer Motion fades in React Three Fiber canvas

// 3. R3F camera initializes looking straight up (zenith)
// OrbitControls lets user look around the sky dome
```

### Object Selection
```typescript
// Immersive: clicked object scales up
<mesh
  onClick={() => selectObject(obj)}
  scale={isSelected ? 1.8 : 1}
>

// Scientific: clicked object gets dashed rotation ring
// Both: glow intensity increases on selection
```

### Satellite Movement
```typescript
// useFrame hook in Satellites.tsx
// Runs every render frame (60fps)
// Recalculates position from satellite.js
// Updates mesh position smoothly
useFrame(() => {
  satellites.forEach((sat, i) => {
    const pos = propagateSatellite(sat.tle, currentTime);
    const altaz = toAltAz(pos, userLocation, currentTime);
    if (altaz.alt > 0) {
      meshRefs.current[i].position.copy(altAzToVector3(altaz));
      // Add to trail buffer
      trails.current[i].push(altAzToVector3(altaz));
    }
  });
});
```

---

## 13. Component Tree

```
<App>
  <ZenithProvider>              ← Zustand store
    <Router>
      /  → <LandingPage>
              <CesiumGlobe />
              <SearchBar />
              <ModeToggle />
              <LocationChips />

      /sky → <SkyPage>
               <SkyCanvas>     ← R3F Canvas
                 <StarField />
                 <Planets />
                 <Satellites />
                 <ISS />
                 <Constellations />
                 <ZenithMarker />
                 <OrbitControls />
               </SkyCanvas>

               <UIOverlay>     ← Framer Motion, above canvas
                 <Topbar />
                 <ModeToggle />
                 {mode === 'scientific' && <HUDOverlay />}
                 {mode === 'scientific' && <ObjectList />}
                 <Timeline />
                 {selectedObject && <ObjectDetail />}
               </UIOverlay>

               {showSkyprint && <SkyprintModal />}
    </Router>
  </ZenithProvider>
</App>
```

---

## 14. Design System

### Colors
```typescript
export const colors = {
  bg:       '#010208',   // void black
  deep:     '#03050f',   // near-black
  panel:    'rgba(6,13,31,0.92)',
  glass:    'rgba(12,22,50,0.65)',
  blue:     '#4078ff',   // primary accent
  blueHi:   '#6090ff',   // hover state
  violet:   '#7c55f0',   // gradient partner
  cyan:     '#00d4ff',   // MEO / GPS
  teal:     '#00e5b0',   // live indicator / zenith
  amber:    '#ffaa00',   // ISS
  rose:     '#ff5577',   // planets / mars
  lilac:    '#b088ff',   // stars
  ice:      '#a8ccff',   // star color cold
  text:     '#c8d8f8',   // primary text
  textMid:  '#7888a8',   // secondary text
  textDim:  '#4a5a78',   // tertiary / labels
};
```

### Typography
```
Orbitron     → headings, object names, key numbers (sci-fi feel)
Inter        → body text, descriptions, UI labels
JetBrains Mono → coordinates, telemetry, timestamps, data values
```

### Glassmorphism Panels
```css
background: rgba(6, 13, 31, 0.85);
backdrop-filter: blur(20px);
border: 1px solid rgba(64, 120, 255, 0.15);
border-radius: 12px;
box-shadow: 0 0 40px rgba(0, 0, 0, 0.4);
```

### Object Type Colors
| Type | Color | Usage |
|------|-------|-------|
| Station (ISS) | `#ffaa00` amber | Dot, card border, badge |
| Satellite | `#00e5b0` teal | Dot, card border, badge |
| Planet | `#ff5577` rose | Dot, card border, badge |
| Star | `#a8ccff` ice | Dot, card border, badge |

---

## 15. Performance Strategy

### Star Field
- 120,000 stars rendered as a single `BufferGeometry` with `Points`
- One draw call for all stars — very efficient
- Stars filtered to only those above horizon before rendering

### Satellites
- CelesTrak provides ~6,000 TLE records
- Only satellites above horizon at current time are rendered (typically 50-200)
- Position updates batched in `useFrame` — no re-renders triggered

### Mobile
- Detect device capability on load
- Mobile: reduce star count to 20,000, disable trails, reduce glow effects
- Tablet: 60,000 stars, simplified trails
- Desktop: full 120,000 stars, all effects

### Caching
```typescript
// TLE data: fetched once, cached in sessionStorage
// Planet positions: fetched once per session
// Gemini responses: cached in Map keyed by objectId + mode
// Star database: loaded once, stored in Zustand
```

### Code Splitting
```
CesiumJS     → dynamically imported only on landing page
R3F + Three  → dynamically imported only on sky page
Never both loaded at same time
```

---

*Project Zenith: The Celestial Eye — Frontend Specification*
*AstralWeb Innovate · Aaruush '26 · SRMIST*
