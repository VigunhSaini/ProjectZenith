import { create } from "zustand";
import { CelestialObject } from "./celestial";

export interface ObserverLocation {
  lat: number;
  lon: number;
  name: string;
}

export interface AppState {
  // Mode state: 'immersive' or 'scientific'
  mode: "immersive" | "scientific";
  setMode: (mode: "immersive" | "scientific") => void;

  // Selected object state
  selectedObject: CelestialObject | null;
  selectObject: (obj: CelestialObject | null) => void;

  // Hovered object state
  hoveredObject: CelestialObject | null;
  setHoveredObject: (obj: CelestialObject | null) => void;

  // Current simulation/timeline time
  currentTime: Date;
  setCurrentTime: (time: Date) => void;

  // Selected observer location
  location: ObserverLocation | null;
  setLocation: (loc: ObserverLocation | null) => void;

  // Grid overlays visibility (Scientific Mode)
  showGrid: boolean;
  toggleGrid: () => void;
  setGrid: (show: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: "immersive",
  setMode: (mode) => set({ mode }),

  selectedObject: null,
  selectObject: (selectedObject) => set({ selectedObject }),

  hoveredObject: null,
  setHoveredObject: (hoveredObject) => set({ hoveredObject }),

  currentTime: new Date(),
  setCurrentTime: (currentTime) => set({ currentTime }),

  location: null,
  setLocation: (location) => set({ location }),

  showGrid: false,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGrid: (showGrid) => set({ showGrid }),
}));
