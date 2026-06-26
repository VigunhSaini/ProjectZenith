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
  tutorialActive: boolean;
  tutorialStepIndex: number;
  activeTutorialScreen: "globe" | "sky";
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
  setTutorialActive: (active: boolean) => void;
  setTutorialStepIndex: (index: number) => void;
  setActiveTutorialScreen: (screen: "globe" | "sky") => void;
  startTutorial: (screen: "globe" | "sky") => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  skipTutorial: () => void;
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
  tutorialActive: false,
  tutorialStepIndex: 0,
  activeTutorialScreen: "globe",
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
  setTutorialActive: (active) => set({ tutorialActive: active }),
  setTutorialStepIndex: (index) => set({ tutorialStepIndex: index }),
  setActiveTutorialScreen: (screen) => set({ activeTutorialScreen: screen }),
  startTutorial: (screen) =>
    set({
      tutorialActive: true,
      tutorialStepIndex: 0,
      activeTutorialScreen: screen,
    }),
  nextTutorialStep: () => set((state) => ({ tutorialStepIndex: state.tutorialStepIndex + 1 })),
  prevTutorialStep: () => set((state) => ({ tutorialStepIndex: Math.max(0, state.tutorialStepIndex - 1) })),
  skipTutorial: () => {
    localStorage.setItem("zenith-tutorial-v1", "true");
    set({ tutorialActive: false, tutorialStepIndex: 0 });
  },
}));

