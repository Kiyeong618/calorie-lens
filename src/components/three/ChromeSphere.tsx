import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  MathUtils,
  ShaderMaterial,
} from "three";
import type { DailyRecord, NutritionTarget } from "../../types";
import {
  createChromeLineMaterial,
  createChromePointMaterial,
  createChromeSurfaceMaterial,
} from "./ChromeSphereShader";

const smooth = (value: number, start: number, end: number) =>
  MathUtils.smoothstep(value, start, end);

function setMaterial(
  material: ShaderMaterial,
  time: number,
  morph: number,
  scatter: number,
  opacity: number,
) {
  material.uniforms.uTime.value = time;
  material.uniforms.uMorph.value = morph;
  material.uniforms.uScatter.value = scatter;
  material.uniforms.uOpacity.value = opacity;
  material.visible = opacity > 0.003;
}

export function ChromeSphere({
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
  const geometry = useMemo(() => {
    const shape = new IcosahedronGeometry(2.34, 5);
    const count = shape.attributes.position.count;
    const scatter = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const x = Math.sin(index * 12.9898) * 43758.5453;
      const y = Math.sin(index * 78.233 + 1.7) * 23421.631;
      const z = Math.sin(index * 39.425 + 4.1) * 96321.517;
      scatter[index * 3] = ((x - Math.floor(x)) * 2 - 1) * 1.55;
      scatter[index * 3 + 1] = ((y - Math.floor(y)) * 2 - 1) * 1.55;
      scatter[index * 3 + 2] = ((z - Math.floor(z)) * 2 - 1) * 1.55;
    }
    shape.setAttribute("aScatter", new Float32BufferAttribute(scatter, 3));
    return shape;
  }, []);
  const chrome = useMemo(() => createChromeSurfaceMaterial(false), []);
  const wire = useMemo(() => createChromeLineMaterial(), []);
  const points = useMemo(() => createChromePointMaterial(), []);
  const glass = useMemo(() => createChromeSurfaceMaterial(true), []);
  const energyRatio = MathUtils.clamp(
    record.totalCalories / Math.max(1, target.targetCalories),
    0.68,
    1.28,
  );

  useEffect(
    () => () => {
      geometry.dispose();
      chrome.dispose();
      wire.dispose();
      points.dispose();
      glass.dispose();
    },
    [chrome, geometry, glass, points, wire],
  );

  useFrame(({ clock }) => {
    const time = freezeTime ?? clock.elapsedTime;
    const morph = smooth(progress, 0.08, 0.76);
    const chromeOpacity = 1 - smooth(progress, 0.2, 0.31);
    const wireOpacity =
      smooth(progress, 0.19, 0.29) * (1 - smooth(progress, 0.42, 0.53));
    const pointEnvelope =
      smooth(progress, 0.4, 0.5) * (1 - smooth(progress, 0.64, 0.74));
    const particlePhase = smooth(progress, 0.4, 0.72);
    const scatter = Math.sin(particlePhase * Math.PI) * 0.68;
    const glassOpacity = smooth(progress, 0.62, 0.76);

    setMaterial(chrome, time, morph, 0, chromeOpacity);
    setMaterial(wire, time, morph, scatter * 0.12, wireOpacity);
    setMaterial(points, time, morph, scatter, pointEnvelope);
    setMaterial(glass, time, morph, 0, glassOpacity);

    if (!root.current) return;
    root.current.rotation.y = time * 0.055 + progress * 0.5;
    root.current.rotation.x = -0.08 + Math.sin(time * 0.19) * 0.035;
    root.current.rotation.z = Math.sin(time * 0.13) * 0.025;
  });

  return (
    <group ref={root} scale={0.7 + energyRatio * 0.045}>
      <mesh geometry={geometry} material={chrome} frustumCulled={false} />
      <mesh geometry={geometry} material={wire} frustumCulled={false} />
      <points geometry={geometry} material={points} frustumCulled={false} />
      <mesh geometry={geometry} material={glass} frustumCulled={false} />
    </group>
  );
}
