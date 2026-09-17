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
  const target = useMemo(() => new Vector3(0.35, 0.05, 0), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const focus = MathUtils.smoothstep(progress, 0.3, 0.52);
    const reveal = MathUtils.smoothstep(progress, 0.7, 0.96);
    const orbit = MathUtils.lerp(-0.12, 0.16, MathUtils.smoothstep(progress, 0.08, 0.88));
    const radius = MathUtils.lerp(10.6, 8.9, focus) + reveal * 2.3;
    target.set(
      MathUtils.lerp(0.35, -0.15, focus * (1 - reveal)),
      MathUtils.lerp(0.05, 0.22, focus),
      0,
    );
    destination.set(
      0.35 + Math.sin(orbit) * radius,
      MathUtils.lerp(4.9, 5.7, reveal),
      Math.cos(orbit) * radius,
    );
    camera.position.lerp(destination, 0.14);
    matrix.lookAt(camera.position, target, up);
    rotation.setFromRotationMatrix(matrix);
    camera.quaternion.slerp(rotation, 0.16);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(perspective.fov, 33, 0.12);
    perspective.updateProjectionMatrix();
  });
  return null;
}
