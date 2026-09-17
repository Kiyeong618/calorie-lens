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
  const target = useMemo(() => new Vector3(0, 0, 0), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const orbit = MathUtils.lerp(-0.055, 0.075, MathUtils.smoothstep(progress, 0.04, 0.96));
    const radius = 8.35 + Math.sin(progress * Math.PI) * 0.18;
    destination.set(
      Math.sin(orbit) * radius,
      MathUtils.lerp(0.12, -0.08, progress),
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
