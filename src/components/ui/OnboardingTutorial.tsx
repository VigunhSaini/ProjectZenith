"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useZenithStore } from "@/store/zenith";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CelestialObject } from "@/lib/celestial";

export interface TutorialStep {
  id: string;
  screen: "globe" | "sky";
  targetSelector: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // Globe Steps
  {
    id: "globe-canvas",
    screen: "globe",
    targetSelector: "#cesium-globe-container",
    title: "Interactive 3D Globe",
    body: "Drag anywhere on the globe to rotate. Click any point to select your observation location.",
    placement: "center",
  },
  {
    id: "globe-search",
    screen: "globe",
    targetSelector: "#location-search-input",
    title: "Target Search",
    body: "Search for any city or use Quick Pick chips to jump to a location instantly.",
    placement: "top",
  },
  {
    id: "globe-gps",
    screen: "globe",
    targetSelector: "#locate-me-btn",
    title: "Presets & My Location",
    body: "Use your device location to auto-select where you are right now. Then hit Next to enter the sky.",
    placement: "top",
  },

  // Sky Steps
  {
    id: "sky-canvas",
    screen: "sky",
    targetSelector: "#sky-canvas-container",
    title: "3D Cosmic Sky Dome",
    body: "This is a live 3D sky dome. Click and drag to look around. Scroll to zoom in.",
    placement: "center",
  },
  {
    id: "sky-sidebar",
    screen: "sky",
    targetSelector: "#hud-sidebar-panel",
    title: "Real-Time Overhead Radar",
    body: "Everything overhead is listed here — filter by Planet, Satellite, or Star.",
    placement: "right",
  },
  {
    id: "sky-detail",
    screen: "sky",
    targetSelector: "#immersive-object-card, #scientific-telemetry-panel",
    title: "Orbital Telemetry & AI Context",
    body: "Click any object to pull up live telemetry — altitude, azimuth, magnitude, and AI context.",
    placement: "left",
  },
  {
    id: "sky-scrubber",
    screen: "sky",
    targetSelector: "#zenith-timeline",
    title: "Temporal Timeline Scrubber",
    body: "Drag the timeline to travel ±24 hours and see how the sky changes over time.",
    placement: "top",
  },
];

interface OnboardingTutorialProps {
  currentScreen: "globe" | "sky";
  isLoaded: boolean;
  onNavigateToSky?: () => void;
  objects?: CelestialObject[];
}

export default function OnboardingTutorial({
  currentScreen,
  isLoaded,
  onNavigateToSky,
  objects = [],
}: OnboardingTutorialProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const {
    mode,
    setMode,
    selectedObject,
    setSelectedObject,
    tutorialActive,
    tutorialStepIndex,
    activeTutorialScreen,
    setTutorialStepIndex,
    setActiveTutorialScreen,
    startTutorial,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial,
  } = useZenithStore();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 180 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filter steps for the current screen
  const currentScreenSteps = useMemo(() => {
    return TUTORIAL_STEPS.filter((s) => s.screen === currentScreen);
  }, [currentScreen]);

  const activeStep = currentScreenSteps[tutorialStepIndex];
  const isCurrentlyShowing =
    tutorialActive && activeTutorialScreen === currentScreen && activeStep;

  // Auto-launch trigger on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCompleted = localStorage.getItem("zenith-tutorial-v1");
    if (!isCompleted && isLoaded && !tutorialActive) {
      // Auto-launch the tutorial for whichever screen the user landed on first
      startTutorial(currentScreen);
    }
  }, [isLoaded, tutorialActive, currentScreen, startTutorial]);

  // Sync state mid-tutorial across screens
  useEffect(() => {
    if (tutorialActive && activeTutorialScreen !== currentScreen) {
      setActiveTutorialScreen(currentScreen);
      setTutorialStepIndex(0);
    }
  }, [currentScreen, tutorialActive, activeTutorialScreen, setActiveTutorialScreen, setTutorialStepIndex]);

  // Handle side-effects of step changes (e.g. toggling modes or auto-selecting objects)
  useEffect(() => {
    if (!isCurrentlyShowing) return;

    // Side-effects on Sky screen
    if (currentScreen === "sky") {
      if (activeStep.id === "sky-sidebar" && mode !== "scientific") {
        setMode("scientific");
      }
      if (activeStep.id === "sky-detail" && !selectedObject && objects.length > 0) {
        // Auto-select first available object to display detail panel
        setSelectedObject(objects[0]);
      }
    }
  }, [
    isCurrentlyShowing,
    currentScreen,
    activeStep,
    mode,
    setMode,
    selectedObject,
    setSelectedObject,
    objects,
  ]);

  // Measure dynamic step target rect
  const updateRect = useCallback(() => {
    if (!isCurrentlyShowing) {
      setRect(null);
      return;
    }

    const selector = activeStep.targetSelector;
    if (selector === "#cesium-globe-container" || selector === "#sky-canvas-container") {
      // Spotlight a centered circular region in the middle of the viewport
      const diameter = Math.min(380, window.innerWidth - 40, window.innerHeight - 40);
      const x = window.innerWidth / 2 - diameter / 2;
      const y = window.innerHeight / 2 - diameter / 2;
      setRect({
        x,
        y,
        left: x,
        top: y,
        width: diameter,
        height: diameter,
        right: x + diameter,
        bottom: y + diameter,
        toJSON: () => {},
      } as DOMRect);
      return;
    }

    // Split target selector by comma for alternative matches (e.g. details panels)
    const selectors = selector.split(",");
    let matchedElement: Element | null = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel.trim());
      if (el && el.getBoundingClientRect().width > 0) {
        matchedElement = el;
        break;
      }
    }

    if (matchedElement) {
      setRect(matchedElement.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [isCurrentlyShowing, activeStep]);

  // Measure tooltip size
  useEffect(() => {
    if (tooltipRef.current) {
      const r = tooltipRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setTooltipSize({ width: r.width, height: r.height });
      }
    }
  }, [tutorialStepIndex, currentScreen, isCurrentlyShowing]);

  // Resize and scroll listeners
  useEffect(() => {
    updateRect();

    // Poll a few times to account for transition durations or dynamic render delays
    let count = 0;
    const interval = setInterval(() => {
      updateRect();
      count++;
      if (count > 10) clearInterval(interval);
    }, 120);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect, tutorialStepIndex, currentScreen]);

  // Next / Back Actions
  const handleNext = useCallback(() => {
    if (tutorialStepIndex < currentScreenSteps.length - 1) {
      setTutorialStepIndex(tutorialStepIndex + 1);
    } else {
      // Completed the final step of the current screen
      if (currentScreen === "globe") {
        if (onNavigateToSky) {
          onNavigateToSky();
        } else {
          router.push("/sky?lat=51.5074&lon=-0.1278&name=London");
        }
      } else {
        skipTutorial(); // sets complete flag and exits
      }
    }
  }, [tutorialStepIndex, currentScreenSteps, currentScreen, onNavigateToSky, router, skipTutorial, setTutorialStepIndex]);

  const handleBack = useCallback(() => {
    if (tutorialStepIndex > 0) {
      setTutorialStepIndex(tutorialStepIndex - 1);
    }
  }, [tutorialStepIndex, setTutorialStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCurrentlyShowing) return;

      // Ignore if currently typing in input/textarea fields
      const isTyping =
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.getAttribute("contenteditable") === "true");

      if (isTyping) return;

      if (e.key === "Escape") {
        e.preventDefault();
        skipTutorial();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCurrentlyShowing, handleNext, skipTutorial]);

  // Calculate dynamic tooltip positioning with viewport bounds clamping
  const tooltipCoords = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 0 };
    }
    if (!rect || !isCurrentlyShowing) {
      return { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 90 };
    }

    const { placement } = activeStep;
    const padding = 16;
    const gap = 12;

    let x = window.innerWidth / 2 - tooltipSize.width / 2;
    let y = window.innerHeight / 2 - tooltipSize.height / 2;

    if (placement === "top") {
      x = rect.left + rect.width / 2 - tooltipSize.width / 2;
      y = rect.top - tooltipSize.height - gap;
    } else if (placement === "bottom") {
      x = rect.left + rect.width / 2 - tooltipSize.width / 2;
      y = rect.bottom + gap;
    } else if (placement === "left") {
      x = rect.left - tooltipSize.width - gap;
      y = rect.top + rect.height / 2 - tooltipSize.height / 2;
    } else if (placement === "right") {
      x = rect.right + gap;
      y = rect.top + rect.height / 2 - tooltipSize.height / 2;
    }

    // Clamp coordinates to prevent clipping at viewport borders
    x = Math.max(padding, Math.min(window.innerWidth - tooltipSize.width - padding, x));
    y = Math.max(padding, Math.min(window.innerHeight - tooltipSize.height - padding, y));

    return { x, y };
  }, [rect, activeStep, isCurrentlyShowing, tooltipSize]);

  // Mask coordinates & sizing
  const isCircleCutout =
    activeStep?.targetSelector === "#cesium-globe-container" ||
    activeStep?.targetSelector === "#sky-canvas-container";

  const pad = isCircleCutout ? 0 : 8;
  const maskX = rect ? rect.x - pad : 0;
  const maskY = rect ? rect.y - pad : 0;
  const maskW = rect ? rect.width + pad * 2 : 0;
  const maskH = rect ? rect.height + pad * 2 : 0;
  const maskR = isCircleCutout ? maskW / 2 : 8;

  const totalSteps = currentScreenSteps.length;
  const progressPercent = ((tutorialStepIndex + 1) / totalSteps) * 100;
  const isLastStep = tutorialStepIndex === totalSteps - 1;

  if (!mounted) return null;

  return (
    <>
      {/* Help button re-trigger control */}
      <button
        onClick={() => startTutorial(currentScreen)}
        className="fixed bottom-6 left-6 w-9 h-9 rounded-full flex items-center justify-center border z-50 text-sm font-semibold select-none transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: "rgba(10, 22, 40, 0.8)",
          borderColor: currentScreen === "sky" ? "rgba(0, 229, 176, 0.4)" : "rgba(64, 120, 255, 0.4)",
          color: currentScreen === "sky" ? "#00e5b0" : "#4078ff",
          boxShadow: currentScreen === "sky"
            ? "0 0 10px rgba(0, 229, 176, 0.15)"
            : "0 0 10px rgba(64, 120, 255, 0.15)",
        }}
        title="Start Walkthrough Tutorial"
        id="tutorial-help-trigger-btn"
      >
        ?
      </button>

      {/* Tutorial Overlay & Tooltip */}
      <AnimatePresence>
        {isCurrentlyShowing && (
          <div className="fixed inset-0 z-[100] pointer-events-none select-none">
            {/* SVG mask cutout overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
              <defs>
                <mask id="onboarding-cutout-mask">
                  {/* White background preserves darkness */}
                  <rect width="100%" height="100%" fill="white" />
                  {/* Black cutout makes target visible */}
                  {rect && (
                    <rect
                      x={maskX}
                      y={maskY}
                      width={maskW}
                      height={maskH}
                      rx={maskR}
                      ry={maskR}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              {/* Dim overlay rectangle */}
              <rect
                width="100%"
                height="100%"
                fill="rgba(2, 3, 10, 0.72)"
                mask="url(#onboarding-cutout-mask)"
                onClick={() => skipTutorial()}
                className="cursor-pointer"
              />
            </svg>

            {/* Tooltip callout bubble */}
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, x: tooltipCoords.x, y: tooltipCoords.y }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute w-80 p-5 rounded-xl border pointer-events-auto flex flex-col gap-3"
              style={{
                backgroundColor: "rgba(6, 13, 31, 0.95)",
                borderColor: currentScreen === "sky" ? "rgba(0, 229, 176, 0.25)" : "rgba(64, 120, 255, 0.25)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
                backdropFilter: "blur(20px)",
                left: 0,
                top: 0,
              }}
            >
              {/* Progress bar */}
              <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{
                    backgroundColor: currentScreen === "sky" ? "#00e5b0" : "#4078ff",
                    boxShadow: currentScreen === "sky"
                      ? "0 0 8px #00e5b0"
                      : "0 0 8px #4078ff",
                  }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>

              {/* Title & Step Count */}
              <div className="flex items-center justify-between mt-1">
                <h3
                  className="text-xs uppercase font-extrabold tracking-widest"
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    color: currentScreen === "sky" ? "#00e5b0" : "#4078ff",
                  }}
                >
                  {activeStep.title}
                </h3>
                <span
                  className="text-[10px] font-bold text-white/40"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {tutorialStepIndex + 1} of {totalSteps}
                </span>
              </div>

              {/* Body Text */}
              <p
                className="text-xs leading-relaxed text-white/70"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {activeStep.body}
              </p>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => skipTutorial()}
                  className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  Skip
                </button>

                <div className="flex gap-2">
                  {tutorialStepIndex > 0 && (
                    <button
                      onClick={handleBack}
                      className="px-3 py-1.5 rounded border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-all"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                    style={{
                      fontFamily: "var(--font-inter)",
                      backgroundColor: currentScreen === "sky" ? "#00e5b0" : "#4078ff",
                      color: "#010208",
                      boxShadow: currentScreen === "sky"
                        ? "0 0 10px rgba(0, 229, 176, 0.4)"
                        : "0 0 10px rgba(64, 120, 255, 0.4)",
                    }}
                  >
                    {isLastStep ? (currentScreen === "globe" ? "Next View" : "Done") : "Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
