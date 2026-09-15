import { CatmullRomCurve3, Vector3 } from "three";
export const cameraPositionCurve = new CatmullRomCurve3(
  [
    new Vector3(0, 0.3, 13),
    new Vector3(-1.8, -0.7, 8),
    new Vector3(-2.9, 0.2, 4.2),
    new Vector3(-0.35, 0.1, 0.65),
    new Vector3(1.2, 0.8, -3.2),
    new Vector3(4.9, 1.2, -5.4),
    new Vector3(1.7, 0.1, -7.2),
    new Vector3(-0.5, 0.1, -9.6),
    new Vector3(-1.7, 0.3, -12.2),
    new Vector3(0.3, 3.8, -15),
    new Vector3(0.2, 6.3, -19),
    new Vector3(0, 7.5, -32),
  ],
  false,
  "catmullrom",
  0.42,
);
export const cameraTargetCurve = new CatmullRomCurve3(
  [
    new Vector3(0, 0, 0),
    new Vector3(0.2, 0, 0),
    new Vector3(0, 0.1, -0.4),
    new Vector3(0, 0, -2.7),
    new Vector3(0.5, 0, -4.4),
    new Vector3(2.9, 0.2, -5.4),
    new Vector3(0.3, 0, -7),
    new Vector3(-0.4, 0, -10.3),
    new Vector3(0, 0, -12.7),
    new Vector3(0, 0, -15),
    new Vector3(0, 0, -19),
    new Vector3(0, 0, -24),
  ],
  false,
  "catmullrom",
  0.42,
);
export const cameraShots = [
  { id: "远景推进", start: 0, end: 0.1, fov: 38 },
  { id: "贴近擦过", start: 0.1, end: 0.2, fov: 35 },
  { id: "穿越透镜", start: 0.2, end: 0.28, fov: 48 },
  { id: "餐次揭示", start: 0.28, end: 0.4, fov: 44 },
  { id: "环绕锁定", start: 0.4, end: 0.5, fov: 39 },
  { id: "快速推进", start: 0.5, end: 0.6, fov: 42 },
  { id: "进入食物", start: 0.6, end: 0.7, fov: 46 },
  { id: "单元穿行", start: 0.7, end: 0.78, fov: 45 },
  { id: "营养流带", start: 0.78, end: 0.86, fov: 43 },
  { id: "升降俯拍", start: 0.86, end: 0.92, fov: 38 },
  { id: "空间压平", start: 0.92, end: 0.96, fov: 36 },
  { id: "时间远拉", start: 0.96, end: 1, fov: 48 },
];
export const getFov = (progress: number) => {
  const shot =
    cameraShots.find(
      (item) => progress >= item.start && progress <= item.end,
    ) ?? cameraShots[cameraShots.length - 1];
  const next =
    cameraShots[
      Math.min(cameraShots.length - 1, cameraShots.indexOf(shot) + 1)
    ];
  const t = Math.max(
    0,
    Math.min(
      1,
      (progress - shot.start) / Math.max(0.001, shot.end - shot.start),
    ),
  );
  return shot.fov + (next.fov - shot.fov) * (t * t * (3 - 2 * t));
};
