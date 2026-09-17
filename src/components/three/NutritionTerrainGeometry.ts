import { BufferGeometry, Float32BufferAttribute } from "three";
import type { DataLensData } from "./sceneMapping";

const COLUMNS = 144;
const ROWS = 112;

const MEAL_CENTERS = [
  [-0.56, 0.3],
  [0.04, 0.15],
  [0.48, -0.22],
  [-0.42, -0.38],
] as const;

const FOOD_CENTERS = [
  [-0.16, 0.28],
  [0.22, 0.2],
  [-0.12, -0.08],
  [0.27, -0.16],
] as const;

function squareToDisc(a: number, b: number): [number, number] {
  if (a === 0 && b === 0) return [0, 0];
  if (Math.abs(a) > Math.abs(b)) {
    const radius = a;
    const angle = (Math.PI / 4) * (b / a);
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  }
  const radius = b;
  const angle = Math.PI / 2 - (Math.PI / 4) * (a / b);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function normalizedWeights(
  x: number,
  y: number,
  centers: readonly (readonly [number, number])[],
  shares: number[],
) {
  const raw = centers.map(([cx, cy], index) => {
    const dx = x - cx;
    const dy = y - cy;
    const influence = Math.exp(-(dx * dx * 3.6 + dy * dy * 4.6));
    return influence * Math.max(0.025, shares[index] ?? 0);
  });
  const sum = Math.max(0.0001, raw.reduce((total, value) => total + value, 0));
  return raw.map((value) => value / sum);
}

export function createNutritionTerrainGeometry(data: DataLensData) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const params: number[] = [];
  const mealWeights: number[] = [];
  const foodWeights: number[] = [];
  const macroWeights: number[] = [];
  const edges: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const u = column / (COLUMNS - 1);
      const v = row / (ROWS - 1);
      const [discX, discY] = squareToDisc(u * 2 - 1, v * 2 - 1);
      const angle = Math.atan2(discY, discX);
      const radius = Math.hypot(discX, discY);
      const irregular =
        1 +
        Math.sin(angle * 3 + 0.4) * 0.055 +
        Math.sin(angle * 5 - 1.1) * 0.026 +
        Math.cos(angle * 7 + 0.7) * 0.014;
      const x = discX * 4.45 * irregular + Math.sin(discY * 2.8) * 0.1;
      const y = discY * 2.72 * irregular + Math.sin(discX * 2.2) * 0.07;
      const baseHeight =
        (1 - radius * radius) * 0.08 +
        Math.sin(discX * 4.2 + discY * 1.7) * 0.025 +
        Math.cos(discY * 4.8 - discX * 1.3) * 0.018;

      const meal = normalizedWeights(discX, discY, MEAL_CENTERS, data.mealShares);
      const food = normalizedWeights(
        discX,
        discY,
        FOOD_CENTERS,
        data.foods.map((item) => item.share),
      );
      const macro = [0, 0, 0];
      food.forEach((weight, index) => {
        const mix = data.foods[index]?.macroShares ?? data.macroShares;
        macro[0] += weight * mix[0];
        macro[1] += weight * mix[1];
        macro[2] += weight * mix[2];
      });

      positions.push(x, y, baseHeight);
      params.push(discX, discY);
      mealWeights.push(meal[0], meal[1], meal[2], meal[3]);
      foodWeights.push(food[0], food[1], food[2], food[3]);
      macroWeights.push(macro[0], macro[1], macro[2]);
      edges.push(MathUtilsClamp((radius - 0.78) / 0.22));
    }
  }

  for (let row = 0; row < ROWS - 1; row++) {
    for (let column = 0; column < COLUMNS - 1; column++) {
      const a = row * COLUMNS + column;
      const b = a + 1;
      const c = a + COLUMNS;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aParam", new Float32BufferAttribute(params, 2));
  geometry.setAttribute("aMeal", new Float32BufferAttribute(mealWeights, 4));
  geometry.setAttribute("aFood", new Float32BufferAttribute(foodWeights, 4));
  geometry.setAttribute("aMacro", new Float32BufferAttribute(macroWeights, 3));
  geometry.setAttribute("aEdge", new Float32BufferAttribute(edges, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.terrain = {
    topology: `${COLUMNS}x${ROWS}`,
    vertexCount: COLUMNS * ROWS,
  };
  return geometry;
}

function MathUtilsClamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
