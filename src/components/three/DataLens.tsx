import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { DailyRecord, NutritionTarget } from "../../types";
import { createDataLensGeometry, FOOD_SEEDS } from "./DataLensGeometry";
import { createDataLensMaterial } from "./DataLensShader";
import { getDataLensState } from "./dataLensMorph";
import { mapDataLens } from "./sceneMapping";

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
    state.foodCellProgress * (1 - state.macroFlowProgress) * 0.78;

  return (
    <group position={[0.35, -0.05, 0]} rotation={[-0.08, 0.08, -0.05]}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
      {data.foods.slice(0, 2).map((food, index) => {
        const seed = FOOD_SEEDS[index];
        const baseX = seed[0] * 3.25;
        const baseY = seed[1] * 3.25;
        const x = baseX * 2.08 + 0.45;
        const y = (baseY - 0.82) * 2.08 - 0.58;
        return food.name ? (
          <Html
            key={food.id}
            center
            position={[x, y, 0.38]}
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
