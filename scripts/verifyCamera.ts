import { MathUtils, Vector3 } from "three";
import {
  CAMERA_SHOTS,
  WORLD_ANCHORS,
} from "../src/components/three/cameraShots.ts";

if (CAMERA_SHOTS.length !== 8)
  throw new Error("Camera Director must contain eight shots");
for (let index = 1; index < CAMERA_SHOTS.length; index++) {
  const previous = CAMERA_SHOTS[index - 1];
  const current = CAMERA_SHOTS[index];
  if (
    new Vector3(...previous.cameraTo).distanceTo(
      new Vector3(...current.cameraFrom),
    ) > 0.001
  )
    throw new Error(`Camera path jumps before ${current.id}`);
  if (
    new Vector3(...previous.targetTo).distanceTo(
      new Vector3(...current.targetFrom),
    ) > 0.001
  )
    throw new Error(`Target path jumps before ${current.id}`);
}

const points = CAMERA_SHOTS.flatMap((shot) => [shot.cameraFrom, shot.cameraTo]);
const range = (axis: number) => {
  const values = points.map((point) => point[axis]);
  return Math.max(...values) - Math.min(...values);
};
if (range(0) < 12 || range(1) < 12 || range(2) < 20)
  throw new Error("Camera path is still an axial corridor");

const pullOut = CAMERA_SHOTS[7];
const pullOutDistance = new Vector3(...pullOut.cameraFrom).distanceTo(
  new Vector3(...pullOut.cameraTo),
);
if (pullOutDistance < 20) throw new Error("Final pull-out is too short");

const closePass = CAMERA_SHOTS[1];
const lens = new Vector3(...WORLD_ANCHORS.lens);
const closePoint = new Vector3(...closePass.cameraTo);
const projectedRadius = Math.hypot(
  closePoint.x - lens.x,
  closePoint.y - lens.y,
);
const surfaceDistance = Math.abs(closePoint.z - lens.z);
if (projectedRadius > 3.25 || surfaceDistance > 1.2)
  throw new Error("Lens close pass cannot create foreground occlusion");

const food = CAMERA_SHOTS[5];
if (!(food.cameraFrom[2] > 0 && food.cameraTo[2] < 0))
  throw new Error("Food shot does not fly through the surface plane");

const nutrition = CAMERA_SHOTS[6];
for (const point of [nutrition.cameraFrom, nutrition.cameraTo]) {
  if (
    point[0] < -7 ||
    point[0] > 1 ||
    point[1] < -2 ||
    point[1] > 5 ||
    point[2] < -2 ||
    point[2] > 3
  )
    throw new Error("Nutrition camera is outside the macro sculpture");
}

const fovs = CAMERA_SHOTS.flatMap((shot) => [shot.fovFrom, shot.fovTo]);
const rolls = CAMERA_SHOTS.flatMap((shot) => [shot.rollFrom, shot.rollTo]);
if (Math.min(...fovs) < 34 || Math.max(...fovs) > 52)
  throw new Error("FOV left the accepted range");
if (Math.max(...rolls.map((value) => Math.abs(MathUtils.radToDeg(value)))) > 6)
  throw new Error("Camera roll is excessive");

console.log(
  JSON.stringify(
    {
      shots: CAMERA_SHOTS.map((shot) => shot.id),
      cameraRange: { x: range(0), y: range(1), z: range(2) },
      closePass: { projectedRadius, surfaceDistance },
      pullOutDistance: +pullOutDistance.toFixed(2),
      fovRange: [Math.min(...fovs), Math.max(...fovs)],
      rollRangeDegrees: [
        +MathUtils.radToDeg(Math.min(...rolls)).toFixed(1),
        +MathUtils.radToDeg(Math.max(...rolls)).toFixed(1),
      ],
    },
    null,
    2,
  ),
);
