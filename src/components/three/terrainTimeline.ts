import { MathUtils } from "three";

export interface TerrainState {
  birth: number;
  meals: number;
  focus: number;
  foods: number;
  extraction: number;
  sculpture: number;
}

const stage = (progress: number, start: number, end: number) =>
  MathUtils.smoothstep(progress, start, end);

export function getTerrainState(progress: number): TerrainState {
  return {
    birth: stage(progress, 0.01, 0.16),
    meals: stage(progress, 0.15, 0.34),
    focus: stage(progress, 0.31, 0.48),
    foods: stage(progress, 0.4, 0.58),
    extraction: stage(progress, 0.55, 0.78),
    sculpture: stage(progress, 0.74, 0.94),
  };
}
