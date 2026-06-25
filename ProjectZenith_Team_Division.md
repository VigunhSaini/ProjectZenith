# Project Zenith: The Celestial Eye
## Team Work Division — 3 Members

---

## Overview

The codebase splits cleanly into three independent zones because CesiumJS and React Three Fiber never run at the same time, and the data layer is mostly client-side and decoupled from the UI. Each person can work in parallel once the shared data contract is agreed on.

**Shared contract everyone agrees on before splitting:**

```typescript
interface CelestialObject {
  id: string;
  name: string;
  type: 'station' | 'sat' | 'planet' | 'star';
  alt: number;        // altitude in degrees (0-90)
  az: number;          // azimuth in degrees (0-360)
  dist: string;        // formatted distance
  color: string;
  ra?: string;          // right ascension (planets/stars)
  dec?: string;         // declination (planets/stars)
  nextZenith?: string;  // countdown or "Active"
}
```

Once this shape is locked, all three members build against it independently.

---

## Member A — Globe, Location & Data Pipeline

### Ownership
Everything before the user enters the sky view, plus the live data layer that Member B's 3D scene consumes.

### Tasks

**Landing Screen**
- CesiumJS setup: photorealistic Earth, terrain, atmosphere, cloud layer
- Click-to-select location handler (`pickEllipsoid` → lat/lon)
- Search bar with city/coordinate input
- Quick-pick location chips (New Delhi, Mumbai, Tokyo, London, New York)
- "Use My Location" browser geolocation button
- ISS dot animation orbiting the CesiumJS globe

**Transition**
- Camera fly-to animation when location is selected
- Coordinating the fade handoff to Member B's React Three Fiber canvas

**Data Pipeline (the core technical responsibility)**
- `useISS` hook — OpenNotify polling every 5 seconds
- `useSatellites` hook — CelesTrak TLE fetch + caching strategy
- `usePlanets` hook — NASA JPL Horizons fetch for current day positions
- `useStars` hook — HYG database loader (static CSV/JSON, 120k stars)
- `lib/satellite.ts` — satellite.js wrapper functions (SGP4 propagation)
- `lib/astronomy.ts` — Astronomy Engine wrapper functions
- `lib/coordinates.ts` — RA/Dec → Alt/Az conversion (the zenith math)
- `useZenith` hook — combines all of the above into the shared `CelestialObject[]` array

### Deliverable
A working `useZenith(location, time)` hook that Member B can plug straight into the 3D scene, returning a clean array of positioned objects.

### Skills Needed
React, CesiumJS, REST API integration, basic orbital mechanics concepts (TLE format), coordinate geometry.

---

## Member B — Sky View & 3D Scene

### Ownership
Everything rendered inside the React Three Fiber canvas — the actual visual experience the user looks at and rotates around.

### Tasks

**Scene Setup**
- `SkyCanvas.tsx` — R3F Canvas root, camera at origin, OrbitControls locked to upper hemisphere only
- `altAzToXYZ()` — converts Alt/Az from Member A's data into 3D scene coordinates

**Scene Components**
- `StarField.tsx` — 120k stars as a single `BufferGeometry`/`Points` draw call, colored by spectral type, sized by magnitude
- `Planets.tsx` — glowing planet meshes with relative sizing, custom shaders for Jupiter bands / Mars color / Venus brightness
- `Satellites.tsx` — live-updating dots with fading trail lines, driven by `useFrame`
- `ISS.tsx` — special highlighted version of a satellite with stronger glow
- `Constellations.tsx` — line segments connecting star pairs from constellation JSON data
- `ZenithMarker.tsx` — crosshair fixed at the top/center of the dome

**Interaction**
- Click handling on 3D objects → triggers `selectObject()` in shared state
- Object scale/glow increase on hover and selection
- Selection ring animation (rotating dashed circle)

**Performance**
- Mobile detection → reduce star count (120k → 20k), disable trails on low-end devices
- Frustum culling / only rendering objects above horizon
- Ensuring `useFrame` updates don't trigger unnecessary React re-renders

### Deliverable
A fully populated, smoothly animating 3D sky dome that accepts a `CelestialObject[]` array as a prop and renders it correctly, with click events bubbling up.

### Skills Needed
Three.js, React Three Fiber, WebGL performance basics, shader fundamentals (helpful but not mandatory), 3D coordinate math.

---

## Member C — UI Layer, Modes & AI

### Ownership
Everything the user reads, clicks, and toggles — the two-mode system, all panels, and the AI-driven educational content.

### Tasks

**The Skeuomorphic Toggle**
- `ModeToggle.tsx` — physical flip-switch component with inset track shadow, knob gradient, shine highlight, spring animation via Framer Motion
- Global mode state in Zustand store

**Mode Overlays**
- `ImmersiveOverlay` — minimal topbar, subtle timeline, no persistent labels
- `ScientificOverlay` — HUD stat boxes, grid overlay toggle, object list sidebar, coordinate readouts
- Framer Motion cross-fade between the two overlays on toggle

**Object Detail Panels**
- `ObjectCard.tsx` (Immersive) — bottom slide-up card, poetic description, key stats, notify button
- `TelemetryPanel.tsx` (Scientific) — right slide-in panel, full RA/Dec/Az/Alt grid, Gemini technical description, notify button

**AI Integration**
- `useGemini` hook — fetches description based on object + mode + location context
- Prompt engineering for both immersive (poetic) and scientific (technical) styles
- `/api/gemini` Next.js API route — hides the API key server-side, basic rate limiting
- `lib/wikipedia.ts` — instant fallback while Gemini loads, and backup if Gemini fails
- Response caching (Map keyed by objectId + mode) to avoid redundant calls on repeated clicks

**Supporting Features**
- `Timeline.tsx` — past/future scrubber, updates shared `currentTime` state
- `SkyprintModal.tsx` — canvas-based poster generator, downloadable PNG export
- `Topbar.tsx` — location name, live clock, back button, Skyprint trigger

### Deliverable
A complete, mode-aware UI shell that wraps around Member B's 3D canvas, reacts to object selection, and pulls live AI-generated content with proper loading and fallback states.

### Skills Needed
React, Framer Motion, prompt engineering, Next.js API routes, CSS/Tailwind for the skeuomorphic detailing.

---

## Sync Points

| When | What to Sync |
|------|--------------|
| Day 1 | Lock the `CelestialObject` shape and Zustand store structure together |
| Day 5 | Member A shares a mock `useZenith` returning dummy data so B and C can build against it before live APIs are ready |
| Day 10 | Member A's real data pipeline goes live — B and C swap mock data for the real hook |
| Day 15 | Full integration pass — all three pieces connected, test the complete flow end to end |
| Day 18 | Joint testing across devices, fix seams between data/scene/UI |

---

## Why This Split Works

Member A and Member B can work almost entirely in parallel — CesiumJS and React Three Fiber never share a file. They only need to agree on the data shape passed between them.

Member C depends on both but can start immediately using mock data, building the entire UI and toggle system before any live data exists. By the time A and B's pieces are ready, C just swaps the data source.

No one is blocked waiting on another's work past Day 5, which matters a lot given the tight hackathon timeline.

---

*Project Zenith: The Celestial Eye — Team Work Division*
*AstralWeb Innovate · Aaruush '26 · SRMIST*
