import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  MathUtils,
  MeshPhysicalMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import type { DailyRecord, NutritionTarget } from "../../types";
import { createDataLensGeometry, FOOD_SEEDS } from "./DataLensGeometry";
import { createDataLensMaterial } from "./DataLensShader";
import { getDataLensState } from "./dataLensMorph";
import { mapDataLens } from "./sceneMapping";

const outflowColors = ["#ff4c36", "#5661ff", "#f0d94e"];
const outflowPaths = [
  [
    [-3.05, 0.82, 0.2],
    [-3.42, 1.0, 0.28],
    [-3.72, 1.46, 0.58],
    [-3.64, 1.98, 0.92],
    [-3.2, 2.28, 1.08],
    [-2.66, 2.18, 1.22],
  ],
  [
    [3.02, 1.18, 0.2],
    [3.36, 1.36, 0.28],
    [3.76, 1.48, 0.12],
    [4.16, 1.26, 0.42],
    [4.42, 0.78, 0.76],
    [4.36, 0.24, 1.02],
  ],
  [
    [1.92, -1.96, 0.2],
    [2.02, -2.32, 0.34],
    [1.84, -2.72, 0.66],
    [1.38, -2.94, 0.92],
    [0.86, -2.84, 1.12],
    [0.54, -2.48, 1.24],
  ],
] as const;

function MacroOutflows({
  amount,
  shares,
}: {
  amount: number;
  shares: number[];
}) {
  const materials = useRef<(MeshPhysicalMaterial | null)[]>([]);
  const geometries = useMemo(
    () =>
      outflowPaths.map((path, index) => {
        const curve = new CatmullRomCurve3(
          path.map(([x, y, z]) => new Vector3(x, y, z)),
        );
        return new TubeGeometry(
          curve,
          64,
          0.022 + shares[index] * 0.12,
          16,
          false,
        );
      }),
    [shares],
  );

  useEffect(
    () => () => geometries.forEach((geometry) => geometry.dispose()),
    [geometries],
  );
  useFrame(() => {
    const opacity = MathUtils.smoothstep(amount, 0.08, 0.72) * 0.94;
    materials.current.forEach((material) => {
      if (!material) return;
      material.opacity = opacity;
      material.visible = opacity > 0.005;
    });
  });

  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh key={outflowColors[index]} geometry={geometry}>
          <meshPhysicalMaterial
            ref={(material) => {
              materials.current[index] = material;
            }}
            color={outflowColors[index]}
            emissive={outflowColors[index]}
            emissiveIntensity={0.22}
            transparent
            opacity={0}
            transmission={0.18}
            roughness={0.24}
            clearcoat={0.55}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function DataLens({
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
  const data = useMemo(() => mapDataLens(record, target), [record, target]);
  const geometry = useMemo(() => createDataLensGeometry(data), [data]);
  const material = useMemo(() => createDataLensMaterial(data), [data]);
  const state = getDataLensState(progress);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = freezeTime ?? clock.elapsedTime;
    material.uniforms.uMealDepth.value = state.mealLayerProgress;
    material.uniforms.uFocus.value = state.focusProgress;
    material.uniforms.uFood.value = state.foodCellProgress;
    material.uniforms.uMacro.value = state.macroFlowProgress;
    material.uniforms.uFlatten.value = state.flattenProgress;
  });

  const labelOpacity =
    state.foodCellProgress * (1 - state.macroFlowProgress) * 0.72;

  return (
    <group
      position={[1.35, 0.04, 0]}
      rotation={[-0.5, 0.1, -0.08]}
      scale={0.72}
    >
      <mesh geometry={geometry} material={material} frustumCulled={false} />
      <MacroOutflows
        amount={state.macroFlowProgress}
        shares={data.macroShares}
      />
      {data.foods.slice(0, 2).map((food, index) => {
        const seed = FOOD_SEEDS[index];
        return food.name ? (
          <Html
            key={food.id}
            center
            position={[seed[0] * 3.25 * 1.08, seed[1] * 3.25 * 0.82, 0.5]}
            distanceFactor={7.5}
            style={{ opacity: labelOpacity }}
            className="lens-spatial-label"
          >
            <span>{food.name}</span>
            <b>{Math.round(food.share * 100)}%</b>
          </Html>
        ) : null;
      })}
    </group>
  );
}
