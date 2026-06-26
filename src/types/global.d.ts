import type * as CesiumType from "cesium";

declare global {
  interface Window {
    Cesium?: typeof CesiumType;
    CESIUM_BASE_URL?: string;
  }
}
