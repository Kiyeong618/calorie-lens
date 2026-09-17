import { Canvas } from "@react-three/fiber";
import { useState, type CSSProperties } from "react";
import type { DailyRecord, NutritionTarget } from "../../types";
import { CameraDirector } from "./CameraDirector";
import type { CameraDebugInfo } from "./cameraShots";
import { DataLens } from "./DataLens";
import {
  cameraDiagnosticsEnabled,
  cameraOnlyDebugEnabled,
  getFreezeProgress,
} from "./dataLensMorph";

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

function CameraDebugOverlay({ info }: { info?: CameraDebugInfo }) {
  if (!cameraDiagnosticsEnabled() || !info) return null;
  const vector = (value: [number, number, number]) =>
    value.map((item) => item.toFixed(2)).join(" / ");
  return (
    <output className="camera-debug">
      <b>CAMERA ONLY · {info.shot}</b>
      <span>Progress: {info.progress.toFixed(3)}</span>
      <span>Camera: {vector(info.position)}</span>
      <span>Target: {vector(info.target)}</span>
      <span>FOV: {info.fov.toFixed(1)}°</span>
      <span>Roll: {info.roll.toFixed(1)}°</span>
    </output>
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
  const cameraOnly = cameraOnlyDebugEnabled();
  const debug = cameraDiagnosticsEnabled();
  const [debugInfo, setDebugInfo] = useState<CameraDebugInfo>();

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
        camera={{ position: [4, 2, 18], fov: 42, near: 0.04, far: 160 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#171310"]} />
        <fog attach="fog" args={["#171310", 34, 120]} />
        <CameraDirector
          progress={resolvedProgress}
          onDebug={debug ? setDebugInfo : undefined}
        />
        <DataLens
          progress={resolvedProgress}
          record={record}
          target={target}
          freezeTime={frozen === undefined ? undefined : frozen * 12}
          cameraOnly={cameraOnly}
        />
      </Canvas>
      <CameraDebugOverlay info={debugInfo} />
    </div>
  );
}
