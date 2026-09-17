import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import {
  Matrix4,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import { cameraDebugEnabled } from "./dataLensMorph";

export function CameraDirector({ progress }: { progress: number }) {
  const { camera } = useThree();
  const matrix = useMemo(() => new Matrix4(), []);
  const destination = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(0.35, 0, 0), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const dolly = MathUtils.smoothstep(Math.min(progress, 0.86), 0, 0.86);
    destination.set(0.2, 0.15, MathUtils.lerp(10.4, 8.75, dolly));
    camera.position.lerp(destination, 0.14);
    matrix.lookAt(camera.position, target, up);
    rotation.setFromRotationMatrix(matrix);
    camera.quaternion.slerp(rotation, 0.16);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, 39, 0.12);
    perspective.updateProjectionMatrix();
  });

  if (!cameraDebugEnabled()) return null;
  return <axesHelper args={[1.2]} position={[0.35, 0, 0]} />;
}
