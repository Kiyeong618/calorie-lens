import { Canvas } from "@react-three/fiber";
import type { CSSProperties } from "react";
import type { DailyRecord, NutritionTarget } from "../../types";
import { CameraDirector } from "./CameraDirector";
import { NutritionTerrain } from "./NutritionTerrain";
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
        <color attach="background" args={["#171310"]} />
        <fog attach="fog" args={["#171310", 17, 39]} />
        <ambientLight intensity={0.52} color="#b8ad9e" />
        <directionalLight position={[-6, 8, 5]} intensity={4.1} color="#ffe4c1" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[6, 2, -5]} intensity={3.2} color="#7789ff" />
        <spotLight position={[0, 10, 2]} intensity={3.6} angle={0.48} penumbra={0.88} color="#fff8ed" castShadow />
        <pointLight position={[-4, 1, 5]} intensity={1.4} color="#ff684e" />
        <mesh position={[0, -1.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[36, 36]} />
          <meshStandardMaterial color="#171310" roughness={0.9} />
        </mesh>
        <CameraDirector progress={resolvedProgress} />
        <NutritionTerrain progress={resolvedProgress} record={record} target={target} freezeTime={frozen !== undefined ? 2.4 : undefined} />
      </Canvas>
    </div>
  );
}
