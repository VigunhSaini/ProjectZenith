"use client";

import { useEffect, useRef } from "react";
import type { Viewer, Entity } from "cesium";
import { useISS } from "@/hooks/useISS";

interface ISSMarkerProps {
  viewer: unknown; // Cesium.Viewer reference passed from parent
  observerLat: number | null;
  observerLon: number | null;
}



export default function ISSMarker({
  viewer,
  observerLat,
  observerLon,
}: ISSMarkerProps) {
  const { issPosition } = useISS(observerLat, observerLon);
  const entityRef = useRef<Entity | null>(null);

  useEffect(() => {
    if (!viewer || !issPosition) return;

    const cesiumViewer = viewer as Viewer;

    const updateMarker = () => {
      const Cesium = (window as any).Cesium;
      if (!Cesium) return;

      const position = Cesium.Cartesian3.fromDegrees(
        issPosition.lon,
        issPosition.lat,
        issPosition.altKm * 1000 // metres
      );

      if (entityRef.current) {
        // Remove old entity and recreate with updated position
        if (!cesiumViewer.isDestroyed()) {
          cesiumViewer.entities.remove(entityRef.current);
          entityRef.current = null;
        }
      }

      // Create / recreate glowing ISS marker entity
      const entity = cesiumViewer.entities.add({
        position,
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#FF8C00"),
          outlineColor: Cesium.Color.fromCssColorString("#FF4500"),
          outlineWidth: 2,
          translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.0),
        },
        label: {
          text: "🛰 ISS",
          font: "13px Inter, sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#FF8C00"),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.0),
        },
        id: "iss-entity",
      });
      entityRef.current = entity;
    };

    updateMarker();
  }, [issPosition, viewer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (entityRef.current && viewer) {
        const cesiumViewer = viewer as Viewer;
        if (!cesiumViewer.isDestroyed()) {
          cesiumViewer.entities.remove(entityRef.current);
        }
        entityRef.current = null;
      }
    };
  }, [viewer]);

  return null; // Purely imperative — no DOM output
}
