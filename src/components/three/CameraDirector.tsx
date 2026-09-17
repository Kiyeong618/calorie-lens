import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import {
  Matrix4,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";

export function CameraDirector({ progress }: { progress: number }) {
  const { camera } = useThree();
  const matrix = useMemo(() => new Matrix4(), []);
  const destination = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(0.65, 0.15, 0), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const orbit = MathUtils.lerp(-0.22, 0.34, MathUtils.smoothstep(progress, 0.08, 0.82));
    const pullback = MathUtils.smoothstep(progress, 0.72, 0.96);
    const radius = MathUtils.lerp(9.2, 10.4, pullback);
    destination.set(
      0.65 + Math.sin(orbit) * radius,
      MathUtils.lerp(4.35, 5.25, pullback),
      Math.cos(orbit) * radius,
    );
    camera.position.lerp(destination, 0.14);
    matrix.lookAt(camera.position, target, up);
    rotation.setFromRotationMatrix(matrix);
    camera.quaternion.slerp(rotation, 0.16);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, 35, 0.12);
    perspective.updateProjectionMatrix();
  });
  return null;
}
