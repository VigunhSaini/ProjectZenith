"use client";

import { useEffect, useRef } from "react";
import type { Viewer } from "cesium";

interface GlobeViewProps {
  onLocationSelect: (lat: number, lon: number) => void;
  flyToLocation?: { lat: number; lon: number } | null;
  /** Called once the Cesium Viewer is fully initialised */
  onGlobeReady?: (viewer: unknown) => void;
}

// Dynamically import Cesium to avoid SSR issues
let CesiumModule: typeof import("cesium") | null = null;

async function getCesium() {
  if (!CesiumModule) {
    CesiumModule = await import("cesium");
  }
  return CesiumModule;
}

export default function GlobeView({
  onLocationSelect,
  flyToLocation,
  onGlobeReady,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const clickHandlerRef = useRef<unknown>(null);

  // Initialize Cesium viewer
  useEffect(() => {
    let mounted = true;

    const initCesium = async () => {
      if (!containerRef.current || viewerRef.current) return;

      const Cesium = await getCesium();

      Cesium.Ion.defaultAccessToken =
        process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

      const viewer = new Cesium.Viewer(containerRef.current, {
        // Disable all UI chrome — we provide our own
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        // Photorealistic terrain (or ellipsoid fallback on auth error)
        terrainProvider: await Cesium.createWorldTerrainAsync({
          requestWaterMask: false,
          requestVertexNormals: true,
        }).catch((err) => {
          console.warn("Cesium WorldTerrain failed (likely invalid token). Falling back to EllipsoidTerrainProvider.", err);
          return new Cesium.EllipsoidTerrainProvider();
        }),
      });

      if (!mounted) {
        viewer.destroy();
        return;
      }

      // Remove default imagery and add Bing Aerial (or offline fallback on auth error)
      viewer.imageryLayers.removeAll();
      try {
        const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(2);
        viewer.imageryLayers.addImageryProvider(imageryProvider);
      } catch {
        console.warn("Cesium Ion Bing Aerial failed (likely invalid token). Falling back to offline NaturalEarthII imagery.");
        try {
          const fallbackProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
          );
          viewer.imageryLayers.addImageryProvider(fallbackProvider);
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fallbackProvider = new (Cesium.TileMapServiceImageryProvider as any)({
            url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
          });
          viewer.imageryLayers.addImageryProvider(fallbackProvider);
        }
      }

      // Camera initial position — a nice Earth-from-space view
      viewer.scene.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000),
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0,
        },
      });

      // Atmosphere and lighting
      viewer.scene.globe.enableLighting = true;

      // Click handler for location selection
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: { position: any }) => {
          const earthPosition = viewer.camera.pickEllipsoid(
            event.position,
            viewer.scene.globe.ellipsoid
          );
          if (!earthPosition) return;

          const carto = Cesium.Cartographic.fromCartesian(earthPosition);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lon = Cesium.Math.toDegrees(carto.longitude);

          onLocationSelect(lat, lon);
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      clickHandlerRef.current = handler;
      viewerRef.current = viewer;

      // Notify parent that the viewer is ready
      onGlobeReady?.(viewer);
    };

    initCesium().catch(console.error);

    return () => {
      mounted = false;
      if (clickHandlerRef.current) {
        (clickHandlerRef.current as { destroy(): void }).destroy();
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle fly-to when location prop changes
  useEffect(() => {
    if (!flyToLocation || !viewerRef.current) return;
    const viewer = viewerRef.current;

    const flyTo = async () => {
      const Cesium = await getCesium();
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          flyToLocation.lon,
          flyToLocation.lat,
          1_200_000 // ~1200 km altitude for nice regional view
        ),
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0,
        },
        duration: 2.5,
      });
    };

    flyTo().catch(console.error);
  }, [flyToLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      id="cesium-globe-container"
    />
  );
}
