import { BufferGeometry, Float32BufferAttribute } from "three";
import type { DataLensData } from "./sceneMapping";

const SIZE = 128;
const RADIUS = 3.25;
const MEAL_SEEDS: [number, number][] = [
  [-0.48, 0.36],
  [0.24, 0.2],
  [-0.16, -0.38],
  [0.5, -0.2],
];
export const FOOD_SEEDS: [number, number][] = [
  [-0.02, 0.38],
  [0.4, 0.32],
  [0.08, 0.02],
  [0.5, 0.02],
];

function squareToDisc(a: number, b: number): [number, number] {
  if (a === 0 && b === 0) return [0, 0];
  let radius: number, angle: number;
  if (Math.abs(a) > Math.abs(b)) {
    radius = a;
    angle = (Math.PI / 4) * (b / a);
  } else {
    radius = b;
    angle = Math.PI / 2 - (Math.PI / 4) * (a / b);
  }
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}
function classify(
  x: number,
  y: number,
  seeds: [number, number][],
  bias: number[],
) {
  let first = 0,
    firstScore = Infinity,
    second = Infinity;
  for (let index = 0; index < seeds.length; index++) {
    const dx = x - seeds[index][0],
      dy = y - seeds[index][1],
      score = dx * dx + dy * dy - bias[index];
    if (score < firstScore) {
      second = firstScore;
      firstScore = score;
      first = index;
    } else if (score < second) second = score;
  }
  return { index: first, margin: second - firstScore };
}
function calibrate(
  points: [number, number][],
  shares: number[],
  seeds: [number, number][],
) {
  const total = shares.reduce((sum, value) => sum + value, 0);
  const target =
    total > 0 ? shares.map((value) => value / total) : shares.map(() => 0.25);
  const bias = target.map((share) => Math.log(Math.max(0.015, share)) * 0.08);
  for (let iteration = 0; iteration < 64; iteration++) {
    const counts = target.map(() => 0);
    for (const [x, y] of points) counts[classify(x, y, seeds, bias).index]++;
    for (let index = 0; index < bias.length; index++)
      bias[index] +=
        (target[index] - counts[index] / Math.max(1, points.length)) * 0.3;
  }
  return bias;
}

export function createDataLensGeometry(data: DataLensData) {
  const geometry = new BufferGeometry();
  const positions: number[] = [],
    uvs: number[] = [],
    params: number[] = [],
    meals: number[] = [],
    mealShares: number[] = [],
    mealMargins: number[] = [],
    foods: number[] = [],
    foodShares: number[] = [],
    foodMargins: number[] = [],
    macroMix: number[] = [],
    indices: number[] = [],
    points: [number, number][] = [];

  for (let row = 0; row < SIZE; row++)
    for (let column = 0; column < SIZE; column++) {
      const u = column / (SIZE - 1),
        v = row / (SIZE - 1);
      points.push(squareToDisc(u * 2 - 1, v * 2 - 1));
    }

  const mealBias = calibrate(points, data.mealShares, MEAL_SEEDS);
  const mealCells = points.map(([x, y]) =>
    classify(x, y, MEAL_SEEDS, mealBias),
  );
  const lunchPoints = points.filter((_, index) => mealCells[index].index === 1);
  const foodBias = calibrate(
    lunchPoints,
    data.foods.map((food) => food.share),
    FOOD_SEEDS,
  );

  for (let index = 0; index < points.length; index++) {
    const [x, y] = points[index],
      u = (index % SIZE) / (SIZE - 1),
      v = Math.floor(index / SIZE) / (SIZE - 1),
      radius = Math.hypot(x, y),
      angle = Math.atan2(y, x),
      edge =
        1 +
        Math.sin(angle * 3.0 + 0.45) * 0.065 +
        Math.cos(angle * 5.0 - 0.7) * 0.034 +
        Math.sin(angle * 7.0 + 1.2) * 0.016,
      meal = mealCells[index],
      food = classify(x, y, FOOD_SEEDS, foodBias),
      foodIndex = meal.index === 1 ? food.index : 0,
      foodData = data.foods[foodIndex],
      surfaceNoise =
        Math.sin(x * 2.2 + y * 1.45) * 0.022 +
        Math.cos(y * 2.8 - x * 0.7) * 0.012;
    positions.push(
      (x * 1.04 + Math.sin(y * 2.1) * 0.035) * RADIUS * edge,
      (y * 0.82 + Math.sin(x * 1.7 + 0.4) * 0.025) * RADIUS * edge,
      (1 - radius * radius) * 0.11 + surfaceNoise,
    );
    uvs.push(u, v);
    params.push(x, y);
    meals.push(meal.index);
    mealShares.push(data.mealShares[meal.index] ?? 0);
    mealMargins.push(meal.margin);
    foods.push(foodIndex);
    foodShares.push(meal.index === 1 ? foodData.share : 0);
    foodMargins.push(meal.index === 1 ? food.margin : 1);
    macroMix.push(...foodData.macroShares);
  }

  for (let row = 0; row < SIZE - 1; row++)
    for (let column = 0; column < SIZE - 1; column++) {
      const a = row * SIZE + column,
        b = a + 1,
        c = a + SIZE,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("aParam", new Float32BufferAttribute(params, 2));
  geometry.setAttribute("aMealIndex", new Float32BufferAttribute(meals, 1));
  geometry.setAttribute(
    "aMealShare",
    new Float32BufferAttribute(mealShares, 1),
  );
  geometry.setAttribute(
    "aMealMargin",
    new Float32BufferAttribute(mealMargins, 1),
  );
  geometry.setAttribute("aFoodIndex", new Float32BufferAttribute(foods, 1));
  geometry.setAttribute(
    "aFoodShare",
    new Float32BufferAttribute(foodShares, 1),
  );
  geometry.setAttribute(
    "aFoodMargin",
    new Float32BufferAttribute(foodMargins, 1),
  );
  geometry.setAttribute("aMacroMix", new Float32BufferAttribute(macroMix, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const lunchCells = [0, 0, 0, 0];
  let lunchTotal = 0;
  for (let index = 0; index < meals.length; index++)
    if (meals[index] === 1) {
      lunchCells[foods[index]]++;
      lunchTotal++;
    }
  geometry.userData.dataLens = {
    topology: `${SIZE}x${SIZE}`,
    vertexCount: positions.length / 3,
    targetFoodShares: data.foods.map((food) => food.share),
    actualFoodShares: lunchCells.map(
      (value) => value / Math.max(1, lunchTotal),
    ),
  };
  return geometry;
}
