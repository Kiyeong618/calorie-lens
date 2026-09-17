import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Sparkles } from "@react-three/drei";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Color,
  Matrix4,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type Vector3Tuple,
} from "three";
import type { DailyRecord, MealType, NutritionTarget } from "../../types";
import {
  getFoodDistribution,
  getMacroEnergyRatio,
  getMealDistribution,
  getMealTimes,
  getMonthlyRecords,
} from "../../data/selectors";
import {
  CAMERA_ONLY_DEBUG,
  WORLD_ANCHORS,
  cameraShots,
  getCameraFrame,
} from "./cameraTimeline";

const mealColors = ["#e8b86c", "#e76f51", "#7167d9", "#7ca59b"],
  macroColors = ["#f06445", "#7167e8", "#e6c941"];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
interface DebugInfo {
  progress: number;
  shot: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  roll: number;
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
        : new Vector3(pointer.x * 0.06, pointer.y * 0.04, 0),
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
function Lens({ ratio }: { ratio: number }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[2.05, 0.31, 32, 120]} />
        <meshPhysicalMaterial
          color="#e9eee8"
          transparent
          opacity={0.26}
          transmission={0.9}
          roughness={0.06}
          thickness={2.2}
          ior={1.4}
        />
      </mesh>
      <mesh scale={[1, 1, Math.max(0.1, clamp(ratio, 0, 1.2))]}>
        <cylinderGeometry args={[1.82, 1.82, 0.32, 96]} />
        <meshPhysicalMaterial
          color={ratio > 1 ? "#e76f51" : "#c9ff24"}
          transparent
          opacity={0.2}
          transmission={0.72}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}
function MealShape({
  type,
  index,
  scale = 1,
}: {
  type: MealType;
  index: number;
  scale?: number;
}) {
  return (
    <mesh scale={scale}>
      {type === "breakfast" ? (
        <sphereGeometry args={[0.6, 32, 20]} />
      ) : type === "lunch" ? (
        <icosahedronGeometry args={[0.68, 3]} />
      ) : type === "dinner" ? (
        <torusKnotGeometry args={[0.43, 0.17, 72, 12, 2, 3]} />
      ) : (
        <capsuleGeometry args={[0.38, 0.65, 8, 20]} />
      )}
      <meshPhysicalMaterial
        color={mealColors[index]}
        transparent
        opacity={0.68}
        transmission={0.25}
        roughness={0.3}
      />
    </mesh>
  );
}
function MealOrbit({ record }: { record: DailyRecord }) {
  const times = getMealTimes(record),
    dist = getMealDistribution(record),
    total = Math.max(1, record.totalCalories);
  return (
    <group position={WORLD_ANCHORS.meal}>
      {dist
        .filter((d) => d.calories > 0)
        .map((meal, index) => {
          const minutes =
              times.find((t) => t.type === meal.type)?.minutes ??
              (index + 2) * 240,
            angle = (minutes / 1440) * Math.PI * 2,
            radius = 2.5 + (meal.calories / total - 0.25) * 1.2;
          return (
            <group
              key={meal.type}
              position={[
                Math.sin(angle) * radius,
                Math.cos(angle) * radius,
                Math.sin(angle * 0.5) * 1.2,
              ]}
            >
              <MealShape
                type={meal.type}
                index={index}
                scale={0.55 + (meal.calories / total) * 1.6}
              />
            </group>
          );
        })}
      <Line
        points={Array.from(
          { length: 65 },
          (_, i) =>
            new Vector3(
              Math.sin((i / 64) * Math.PI * 2) * 2.5,
              Math.cos((i / 64) * Math.PI * 2) * 2.5,
              0,
            ),
        )}
        color="#f0eee6"
        transparent
        opacity={0.18}
      />
    </group>
  );
}
function LunchPortal({ record }: { record: DailyRecord }) {
  const lunch = getMealDistribution(record).find(
      (item) => item.type === "lunch",
    ),
    scale =
      0.9 + ((lunch?.calories ?? 0) / Math.max(1, record.totalCalories)) * 2;
  return (
    <group position={WORLD_ANCHORS.lunch}>
      <MealShape type="lunch" index={1} scale={scale} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.025, 8, 64]} />
        <meshBasicMaterial color="#e76f51" transparent opacity={0.32} />
      </mesh>
    </group>
  );
}
function FoodCells({ record }: { record: DailyRecord }) {
  const meal = [...record.meals].sort(
      (a, b) => b.totalCalories - a.totalCalories,
    )[0],
    foods = getFoodDistribution(
      meal ? { ...record, meals: [meal] } : record,
    ).slice(0, 9),
    total = Math.max(1, meal?.totalCalories ?? 1);
  const placements: Vector3Tuple[] = [
    [-0.9, 0.8, 0.8],
    [1.4, -0.7, -0.4],
    [-1.8, -0.9, -2.5],
    [1.1, 1.5, -4],
    [-0.4, -1.7, -5.5],
    [2.2, 0.4, -7],
    [-2.4, 1.1, -8.5],
    [0.5, 2, -10],
    [-1.2, -1.2, -11.5],
  ];
  return (
    <group position={WORLD_ANCHORS.food}>
      {foods.map((food, index) => (
        <mesh
          key={food.id}
          position={placements[index]}
          scale={0.35 + Math.sqrt(food.calories / total)}
        >
          <icosahedronGeometry args={[1, 2]} />
          <meshPhysicalMaterial
            color={mealColors[index % 4]}
            transparent
            opacity={0.78}
            transmission={0.16}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}
function NutritionRibbons({ record }: { record: DailyRecord }) {
  const macro = getMacroEnergyRatio(record),
    shares = [macro.proteinRatio, macro.carbsRatio, macro.fatRatio],
    positions: Vector3Tuple[] = [
      [-1.4, 1.2, -2],
      [0.4, -0.5, -1],
      [2.1, 1.5, -4],
    ];
  return (
    <group position={WORLD_ANCHORS.nutrition}>
      {shares.map((share, index) => (
        <mesh
          key={index}
          position={positions[index]}
          rotation={[
            index === 0 ? 0.08 : -0.06,
            index === 2 ? 0.06 : -0.04,
            index * 0.07 - 0.08,
          ]}
        >
          <boxGeometry args={[0.55 + share * 1.2, 0.18 + share * 0.55, 22]} />
          <meshPhysicalMaterial
            color={macroColors[index]}
            transparent
            opacity={0.74}
            transmission={0.18}
            roughness={0.24}
          />
        </mesh>
      ))}
      <mesh position={[9, 5, -11]} rotation={[Math.PI / 2.6, 0.15, 0.35]}>
        <planeGeometry args={[18, 11]} />
        <meshPhysicalMaterial
          color="#c9ff24"
          transparent
          opacity={0.035 + macro.proteinRatio * 0.04}
          transmission={0.8}
          roughness={0.1}
          side={2}
        />
      </mesh>
    </group>
  );
}
function TimeSpiral({
  records,
  target,
}: {
  records: DailyRecord[];
  target: number;
}) {
  return (
    <group position={WORLD_ANCHORS.time}>
      {getMonthlyRecords(records).map((record, index) => {
        const t = index / 29,
          a = t * Math.PI * 5,
          r = 1.2 + t * 4.2,
          ratio = record.totalCalories / Math.max(1, target);
        return (
          <mesh
            key={record.date}
            position={[Math.cos(a) * r, Math.sin(a) * r, -t * 13]}
            rotation={[Math.PI / 2, a, 0]}
            scale={0.22 + (1 - t) * 0.24}
          >
            <cylinderGeometry args={[1, 1, 0.18 + Math.abs(ratio - 1), 28]} />
            <meshPhysicalMaterial
              color={ratio > 1 ? "#e76f51" : "#9fb3aa"}
              transparent
              opacity={0.22 + (record.consistencyScore ?? 70) / 150}
              transmission={0.58}
              roughness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function DebugGeometry() {
  if (!import.meta.env.DEV) return null;
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
        <group key={name} position={position}>
          <mesh>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshBasicMaterial color="#c9ff24" />
          </mesh>
          <axesHelper args={[1.2]} />
        </group>
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
  const ratio = record.totalCalories / Math.max(1, target.targetCalories);
  return (
    <>
      <CameraDirector progress={progress} onDebug={onDebug} />
      <fog attach="fog" args={["#0e0e0c", 18, 115]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 6]} intensity={5} />
      <pointLight position={[-4, 1, -4]} intensity={10} color="#7167d9" />
      <group position={WORLD_ANCHORS.lens}>
        <Lens ratio={ratio} />
      </group>
      <MealOrbit record={record} />
      <LunchPortal record={record} />
      <FoodCells record={record} />
      <NutritionRibbons record={record} />
      <TimeSpiral records={records} target={target.targetCalories} />
      {!CAMERA_ONLY_DEBUG && (
        <Sparkles
          count={innerWidth < 800 ? 300 : 950}
          scale={[40, 30, 110]}
          size={0.55}
          speed={0.04}
          color={new Color("#d9d5c9")}
          opacity={0.13}
        />
      )}
      <DebugGeometry />
    </>
  );
}
function StaticLens({ ratio }: { ratio: number }) {
  return (
    <div
      className="static-lens"
      style={{ "--fill": `${Math.min(100, ratio * 100)}%` } as CSSProperties}
    >
      <i />
      <span />
    </div>
  );
}
function CameraDebugOverlay({ info }: { info?: DebugInfo }) {
  if (!import.meta.env.DEV || !info) return null;
  const xyz = (value: Vector3Tuple) =>
    value.map((n) => n.toFixed(2)).join(" / ");
  return (
    <output className="camera-debug">
      <b>CAMERA ONLY · {info.shot}</b>
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
    [debugInfo, setDebugInfo] = useState<DebugInfo>();
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
          onDebug={import.meta.env.DEV ? setDebugInfo : undefined}
        />
      </Canvas>
      <CameraDebugOverlay info={debugInfo} />
    </div>
  );
}
