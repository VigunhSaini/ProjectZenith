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
  setMode: (mode: Mode) => void;
  setLocation: (location: ObserverLocation | null) => void;
  setSelectedObject: (selectedObject: CelestialObject | null) => void;
  setCurrentTime: (currentTime: number) => void;
  setShowSkyprint: (showSkyprint: boolean) => void;
}

export const useZenithStore = create<ZenithStore>((set) => ({
  mode: "immersive",
  location: null,
  selectedObject: null,
  currentTime: Date.now(),
  showSkyprint: false,
  setMode: (mode) => set({ mode }),
  setLocation: (location) => set({ location }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setShowSkyprint: (showSkyprint) => set({ showSkyprint }),
}));
