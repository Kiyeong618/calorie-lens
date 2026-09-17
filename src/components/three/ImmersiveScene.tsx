import { Canvas } from "@react-three/fiber";
import type { CSSProperties } from "react";
import type { DailyRecord, NutritionTarget } from "../../types";
import { CameraDirector } from "./CameraDirector";
import { MetabolicStillLife } from "./MetabolicStillLife";
import { getFreezeProgress } from "./dataLensMorph";

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

export function ImmersiveScene({
  progress,
  record,
  target,
  reduced = false,
}: {
  progress: number;
  record: DailyRecord;
  target: NutritionTarget;
  reduced?: boolean;
}) {
  const ratio = record.totalCalories / Math.max(1, target.targetCalories);
  const frozen = getFreezeProgress();
  const resolvedProgress = frozen ?? progress;
  const mobile = typeof window !== "undefined" && window.innerWidth < 760;

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
        shadows
        camera={{ position: [-1.3, 4.35, 9], fov: 35, near: 0.05, far: 80 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#d8d0c4"]} />
        <fog attach="fog" args={["#d8d0c4", 15, 36]} />
        <ambientLight intensity={1.35} color="#fff6e7" />
        <directionalLight position={[-5, 8, 4]} intensity={3.2} color="#fff4dc" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[5, 3, -4]} intensity={1.7} color="#9ca8ff" />
        <spotLight position={[0, 9, 1]} intensity={2.4} angle={0.55} penumbra={0.8} color="#ffffff" castShadow />
        <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[36, 36]} />
          <meshStandardMaterial color="#d8d0c4" roughness={0.92} />
        </mesh>
        <CameraDirector progress={resolvedProgress} />
        <MetabolicStillLife progress={resolvedProgress} record={record} target={target} />
      </Canvas>
    </div>
  );
}
