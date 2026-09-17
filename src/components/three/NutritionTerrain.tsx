import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Group,
  MathUtils,
  MeshPhysicalMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import type { DailyRecord, NutritionTarget } from "../../types";
import { createNutritionTerrainGeometry } from "./NutritionTerrainGeometry";
import { createNutritionTerrainMaterial } from "./NutritionTerrainShader";
import { mapDataLens } from "./sceneMapping";
import { getTerrainState } from "./terrainTimeline";

const trailColors = ["#ff4c36", "#5661ff", "#f0d94e"];
const trailPaths = [
  [
    [-4.12, 0.66, 0.24],
    [-4.48, 0.86, 0.4],
    [-4.62, 1.3, 0.78],
    [-4.4, 1.72, 1.18],
    [-3.92, 1.88, 1.46],
    [-3.5, 1.64, 1.62],
  ],
  [
    [4.08, 0.76, 0.24],
    [4.42, 0.94, 0.42],
    [4.62, 1.28, 0.78],
    [4.5, 1.68, 1.18],
    [4.08, 1.9, 1.48],
    [3.62, 1.7, 1.68],
  ],
  [
    [1.38, -2.38, 0.22],
    [1.5, -2.72, 0.42],
    [1.28, -3.02, 0.78],
    [0.78, -3.14, 1.16],
    [0.28, -2.98, 1.48],
    [0.08, -2.58, 1.66],
  ],
] as const;

const mealLabels = ["早餐", "午餐", "晚餐", "加餐"];
const mealPositions = [
  [-2.25, 0.82, 0.45],
  [0.12, 0.45, 0.72],
  [2.06, -0.55, 0.52],
  [-1.8, -1.02, 0.34],
] as const;

function NutrientTrails({ amount, shares }: { amount: number; shares: number[] }) {
  const root = useRef<Group>(null);
  const materials = useRef<(MeshPhysicalMaterial | null)[]>([]);
  const geometries = useMemo(
    () =>
      trailPaths.map((path, index) => {
        const curve = new CatmullRomCurve3(
          path.map(([x, y, z]) => new Vector3(x, y, z)),
        );
        return new TubeGeometry(
          curve,
          96,
          0.045 + (shares[index] ?? 0.33) * 0.18,
          18,
          false,
        );
      }),
    [shares],
  );

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useFrame(({ clock }) => {
    if (root.current) {
      const reveal = MathUtils.smoothstep(amount, 0.22, 0.92);
      root.current.scale.setScalar(MathUtils.lerp(0.82, 1, reveal));
      root.current.rotation.z = Math.sin(clock.elapsedTime * 0.24) * 0.012 * reveal;
    }
    materials.current.forEach((material) => {
      if (!material) return;
      const opacity = MathUtils.smoothstep(amount, 0.13, 0.68) * 0.94;
      material.opacity = opacity;
      material.visible = opacity > 0.004;
    });
  });

  return (
    <group ref={root}>
      {geometries.map((geometry, index) => (
        <mesh key={trailColors[index]} geometry={geometry}>
          <meshPhysicalMaterial
            ref={(material) => {
              materials.current[index] = material;
            }}
            color={trailColors[index]}
            emissive={trailColors[index]}
            emissiveIntensity={0.16}
            roughness={0.18}
            metalness={0.08}
            transmission={0.18}
            thickness={0.8}
            clearcoat={0.9}
            clearcoatRoughness={0.16}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      {trailPaths.map((path, index) => {
        const end = path[path.length - 1];
        return (
          <mesh key={`${trailColors[index]}-cap`} position={end as unknown as [number, number, number]}>
            <sphereGeometry args={[0.045 + (shares[index] ?? 0.33) * 0.18, 20, 12]} />
            <meshPhysicalMaterial
              ref={(material) => {
                materials.current[index + 3] = material;
              }}
              color={trailColors[index]}
              emissive={trailColors[index]}
              emissiveIntensity={0.16}
              roughness={0.18}
              clearcoat={0.9}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function NutritionTerrain({
  progress,
  record,
  target,
  freezeTime,
}: {
  progress: number;
  record: DailyRecord;
  target: NutritionTarget;
  freezeTime?: number;
}) {
  const root = useRef<Group>(null);
  const data = useMemo(() => mapDataLens(record, target), [record, target]);
  const geometry = useMemo(() => createNutritionTerrainGeometry(data), [data]);
  const material = useMemo(
    () => createNutritionTerrainMaterial(data.mealShares),
    [data.mealShares],
  );
  const state = getTerrainState(progress);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const time = freezeTime ?? clock.elapsedTime;
    material.uniforms.uTime.value = time;
    material.uniforms.uBirth.value = state.birth;
    material.uniforms.uMeals.value = state.meals;
    material.uniforms.uFocus.value = state.focus;
    material.uniforms.uFoods.value = state.foods;
    material.uniforms.uExtraction.value = state.extraction;
    if (!root.current) return;
    root.current.rotation.z = -0.055 + Math.sin(time * 0.13) * 0.012;
    root.current.position.x = MathUtils.lerp(
      root.current.position.x,
      MathUtils.lerp(1.15, 0.32, state.focus),
      0.08,
    );
  });

  const mealLabelOpacity =
    state.meals * (1 - state.focus * 0.8) * (1 - state.extraction);

  return (
    <group
      ref={root}
      position={[1.15, 0.08, 0]}
      rotation={[-0.93, 0.04, -0.055]}
      scale={0.7}
    >
      <mesh geometry={geometry} material={material} receiveShadow frustumCulled={false} />
      <NutrientTrails amount={state.extraction} shares={data.macroShares} />
      {mealPositions.map((position, index) =>
        data.mealShares[index] > 0.01 ? (
          <Html
            key={mealLabels[index]}
            position={position}
            center
            distanceFactor={8}
            className="terrain-spatial-label"
            style={{ opacity: mealLabelOpacity }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{mealLabels[index]}</b>
            <small>{Math.round(data.mealShares[index] * data.totalCalories)} kcal</small>
          </Html>
        ) : null,
      )}
    </group>
  );
}
