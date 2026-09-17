import { Html, RoundedBox } from "@react-three/drei";
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
import { mapDataLens } from "./sceneMapping";

const macroColors = ["#ff4c36", "#5661ff", "#e8c936"];
const streamPaths = [
  [[0.65, 0.2, -0.15], [1.25, 0.55, -0.75], [1.8, 1.35, -1.05], [1.5, 2.25, -0.55]],
  [[-0.55, 0.18, 0.45], [-1.15, 0.58, 0.85], [-1.75, 1.45, 0.5], [-1.55, 2.45, 0.05]],
  [[0.15, 0.16, 0.85], [0.4, 0.7, 1.45], [0.05, 1.55, 1.85], [-0.45, 2.15, 1.5]],
] as const;

function RiceCluster({ scale = 1 }: { scale?: number }) {
  const grains = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const angle = index * 2.39996;
        const radius = Math.sqrt(index / 34) * 0.72;
        return {
          position: [Math.cos(angle) * radius, 0.12 + (index % 5) * 0.035, Math.sin(angle) * radius] as [number, number, number],
          rotation: [Math.PI / 2 + 0.16 * Math.sin(index), angle, 0.22 * Math.cos(index)] as [number, number, number],
        };
      }),
    [],
  );
  return (
    <group position={[-0.75, 0.03, -0.35]} scale={scale}>
      {grains.map((grain, index) => (
        <mesh key={index} position={grain.position} rotation={grain.rotation} castShadow>
          <capsuleGeometry args={[0.055, 0.19, 4, 8]} />
          <meshPhysicalMaterial color="#eee5d2" roughness={0.58} clearcoat={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function FoodSculpture({ progress, shares, names }: { progress: number; shares: number[]; names: string[] }) {
  const focus = MathUtils.smoothstep(progress, 0.28, 0.56);
  const labelOpacity = MathUtils.smoothstep(progress, 0.38, 0.52) * (1 - MathUtils.smoothstep(progress, 0.64, 0.78));
  return (
    <group>
      <RiceCluster scale={0.78 + (shares[0] ?? 0.25) * 0.62} />
      <group position={[0.72, 0.18 + focus * 0.12, -0.3]} rotation={[0, -0.28, 0.03]}>
        {[-0.42, 0, 0.42].map((offset, index) => (
          <RoundedBox key={offset} args={[0.52, 0.34, 1.02]} radius={0.17} smoothness={6} position={[offset, index * 0.055, 0]} rotation={[0, index * 0.035, index * 0.025]} castShadow>
            <meshPhysicalMaterial color={index === 1 ? "#c97859" : "#b96850"} roughness={0.4} clearcoat={0.46} />
          </RoundedBox>
        ))}
      </group>
      <group position={[-0.15, 0.08, 0.82]} rotation={[0, 0.3, 0]}>
        <mesh scale={[1.05, 0.16, 0.72]} castShadow>
          <sphereGeometry args={[0.72, 48, 24]} />
          <meshPhysicalMaterial color="#f5efe2" roughness={0.5} clearcoat={0.24} />
        </mesh>
        <mesh position={[0.15, 0.16, 0.03]} scale={[0.38, 0.16, 0.38]} castShadow>
          <sphereGeometry args={[0.72, 36, 18]} />
          <meshPhysicalMaterial color="#e9b837" roughness={0.32} clearcoat={0.5} />
        </mesh>
      </group>
      <group position={[1.05, 0.08, 0.75]} rotation={[0, -0.5, 0]}>
        {[-0.34, 0, 0.34].map((offset, index) => (
          <mesh key={offset} position={[offset, 0.12 + index * 0.035, 0]} rotation={[0.15, index * 0.72, -0.18]} scale={[0.28, 0.12, 0.72]} castShadow>
            <sphereGeometry args={[0.72, 28, 16]} />
            <meshPhysicalMaterial color={index === 1 ? "#487b5b" : "#65a36e"} roughness={0.6} clearcoat={0.14} />
          </mesh>
        ))}
      </group>
      {names.slice(0, 2).map((name, index) => name ? (
        <Html key={`${name}-${index}`} center position={index ? [0.78, 0.7, -0.32] : [-0.72, 0.75, -0.32]} distanceFactor={8} className="still-life-label" style={{ opacity: labelOpacity }}>
          <span>{String(index + 1).padStart(2, "0")}</span><b>{name}</b>
        </Html>
      ) : null)}
    </group>
  );
}

function MacroGlass({ amount, shares }: { amount: number; shares: number[] }) {
  const materials = useRef<(MeshPhysicalMaterial | null)[]>([]);
  const geometries = useMemo(
    () => streamPaths.map((path, index) => new TubeGeometry(
      new CatmullRomCurve3(path.map(([x, y, z]) => new Vector3(x, y, z))),
      72,
      0.035 + (shares[index] ?? 0.33) * 0.14,
      14,
      false,
    )),
    [shares],
  );
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useFrame(() => {
    const opacity = MathUtils.smoothstep(amount, 0.04, 0.72) * 0.9;
    materials.current.forEach((material) => {
      if (!material) return;
      material.opacity = opacity;
      material.visible = opacity > 0.005;
    });
  });
  return (
    <group scale={[1, MathUtils.lerp(0.08, 1, amount), 1]}>
      {geometries.map((geometry, index) => (
        <mesh key={macroColors[index]} geometry={geometry} castShadow>
          <meshPhysicalMaterial
            ref={(material) => { materials.current[index] = material; }}
            color={macroColors[index]}
            emissive={macroColors[index]}
            emissiveIntensity={0.12}
            transparent
            opacity={0}
            transmission={0.32}
            thickness={0.7}
            roughness={0.14}
            clearcoat={0.85}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function MetabolicStillLife({ progress, record, target }: { progress: number; record: DailyRecord; target: NutritionTarget }) {
  const root = useRef<Group>(null);
  const data = useMemo(() => mapDataLens(record, target), [record, target]);
  const reveal = MathUtils.smoothstep(progress, 0.04, 0.2);
  const macro = MathUtils.smoothstep(progress, 0.56, 0.78);
  useFrame(({ clock }) => {
    if (!root.current) return;
    let compositionX = 1.05;
    compositionX = MathUtils.lerp(compositionX, -1.05, MathUtils.smoothstep(progress, 0.42, 0.5));
    compositionX = MathUtils.lerp(compositionX, 1.15, MathUtils.smoothstep(progress, 0.54, 0.61));
    compositionX = MathUtils.lerp(compositionX, -1.2, MathUtils.smoothstep(progress, 0.66, 0.74));
    compositionX = MathUtils.lerp(compositionX, 0.15, MathUtils.smoothstep(progress, 0.84, 0.94));
    root.current.rotation.y = -0.12 + progress * 0.28 + Math.sin(clock.elapsedTime * 0.22) * 0.018;
    root.current.position.x = MathUtils.lerp(root.current.position.x, compositionX, 0.12);
    root.current.position.y = MathUtils.lerp(-0.22, 0.06, reveal);
  });
  return (
    <group ref={root} position={[1.05, -0.22, 0]} scale={0.94}>
      <mesh position={[0, -0.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.5, 3.5, 0.08, 96]} />
        <meshPhysicalMaterial color="#565ee8" roughness={0.5} clearcoat={0.32} />
      </mesh>
      <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.05, 2.88, 0.22, 96]} />
        <meshPhysicalMaterial color="#d8cdbd" roughness={0.3} clearcoat={0.56} />
      </mesh>
      <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[2.52, 0.18, 18, 96]} />
        <meshPhysicalMaterial color="#eee7dc" roughness={0.28} clearcoat={0.64} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.5, 96]} />
        <meshPhysicalMaterial color="#cfc2b0" roughness={0.46} clearcoat={0.28} />
      </mesh>
      <FoodSculpture progress={progress} shares={data.foods.map((food) => food.share)} names={data.foods.map((food) => food.name)} />
      <MacroGlass amount={macro} shares={data.macroShares} />
    </group>
  );
}
