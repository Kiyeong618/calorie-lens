import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Line, Sparkles } from "@react-three/drei";
import { useMemo, useRef, type CSSProperties } from "react";
import { Color, Group, MathUtils, PerspectiveCamera, Vector3 } from "three";
import type { DailyRecord, MealType, NutritionTarget } from "../../types";
import {
  getFoodDistribution,
  getMacroEnergyRatio,
  getMealDistribution,
  getMealTimes,
  getMonthlyRecords,
} from "../../data/selectors";
import {
  cameraPositionCurve,
  cameraTargetCurve,
  getFov,
} from "./cameraTimeline";
const mealColors = ["#e8b86c", "#e76f51", "#7167d9", "#7ca59b"],
  macroColors = ["#f06445", "#7167e8", "#e6c941"];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
function CameraRig({ progress }: { progress: number }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const p = clamp(progress),
      pos = cameraPositionCurve.getPointAt(p);
    cameraTargetCurve.getPointAt(p, target);
    camera.position.lerp(
      pos.add(new Vector3(pointer.x * 0.08, pointer.y * 0.05, 0)),
      0.075,
    );
    camera.lookAt(target);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, getFov(p), 0.06);
    perspective.updateProjectionMatrix();
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
  scale,
}: {
  type: MealType;
  index: number;
  scale: number;
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
        opacity={0.64}
        transmission={0.28}
        roughness={0.3}
      />
    </mesh>
  );
}
function MealOrbit({
  record,
  visible,
}: {
  record: DailyRecord;
  visible: number;
}) {
  const times = getMealTimes(record),
    dist = getMealDistribution(record),
    total = Math.max(1, record.totalCalories);
  return (
    <group position={[0, 0, -4.8]} scale={visible}>
      {dist
        .filter((d) => d.calories > 0)
        .map((meal, index) => {
          const minutes =
              times.find((t) => t.type === meal.type)?.minutes ??
              (index + 2) * 240,
            angle = (minutes / 1440) * Math.PI * 2,
            radius = 2.5 + (meal.calories / total - 0.25) * 1.2;
          return (
            <Float key={meal.type} speed={0.5} floatIntensity={0.08}>
              <group
                position={[
                  Math.sin(angle) * radius,
                  Math.cos(angle) * radius,
                  Math.sin(angle * 0.5) * 0.6,
                ]}
              >
                <MealShape
                  type={meal.type}
                  index={index}
                  scale={0.5 + (meal.calories / total) * 1.5}
                />
              </group>
            </Float>
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
        opacity={0.16}
      />
    </group>
  );
}
function FoodCells({
  record,
  visible,
}: {
  record: DailyRecord;
  visible: number;
}) {
  const meal = [...record.meals].sort(
      (a, b) => b.totalCalories - a.totalCalories,
    )[0],
    foods = getFoodDistribution(
      meal ? { ...record, meals: [meal] } : record,
    ).slice(0, 9),
    total = Math.max(1, meal?.totalCalories ?? 1);
  return (
    <group position={[0, 0, -9.8]} scale={visible}>
      {foods.map((food, index) => {
        const a = (index / Math.max(1, foods.length)) * Math.PI * 2;
        return (
          <mesh
            key={food.id}
            position={[
              Math.cos(a) * (1.1 + (index % 3) * 0.45),
              Math.sin(a) * (1.1 + (index % 3) * 0.45),
              (index % 2) * 1.3,
            ]}
            scale={0.25 + Math.sqrt(food.calories / total)}
          >
            <icosahedronGeometry args={[1, 2]} />
            <meshPhysicalMaterial
              color={mealColors[index % 4]}
              transparent
              opacity={0.75}
              transmission={0.18}
              roughness={0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function Ribbons({
  record,
  visible,
  flat,
}: {
  record: DailyRecord;
  visible: number;
  flat: number;
}) {
  const macro = getMacroEnergyRatio(record),
    shares = [macro.proteinRatio, macro.carbsRatio, macro.fatRatio];
  return (
    <group position={[0, 0, -14]} scale={[1, 1, 1 - flat * 0.94]}>
      {shares.map((share, index) => (
        <mesh
          key={index}
          position={[0, (index - 1) * 1.15, 0]}
          rotation={[0, 0, index * 0.12 - 0.1]}
          scale={[visible, 1, 1]}
        >
          <boxGeometry args={[8, 0.18 + share * 0.72, 0.16]} />
          <meshPhysicalMaterial
            color={macroColors[index]}
            transparent
            opacity={0.72}
            transmission={0.2}
            roughness={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}
function TimeSpiral({
  records,
  target,
  visible,
}: {
  records: DailyRecord[];
  target: number;
  visible: number;
}) {
  return (
    <group position={[0, 0, -20]} scale={visible}>
      {getMonthlyRecords(records).map((record, index) => {
        const t = index / 29,
          a = t * Math.PI * 5,
          r = 1.2 + t * 4.2,
          ratio = record.totalCalories / Math.max(1, target);
        return (
          <mesh
            key={record.date}
            position={[Math.cos(a) * r, Math.sin(a) * r, -t * 10]}
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
function World({
  progress,
  record,
  records,
  target,
}: {
  progress: number;
  record: DailyRecord;
  records: DailyRecord[];
  target: NutritionTarget;
}) {
  const root = useRef<Group>(null),
    ratio = record.totalCalories / Math.max(1, target.targetCalories);
  useFrame((_, delta) => {
    if (root.current) root.current.rotation.z += delta * 0.002;
  });
  return (
    <>
      <CameraRig progress={progress} />
      <fog attach="fog" args={["#0e0e0c", 9, 34]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 6]} intensity={5} />
      <pointLight position={[-4, 1, -4]} intensity={10} color="#7167d9" />
      <group ref={root}>
        <Lens ratio={ratio} />
        <MealOrbit record={record} visible={phase(progress, 0.25, 0.37)} />
        <FoodCells
          record={record}
          visible={
            phase(progress, 0.53, 0.65) * (1 - phase(progress, 0.79, 0.86))
          }
        />
        <Ribbons
          record={record}
          visible={phase(progress, 0.72, 0.82)}
          flat={phase(progress, 0.86, 0.96)}
        />
        <TimeSpiral
          records={records}
          target={target.targetCalories}
          visible={phase(progress, 0.93, 1)}
        />
        <Sparkles
          count={innerWidth < 800 ? 300 : 950}
          scale={[16, 12, 30]}
          size={0.55}
          speed={0.04}
          color={new Color("#d9d5c9")}
          opacity={0.13}
        />
      </group>
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
    mobile = typeof window !== "undefined" && window.innerWidth < 760;
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
        camera={{ position: [0, 0.3, 13], fov: 38, near: 0.08, far: 70 }}
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
        />
      </Canvas>
    </div>
  );
}
