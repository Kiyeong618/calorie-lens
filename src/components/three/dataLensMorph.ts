export interface DataLensState {
  lensProgress: number;
  mealLayerProgress: number;
  focusProgress: number;
  foodCellProgress: number;
  macroFlowProgress: number;
  flattenProgress: number;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export function getDataLensState(progress: number): DataLensState {
  return {
    lensProgress: 1,
    mealLayerProgress: smooth((progress - 0.18) / 0.14),
    focusProgress: smooth((progress - 0.32) / 0.14),
    foodCellProgress: smooth((progress - 0.42) / 0.12),
    macroFlowProgress: smooth((progress - 0.62) / 0.2),
    flattenProgress: smooth((progress - 0.88) / 0.1),
  };
}
export function getFreezeProgress() {
  if (!import.meta.env.DEV || typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("freeze");
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value) : undefined;
}
export function cameraDebugEnabled() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("cameraDebug")
  );
}
