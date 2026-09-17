import { MathUtils, Vector3, type Vector3Tuple } from "three";

export const CAMERA_ONLY_DEBUG = true;

export const WORLD_ANCHORS = {
  lens: [-3, 1, 0],
  meal: [7, -2, -11],
  lunch: [10, 2, -17],
  food: [14, -1, -28],
  nutrition: [-6, 5, -42],
  analysis: [3, 10, -53],
  time: [-8, -3, -78],
} satisfies Record<string, Vector3Tuple>;

export type CameraEase = "sine" | "power2" | "power3";
export interface CameraShot {
  id: string;
  label: string;
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

const deg = MathUtils.degToRad;
export const cameraShots: CameraShot[] = [
  {
    id: "lens-dolly",
    label: "远景推进",
    start: 0,
    end: 0.12,
    cameraFrom: [4, 2, 18],
    cameraTo: [-1.5, 1, 8],
    targetFrom: [0.5, 1, 0],
    targetTo: [0.2, 0.7, -0.5],
    fovFrom: 40,
    fovTo: 36,
    rollFrom: 0,
    rollTo: deg(1),
    easing: "sine",
  },
  {
    id: "lens-close-pass",
    label: "透镜擦镜",
    start: 0.12,
    end: 0.24,
    cameraFrom: [-1.5, 1, 8],
    cameraTo: [-2.3, 0.2, 0.55],
    targetFrom: [0.2, 0.7, -0.5],
    targetTo: [4, -1, -7],
    fovFrom: 36,
    fovTo: 52,
    rollFrom: deg(1),
    rollTo: deg(-3),
    easing: "power2",
  },
  {
    id: "meal-reveal",
    label: "餐次揭示",
    start: 0.24,
    end: 0.36,
    cameraFrom: [-2.3, 0.2, 0.55],
    cameraTo: [8, -1, -8],
    targetFrom: [4, -1, -7],
    targetTo: [7, -2, -11],
    fovFrom: 52,
    fovTo: 43,
    rollFrom: deg(-3),
    rollTo: deg(1),
    easing: "power2",
  },
  {
    id: "meal-orbit",
    label: "餐次环绕",
    start: 0.36,
    end: 0.48,
    cameraFrom: [8, -1, -8],
    cameraTo: [2, 2.5, -12],
    targetFrom: [7, -2, -11],
    targetTo: [8, -1, -12.5],
    fovFrom: 43,
    fovTo: 38,
    rollFrom: deg(1),
    rollTo: deg(2),
    easing: "sine",
  },
  {
    id: "lunch-lock",
    label: "午餐锁定",
    start: 0.48,
    end: 0.6,
    cameraFrom: [2, 2.5, -12],
    cameraTo: [8, 1, -14.5],
    targetFrom: [8, -1, -12.5],
    targetTo: [10, 2, -17],
    fovFrom: 38,
    fovTo: 34,
    rollFrom: deg(2),
    rollTo: deg(-1),
    easing: "power2",
  },
  {
    id: "lunch-fly-through",
    label: "午餐穿越",
    start: 0.6,
    end: 0.72,
    cameraFrom: [8, 1, -14.5],
    cameraTo: [13.2, -0.7, -26.5],
    targetFrom: [11, 1, -20],
    targetTo: [15, -1, -32],
    fovFrom: 34,
    fovTo: 50,
    rollFrom: deg(-1),
    rollTo: deg(-4),
    easing: "power3",
  },
  {
    id: "nutrition-flight",
    label: "营养流飞行",
    start: 0.72,
    end: 0.86,
    cameraFrom: [13.2, -0.7, -26.5],
    cameraTo: [-5, 5, -47],
    targetFrom: [15, -1, -32],
    targetTo: [-4, 7, -56],
    fovFrom: 50,
    fovTo: 45,
    rollFrom: deg(-4),
    rollTo: deg(3),
    easing: "power2",
  },
  {
    id: "time-pull-out",
    label: "时间远拉",
    start: 0.86,
    end: 1,
    cameraFrom: [-5, 5, -47],
    cameraTo: [18, 28, -47],
    targetFrom: [3, 10, -53],
    targetTo: [-8, -3, -78],
    fovFrom: 45,
    fovTo: 52,
    rollFrom: deg(3),
    rollTo: 0,
    easing: "power3",
  },
];

const ease = (value: number, type: CameraEase) =>
  type === "power3"
    ? value < 0.5
      ? 4 * value ** 3
      : 1 - (-2 * value + 2) ** 3 / 2
    : type === "power2"
      ? value < 0.5
        ? 2 * value ** 2
        : 1 - (-2 * value + 2) ** 2 / 2
      : 0.5 - Math.cos(Math.PI * value) / 2;
export const getCameraFrame = (progress: number) => {
  const p = MathUtils.clamp(progress, 0, 1);
  const shot =
    cameraShots.find((item) => p >= item.start && p <= item.end) ??
    cameraShots[cameraShots.length - 1];
  const local = MathUtils.clamp(
      (p - shot.start) / (shot.end - shot.start),
      0,
      1,
    ),
    t = ease(local, shot.easing);
  return {
    shot,
    t,
    position: new Vector3(...shot.cameraFrom).lerp(
      new Vector3(...shot.cameraTo),
      t,
    ),
    target: new Vector3(...shot.targetFrom).lerp(
      new Vector3(...shot.targetTo),
      t,
    ),
    fov: MathUtils.lerp(shot.fovFrom, shot.fovTo, t),
    roll: MathUtils.lerp(shot.rollFrom, shot.rollTo, t),
  };
};
