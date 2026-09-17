import { MathUtils, Vector3, type Vector3Tuple } from "three";

export type CameraEase = "sine" | "power2" | "power3";
export interface CameraShot {
  id: string;
  start: number;
  end: number;
  cameraFrom: Vector3Tuple;
  cameraTo: Vector3Tuple;
  targetFrom: Vector3Tuple;
  targetTo: Vector3Tuple;
  fovFrom: number;
  fovTo: number;
  rollFrom: number;
  rollTo: number;
  easing: CameraEase;
}
export interface CameraDebugInfo {
  progress: number;
  shot: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  roll: number;
}
const degrees = MathUtils.degToRad;

export const CAMERA_SHOTS: CameraShot[] = [
  {
    id: "01 · asymmetric-dolly",
    start: 0,
    end: 0.12,
    cameraFrom: [4, 2, 18],
    cameraTo: [-1.5, 1, 8],
    targetFrom: [0, 1, 0],
    targetTo: [-0.5, 1, 0],
    fovFrom: 42,
    fovTo: 38,
    rollFrom: 0,
    rollTo: 0,
    easing: "sine",
  },
  {
    id: "02 · lens-close-pass",
    start: 0.12,
    end: 0.23,
    cameraFrom: [-1.5, 1, 8],
    cameraTo: [-1.55, 0, 1.1],
    targetFrom: [-0.5, 1, 0],
    targetTo: [-3, 0.7, -0.2],
    fovFrom: 38,
    fovTo: 50,
    rollFrom: 0,
    rollTo: degrees(-3),
    easing: "power2",
  },
  {
    id: "03 · truck-reveal",
    start: 0.23,
    end: 0.36,
    cameraFrom: [-1.55, 0, 1.1],
    cameraTo: [7, -2, 9],
    targetFrom: [-3, 0.7, -0.2],
    targetTo: [-1, 0.2, -1.5],
    fovFrom: 50,
    fovTo: 46,
    rollFrom: degrees(-3),
    rollTo: 0,
    easing: "power3",
  },
  {
    id: "04 · meal-orbit",
    start: 0.36,
    end: 0.5,
    cameraFrom: [7, -2, 9],
    cameraTo: [2.4, 3, 7.2],
    targetFrom: [-1, 0.2, -1.5],
    targetTo: [-3, 1, 0],
    fovFrom: 46,
    fovTo: 40,
    rollFrom: 0,
    rollTo: degrees(2),
    easing: "sine",
  },
  {
    id: "05 · lunch-lock-on",
    start: 0.5,
    end: 0.62,
    cameraFrom: [2.4, 3, 7.2],
    cameraTo: [-0.2, 0.4, 3.5],
    targetFrom: [-3, 1, 0],
    targetTo: [-2.55, 0.37, 0.8],
    fovFrom: 40,
    fovTo: 34,
    rollFrom: degrees(2),
    rollTo: degrees(-1),
    easing: "power2",
  },
  {
    id: "06 · food-fly-through",
    start: 0.62,
    end: 0.74,
    cameraFrom: [-0.2, 0.4, 3.5],
    cameraTo: [-3.25, 0.7, -0.8],
    targetFrom: [-2.55, 0.37, 0.8],
    targetTo: [-3, 0.2, -4.5],
    fovFrom: 34,
    fovTo: 51,
    rollFrom: degrees(-1),
    rollTo: degrees(-4),
    easing: "power3",
  },
  {
    id: "07 · nutrition-flight",
    start: 0.74,
    end: 0.87,
    cameraFrom: [-3.25, 0.7, -0.8],
    cameraTo: [-0.7, 2.2, 1],
    targetFrom: [-3, 0.2, -4.5],
    targetTo: [2.5, 3, 1.4],
    fovFrom: 51,
    fovTo: 44,
    rollFrom: degrees(-4),
    rollTo: degrees(3),
    easing: "power2",
  },
  {
    id: "08 · crane-pull-out",
    start: 0.87,
    end: 1,
    cameraFrom: [-0.7, 2.2, 1],
    cameraTo: [18, 28, 40],
    targetFrom: [2.5, 3, 1.4],
    targetTo: [-3, 1, 0],
    fovFrom: 44,
    fovTo: 52,
    rollFrom: degrees(3),
    rollTo: 0,
    easing: "power3",
  },
];
export const WORLD_ANCHORS = {
  lens: [-3, 1, 0],
  mealDepth: [-3, 1, 1.2],
  lunchSurface: [-2.55, 0.37, 0.8],
  foodChannel: [-3, 0.2, -4.5],
  proteinTip: [-6.75, 1.9, -0.15],
  carbsTip: [0.25, 2.75, 0.75],
  fatTip: [-1.7, -1.55, -0.45],
  pullOut: [18, 28, 40],
} satisfies Record<string, Vector3Tuple>;
const ease = (value: number, easing: CameraEase) => {
  const t = Math.max(0, Math.min(1, value));
  if (easing === "sine") return -(Math.cos(Math.PI * t) - 1) / 2;
  if (easing === "power3")
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
export function getCameraFrame(progress: number) {
  const value = Math.max(0, Math.min(1, progress)),
    shot =
      CAMERA_SHOTS.find((item) => value >= item.start && value <= item.end) ??
      CAMERA_SHOTS[CAMERA_SHOTS.length - 1],
    local = ease((value - shot.start) / (shot.end - shot.start), shot.easing);
  return {
    shot,
    position: new Vector3(...shot.cameraFrom).lerp(
      new Vector3(...shot.cameraTo),
      local,
    ),
    target: new Vector3(...shot.targetFrom).lerp(
      new Vector3(...shot.targetTo),
      local,
    ),
    fov: MathUtils.lerp(shot.fovFrom, shot.fovTo, local),
    roll: MathUtils.lerp(shot.rollFrom, shot.rollTo, local),
  };
}
