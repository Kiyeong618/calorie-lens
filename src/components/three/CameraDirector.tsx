import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Matrix4,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import { cameraDiagnosticsEnabled } from "./dataLensMorph";
import {
  CAMERA_SHOTS,
  WORLD_ANCHORS,
  getCameraFrame,
  type CameraDebugInfo,
} from "./cameraShots";

function CameraDebugPaths() {
  if (!cameraDiagnosticsEnabled()) return null;
  const cameraPoints = CAMERA_SHOTS.flatMap((shot, index) =>
      index ? [shot.cameraTo] : [shot.cameraFrom, shot.cameraTo],
    ),
    targetPoints = CAMERA_SHOTS.flatMap((shot, index) =>
      index ? [shot.targetTo] : [shot.targetFrom, shot.targetTo],
    );
  return (
    <group>
      <Line points={cameraPoints} color="#00d9ff" lineWidth={2} />
      <Line points={targetPoints} color="#ff4cbe" lineWidth={2} />
      {Object.entries(WORLD_ANCHORS).map(([name, position]) => (
        <axesHelper key={name} args={[0.7]} position={position} />
      ))}
    </group>
  );
}

export function CameraDirector({
  progress,
  onDebug,
}: {
  progress: number;
  onDebug?: (info: CameraDebugInfo) => void;
}) {
  const { camera } = useThree(),
    matrix = useMemo(() => new Matrix4(), []),
    look = useMemo(() => new Quaternion(), []),
    bank = useMemo(() => new Quaternion(), []),
    localZ = useMemo(() => new Vector3(0, 0, 1), []),
    up = useMemo(() => new Vector3(0, 1, 0), []),
    tick = useRef(0);
  useFrame(() => {
    const frame = getCameraFrame(progress);
    camera.position.lerp(frame.position, 0.18);
    matrix.lookAt(camera.position, frame.target, up);
    look.setFromRotationMatrix(matrix);
    bank.setFromAxisAngle(localZ, frame.roll);
    look.multiply(bank);
    camera.quaternion.slerp(look, 0.2);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, frame.fov, 0.16);
    perspective.updateProjectionMatrix();
    if (onDebug && tick.current++ % 8 === 0)
      onDebug({
        progress,
        shot: frame.shot.id,
        position: camera.position.toArray(),
        target: frame.target.toArray(),
        fov: perspective.fov,
        roll: MathUtils.radToDeg(frame.roll),
      });
  });
  return <CameraDebugPaths />;
}
