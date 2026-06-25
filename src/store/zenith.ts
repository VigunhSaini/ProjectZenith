import { create } from "zustand";
import { CelestialObject } from "@/lib/celestial";

export type Mode = "immersive" | "scientific";

export interface ObserverLocation {
  lat: number;
  lon: number;
  name: string;
}

export interface ZenithStore {
  mode: Mode;
  location: ObserverLocation | null;
  selectedObject: CelestialObject | null;
  /** Unix timestamp in milliseconds. Stored as a number so React dependency arrays
   *  compare by value — preventing unnecessary re-renders when the value is unchanged. */
  currentTime: number;
  showSkyprint: boolean;
  showGrid: boolean;
  showConstellations: boolean;
  hoveredObject: CelestialObject | null;
  setMode: (mode: Mode) => void;
  setLocation: (location: ObserverLocation | null) => void;
  setSelectedObject: (selectedObject: CelestialObject | null) => void;
  setHoveredObject: (hoveredObject: CelestialObject | null) => void;
  setCurrentTime: (currentTime: number) => void;
  setShowSkyprint: (showSkyprint: boolean) => void;
  toggleGrid: () => void;
  setGrid: (showGrid: boolean) => void;
  toggleConstellations: () => void;
  setShowConstellations: (showConstellations: boolean) => void;
}

export const useZenithStore = create<ZenithStore>((set) => ({
  mode: "immersive",
  location: null,
  selectedObject: null,
  hoveredObject: null,
  currentTime: Date.now(),
  showSkyprint: false,
  showGrid: false,
  showConstellations: true,
  setMode: (mode) => set({ mode }),
  setLocation: (location) => set({ location }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  setHoveredObject: (hoveredObject) => set({ hoveredObject }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setShowSkyprint: (showSkyprint) => set({ showSkyprint }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGrid: (showGrid) => set({ showGrid }),
  toggleConstellations: () => set((state) => ({ showConstellations: !state.showConstellations })),
  setShowConstellations: (showConstellations) => set({ showConstellations }),
}));
