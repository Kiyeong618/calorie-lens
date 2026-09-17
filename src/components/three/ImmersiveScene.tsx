import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BackSide,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  MathUtils,
  PerspectiveCamera,
  QuadraticBezierCurve3,
  Quaternion,
  Vector3,
  type Vector3Tuple,
} from "three";
import type { DailyRecord, NutritionTarget } from "../../types";
import {
  getFoodDistribution,
  getMacroEnergyRatio,
  getMealDistribution,
  getMonthlyRecords,
} from "../../data/selectors";
import {
  CAMERA_ONLY_DEBUG,
  WORLD_ANCHORS,
  cameraShots,
  getCameraFrame,
} from "./cameraTimeline";

const glass = "#edeae1",
  foodTints = ["#ded8c9", "#b8b0a6", "#d8cc8f", "#87978b"],
  macroColors = ["#f06445", "#7167e8", "#e6c941"];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const visibilityPhase = (
  p: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
) =>
  Math.min(
    smooth((p - enterStart) / (enterEnd - enterStart)),
    1 - smooth((p - exitStart) / (exitEnd - exitStart)),
  );
const showCameraDebug = () =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("cameraDebug");
interface DebugInfo {
  progress: number;
  shot: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  roll: number;
}

function createLensSurface(
  radius: number,
  depth: number,
  segments = 96,
  rings = 6,
  seed = 0,
) {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    indices: number[] = [];
  const topCenter = 0,
    bottomCenter = 1;
  positions.push(0, 0, depth / 2, 0, 0, -depth / 2);
  const ringIndex = (side: number, ring: number, segment: number) =>
    2 + side * rings * segments + (ring - 1) * segments + (segment % segments);
  for (let side = 0; side < 2; side++)
    for (let ring = 1; ring <= rings; ring++) {
      const f = ring / rings;
      for (let segment = 0; segment < segments; segment++) {
        const angle = (segment / segments) * Math.PI * 2,
          edge =
            1 +
            (Math.sin(angle * 3 + seed) * 0.018 +
              Math.cos(angle * 5 - seed) * 0.009) *
              f *
              f,
          r = radius * f * edge,
          z = (depth / 2) * (1 - 0.56 * f * f) * (side ? -1 : 1);
        positions.push(Math.cos(angle) * r, Math.sin(angle) * r, z);
      }
    }
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(topCenter, ringIndex(0, 1, segment), ringIndex(0, 1, next));
    indices.push(bottomCenter, ringIndex(1, 1, next), ringIndex(1, 1, segment));
  }
  for (let ring = 1; ring < rings; ring++)
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments,
        a = ringIndex(0, ring, segment),
        b = ringIndex(0, ring, next),
        c = ringIndex(0, ring + 1, segment),
        d = ringIndex(0, ring + 1, next),
        e = ringIndex(1, ring, segment),
        f = ringIndex(1, ring, next),
        g = ringIndex(1, ring + 1, segment),
        h = ringIndex(1, ring + 1, next);
      indices.push(a, c, b, b, c, d, e, f, g, f, h, g);
    }
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments,
      a = ringIndex(0, rings, segment),
      b = ringIndex(0, rings, next),
      c = ringIndex(1, rings, segment),
      d = ringIndex(1, rings, next);
    indices.push(a, c, b, b, c, d);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
function createCellSurface(
  radius: number,
  start: number,
  end: number,
  seed: number,
) {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    indices: number[] = [],
    radial = 7,
    angular = Math.max(8, Math.round((end - start) * 18));
  for (let r = 0; r <= radial; r++) {
    const rf = r / radial;
    for (let a = 0; a <= angular; a++) {
      const af = a / angular,
        bend = Math.sin(rf * Math.PI) * Math.sin(af * Math.PI) * 0.055,
        angle =
          MathUtils.lerp(start + 0.018, end - 0.018, af) +
          bend * (seed % 2 ? 1 : -1),
        edge = 1 + Math.sin(angle * 3 + seed) * 0.018 * rf,
        rr = radius * rf * edge;
      positions.push(
        Math.cos(angle) * rr,
        Math.sin(angle) * rr,
        0.08 * (1 - rf * rf) + seed * 0.012,
      );
    }
  }
  for (let r = 0; r < radial; r++)
    for (let a = 0; a < angular; a++) {
      const row = angular + 1,
        i = r * row + a;
      indices.push(i, i + row, i + 1, i + 1, i + row, i + row + 1);
    }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function createRibbonSurface(width: number, index: number) {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    indices: number[] = [],
    steps = 52,
    curve = new QuadraticBezierCurve3(
      new Vector3(-9, -3 + index * 2, -7),
      new Vector3(index === 1 ? 0 : -2, 4 - index * 0.7, 0),
      new Vector3(9, 3 - index * 1.35, 7),
    );
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      point = curve.getPoint(t),
      tangent = curve.getTangent(t),
      side = new Vector3()
        .crossVectors(tangent, new Vector3(0, 0, 1))
        .normalize(),
      pulse = 0.72 + Math.sin(t * Math.PI) * 0.28,
      w = width * pulse;
    positions.push(
      ...point
        .clone()
        .addScaledVector(side, w / 2)
        .toArray(),
      ...point
        .clone()
        .addScaledVector(side, -w / 2)
        .toArray(),
    );
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2,
      b = a + 1,
      c = a + 2,
      d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function CameraDirector({
  progress,
  onDebug,
}: {
  progress: number;
  onDebug?: (info: DebugInfo) => void;
}) {
  const { camera, pointer } = useThree();
  const matrix = useMemo(() => new Matrix4(), []),
    look = useMemo(() => new Quaternion(), []),
    roll = useMemo(() => new Quaternion(), []),
    zAxis = useMemo(() => new Vector3(0, 0, 1), []),
    up = useMemo(() => new Vector3(0, 1, 0), []);
  const tick = useRef(0);
  useFrame(() => {
    const frame = getCameraFrame(progress),
      micro = CAMERA_ONLY_DEBUG
        ? new Vector3()
        : new Vector3(pointer.x * 0.04, pointer.y * 0.03, 0),
      destination = frame.position.clone().add(micro);
    camera.position.lerp(destination, 0.16);
    matrix.lookAt(camera.position, frame.target, up);
    look.setFromRotationMatrix(matrix);
    roll.setFromAxisAngle(zAxis, frame.roll);
    look.multiply(roll);
    camera.quaternion.slerp(look, 0.18);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, frame.fov, 0.16);
    perspective.updateProjectionMatrix();
    if (onDebug && tick.current++ % 6 === 0)
      onDebug({
        progress,
        shot: frame.shot.label,
        position: camera.position.toArray(),
        target: frame.target.toArray(),
        fov: perspective.fov,
        roll: MathUtils.radToDeg(frame.roll),
      });
  });
  return null;
}
function GlassMaterial({
  opacity = 0.56,
  tint = glass,
}: {
  opacity?: number;
  tint?: string;
}) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transparent
      opacity={opacity}
      transmission={0.82}
      thickness={1.5}
      ior={1.38}
      roughness={0.12}
      clearcoat={0.65}
      side={DoubleSide}
      depthWrite={false}
    />
  );
}
function LiquidLens({ ratio, amount }: { ratio: number; amount: number }) {
  const shell = useMemo(() => createLensSurface(2.8, 0.72, 112, 7, 0.4), []),
    core = useMemo(() => createLensSurface(2.38, 0.26, 96, 6, 1.2), []);
  return (
    <group
      position={WORLD_ANCHORS.lens}
      visible={amount > 0.01}
      scale={0.96 + amount * 0.04}
    >
      <mesh geometry={shell}>
        <GlassMaterial opacity={amount * 0.62} />
      </mesh>
      <mesh
        geometry={core}
        position={[0, -0.22 + (1 - clamp(ratio, 0, 1.15)) * 0.35, 0.02]}
        scale={[0.96, 0.35 + clamp(ratio, 0, 1.15) * 0.55, 0.94]}
      >
        <GlassMaterial
          opacity={amount * 0.24}
          tint={ratio > 1 ? "#d9b4a4" : "#dce4c7"}
        />
      </mesh>
      <mesh geometry={shell} scale={1.012}>
        <meshBasicMaterial
          color="#f5f1e8"
          transparent
          opacity={amount * 0.11}
          side={BackSide}
        />
      </mesh>
    </group>
  );
}
function MealLayers({
  record,
  amount,
  focus,
}: {
  record: DailyRecord;
  amount: number;
  focus: number;
}) {
  const meals = getMealDistribution(record).filter((item) => item.calories > 0),
    total = Math.max(1, record.totalCalories);
  const geometries = useMemo(
    () =>
      getMealDistribution(record)
        .filter((item) => item.calories > 0)
        .map((meal, index) =>
          createLensSurface(
            2.55,
            0.08 + (meal.calories / total) * 0.7,
            88,
            5,
            index * 0.7,
          ),
        ),
    [record, total],
  );
  return (
    <group position={WORLD_ANCHORS.meal} visible={amount > 0.01}>
      {meals.map((meal, index) => {
        const isLunch = meal.type === "lunch",
          z =
            (index - (meals.length - 1) / 2) * (0.28 + amount * 0.62) +
            (isLunch ? focus * 0.28 : 0),
          opacity =
            amount * (isLunch ? 0.5 : MathUtils.lerp(0.3, 0.045, focus));
        return (
          <mesh
            key={meal.type}
            geometry={geometries[index]}
            position={[0, (index - 1.5) * 0.08, z]}
          >
            <GlassMaterial opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}
function LunchLayer({
  record,
  amount,
}: {
  record: DailyRecord;
  amount: number;
}) {
  const lunch = getMealDistribution(record).find(
      (item) => item.type === "lunch",
    ),
    share = (lunch?.calories ?? 0) / Math.max(1, record.totalCalories),
    geometry = useMemo(
      () => createLensSurface(3.15, 0.18 + share * 0.78, 108, 7, 1.8),
      [share],
    );
  return (
    <group
      position={WORLD_ANCHORS.lunch}
      visible={amount > 0.01}
      scale={0.88 + amount * 0.12}
    >
      <mesh geometry={geometry}>
        <GlassMaterial opacity={amount * 0.58} />
      </mesh>
      <mesh geometry={geometry} scale={1.015}>
        <meshBasicMaterial
          color="#f0eee6"
          transparent
          opacity={amount * 0.1}
          side={BackSide}
        />
      </mesh>
    </group>
  );
}
function FoodCellSubdivision({
  record,
  amount,
}: {
  record: DailyRecord;
  amount: number;
}) {
  const cells = useMemo(() => {
    const meal = [...record.meals].sort(
        (a, b) => b.totalCalories - a.totalCalories,
      )[0],
      foods = getFoodDistribution(
        meal ? { ...record, meals: [meal] } : record,
      ).slice(0, 4),
      total = Math.max(
        1,
        foods.reduce((sum, food) => sum + food.calories, 0),
      );
    let cursor = -Math.PI * 0.76;
    return foods.map((food, index) => {
      const span = (food.calories / total) * Math.PI * 2,
        next = cursor + span,
        geometry = createCellSurface(3.65, cursor, next, index + 1);
      cursor = next;
      return { food, geometry, share: food.calories / total };
    });
  }, [record]);
  const base = useMemo(() => createLensSurface(3.72, 0.12, 112, 6, 2.4), []);
  return (
    <group
      position={WORLD_ANCHORS.food}
      visible={amount > 0.01}
      rotation={[0, 0.08, -0.16]}
      scale={0.92 + amount * 0.08}
    >
      <mesh geometry={base} position={[0, 0, -0.08]}>
        <GlassMaterial opacity={amount * 0.12} />
      </mesh>
      {cells.map(({ food, geometry, share }, index) => (
        <mesh
          key={food.id}
          geometry={geometry}
          position={[0, 0, index * 0.018]}
        >
          <GlassMaterial
            opacity={amount * (0.34 + share * 0.28)}
            tint={foodTints[index]}
          />
        </mesh>
      ))}
    </group>
  );
}
function NutritionRibbons({
  record,
  amount,
  flatten,
}: {
  record: DailyRecord;
  amount: number;
  flatten: number;
}) {
  const macro = getMacroEnergyRatio(record),
    shares = [macro.proteinRatio, macro.carbsRatio, macro.fatRatio],
    geometries = useMemo(() => {
      const value = getMacroEnergyRatio(record);
      return [value.proteinRatio, value.carbsRatio, value.fatRatio].map(
        (share, index) => createRibbonSurface(0.45 + share * 2.8, index),
      );
    }, [record]);
  return (
    <group
      position={WORLD_ANCHORS.nutrition}
      visible={amount > 0.01}
      scale={[1, 1, 1 - flatten * 0.84]}
      rotation={[0, 0.08, -0.08]}
    >
      {shares.map((share, index) => (
        <mesh
          key={index}
          geometry={geometries[index]}
          position={[0, index * 0.2, 0]}
        >
          <meshPhysicalMaterial
            color={macroColors[index]}
            transparent
            opacity={amount * (0.7 + share * 0.25)}
            transmission={0.25}
            thickness={0.65}
            roughness={0.2}
            clearcoat={0.4}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
function TimeForm({
  records,
  target,
  amount,
}: {
  records: DailyRecord[];
  target: number;
  amount: number;
}) {
  const geometry = useMemo(() => createLensSurface(0.68, 0.12, 48, 4, 0.8), []),
    month = getMonthlyRecords(records);
  return (
    <group position={WORLD_ANCHORS.time} visible={amount > 0.01}>
      {month.map((record, index) => {
        const t = index / Math.max(1, month.length - 1),
          ratio = record.totalCalories / Math.max(1, target),
          consistency = (record.consistencyScore ?? 0) / 100;
        return (
          <mesh
            key={record.date}
            geometry={geometry}
            position={[t * 16 - 8, Math.sin(t * Math.PI) * 5.2, -t * 22]}
            rotation={[0.08 + t * 0.35, -0.25 + t * 0.45, -0.1 + t * 0.18]}
            scale={[
              0.62 + (1 - t) * 0.5,
              0.62 + (1 - t) * 0.5,
              0.7 + Math.abs(ratio - 1) * 1.5,
            ]}
          >
            <GlassMaterial
              opacity={amount * (0.16 + consistency * 0.38)}
              tint={ratio > 1 ? "#d7c5bc" : "#d9dfd6"}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function DebugGeometry() {
  if (!showCameraDebug()) return null;
  const cameraPoints = cameraShots.flatMap((shot, index) =>
      index
        ? [new Vector3(...shot.cameraTo)]
        : [new Vector3(...shot.cameraFrom), new Vector3(...shot.cameraTo)],
    ),
    targetPoints = cameraShots.flatMap((shot, index) =>
      index
        ? [new Vector3(...shot.targetTo)]
        : [new Vector3(...shot.targetFrom), new Vector3(...shot.targetTo)],
    );
  return (
    <group>
      <Line points={cameraPoints} color="#00e5ff" lineWidth={2} />
      <Line points={targetPoints} color="#ff3bd4" lineWidth={2} />
      {Object.entries(WORLD_ANCHORS).map(([name, position]) => (
        <axesHelper key={name} args={[1.1]} position={position} />
      ))}
    </group>
  );
}
function World({
  progress,
  record,
  records,
  target,
  onDebug,
}: {
  progress: number;
  record: DailyRecord;
  records: DailyRecord[];
  target: NutritionTarget;
  onDebug?: (info: DebugInfo) => void;
}) {
  const ratio = record.totalCalories / Math.max(1, target.targetCalories),
    lens = 1 - smooth((progress - 0.22) / 0.07),
    layers = visibilityPhase(progress, 0.2, 0.27, 0.48, 0.55),
    lunch = visibilityPhase(progress, 0.4, 0.47, 0.6, 0.67),
    cells = visibilityPhase(progress, 0.55, 0.62, 0.72, 0.79),
    ribbons = visibilityPhase(progress, 0.68, 0.75, 0.85, 0.92),
    time = smooth((progress - 0.83) / 0.12),
    focus = smooth((progress - 0.4) / 0.12),
    flatten = smooth((progress - 0.79) / 0.12);
  return (
    <>
      <CameraDirector progress={progress} onDebug={onDebug} />
      <fog attach="fog" args={["#0e0e0c", 20, 118]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[8, 10, 12]}
        intensity={4.8}
        color="#fff5df"
      />
      <directionalLight position={[-8, 1, 6]} intensity={1.4} color="#d8d8d2" />
      <directionalLight
        position={[-5, 9, -10]}
        intensity={3.2}
        color="#d9e4e8"
      />
      <LiquidLens ratio={ratio} amount={lens} />
      <MealLayers record={record} amount={layers} focus={focus} />
      <LunchLayer record={record} amount={lunch} />
      <FoodCellSubdivision record={record} amount={cells} />
      <NutritionRibbons record={record} amount={ribbons} flatten={flatten} />
      <TimeForm
        records={records}
        target={target.targetCalories}
        amount={time}
      />
      <DebugGeometry />
    </>
  );
}
function StaticLens({ ratio }: { ratio: number }) {
  return (
    <div
      className="static-lens liquid-static"
      style={{ "--fill": `${Math.min(100, ratio * 100)}%` } as CSSProperties}
    >
      <i />
      <span />
    </div>
  );
}
function CameraDebugOverlay({ info }: { info?: DebugInfo }) {
  if (!showCameraDebug() || !info) return null;
  const xyz = (value: Vector3Tuple) =>
    value.map((n) => n.toFixed(2)).join(" / ");
  return (
    <output className="camera-debug">
      <b>CAMERA DEBUG · {info.shot}</b>
      <span>Progress: {info.progress.toFixed(3)}</span>
      <span>Camera: {xyz(info.position)}</span>
      <span>Target: {xyz(info.target)}</span>
      <span>FOV: {info.fov.toFixed(1)}°</span>
      <span>Roll: {info.roll.toFixed(1)}°</span>
    </output>
  );
}
export function ImmersiveScene({
  progress,
  record,
  records,
  target,
  reduced = false,
}: {
  progress: number;
  record: DailyRecord;
  records: DailyRecord[];
  target: NutritionTarget;
  reduced?: boolean;
}) {
  const ratio = record.totalCalories / Math.max(1, target.targetCalories),
    mobile = typeof window !== "undefined" && window.innerWidth < 760,
    [debugInfo, setDebugInfo] = useState<DebugInfo>(),
    debug = showCameraDebug();
  if (mobile || reduced)
    return (
      <div className="immersive-canvas mobile-static" aria-hidden="true">
        <StaticLens ratio={ratio} />
      </div>
    );
  return (
    <div className="immersive-canvas" aria-hidden="true">
      <Canvas
        fallback={<StaticLens ratio={ratio} />}
        dpr={[1, Math.min(1.65, window.devicePixelRatio)]}
        camera={{ position: [4, 2, 18], fov: 40, near: 0.05, far: 160 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <World
          progress={progress}
          record={record}
          records={records}
          target={target}
          onDebug={debug ? setDebugInfo : undefined}
        />
      </Canvas>
      <CameraDebugOverlay info={debugInfo} />
    </div>
  );
}
