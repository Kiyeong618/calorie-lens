import { Canvas } from "@react-three/fiber";
import type { CSSProperties } from "react";
import type { DailyRecord, NutritionTarget } from "../../types";
import { CameraDirector } from "./CameraDirector";
import { DataLens } from "./DataLens";
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
        camera={{ position: [0.2, 0.15, 10.4], fov: 39, near: 0.05, far: 80 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#171310"]} />
        <fog attach="fog" args={["#171310", 13, 38]} />
        <CameraDirector progress={resolvedProgress} />
        <DataLens
          progress={resolvedProgress}
          record={record}
          target={target}
          freezeTime={frozen === undefined ? undefined : frozen * 12}
        />
      </Canvas>
    </div>
  );
}
