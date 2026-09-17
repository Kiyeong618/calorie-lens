import { BufferGeometry, Float32BufferAttribute } from "three";
import type { DataLensData } from "./sceneMapping";

export const FOOD_SEEDS: [number, number][] = [
  [-0.42, 0.28],
  [0.18, 0.36],
  [-0.12, 0.1],
  [0.48, 0.14],
];

const SIZE = 128,
  RADIUS = 3.25;
const fract = (value: number) => value - Math.floor(value);
function squareToDisc(a: number, b: number): [number, number] {
  if (a === 0 && b === 0) return [0, 0];
  let r: number, theta: number;
  if (Math.abs(a) > Math.abs(b)) {
    r = a;
    theta = (Math.PI / 4) * (b / a);
  } else {
    r = b;
    theta = Math.PI / 2 - (Math.PI / 4) * (a / b);
  }
  return [r * Math.cos(theta), r * Math.sin(theta)];
}
function mealIndex(y: number) {
  return y > 0.5 ? 0 : y > 0 ? 1 : y > -0.5 ? 2 : 3;
}
function classify(x: number, y: number, bias: number[]) {
  let first = 0,
    firstScore = Infinity,
    second = Infinity;
  for (let i = 0; i < 4; i++) {
    const dx = x - FOOD_SEEDS[i][0],
      dy = y - FOOD_SEEDS[i][1],
      score = dx * dx + dy * dy - bias[i];
    if (score < firstScore) {
      second = firstScore;
      firstScore = score;
      first = i;
    } else if (score < second) second = score;
  }
  return { index: first, margin: second - firstScore };
}
function calibratePowerDiagram(points: [number, number][], shares: number[]) {
  const bias = shares.map((share) => Math.log(Math.max(0.015, share)) * 0.08);
  for (let iteration = 0; iteration < 55; iteration++) {
    const counts = [0, 0, 0, 0];
    for (const [x, y] of points) counts[classify(x, y, bias).index]++;
    for (let i = 0; i < 4; i++) {
      const actual = counts[i] / Math.max(1, points.length),
        target = shares[i] ?? 0;
      bias[i] += (target - actual) * 0.32;
    }
  }
  return bias;
}
export function createDataLensGeometry(data: DataLensData) {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    uvs: number[] = [],
    meal: number[] = [],
    food: number[] = [],
    margins: number[] = [],
    macro: number[] = [],
    delays: number[] = [],
    params: number[] = [],
    indices: number[] = [],
    discPoints: [number, number][] = [];
  for (let row = 0; row < SIZE; row++)
    for (let column = 0; column < SIZE; column++) {
      const u = column / (SIZE - 1),
        v = row / (SIZE - 1),
        [dx, dy] = squareToDisc(u * 2 - 1, v * 2 - 1);
      discPoints.push([dx, dy]);
    }
  const lunchPoints = discPoints.filter(([, y]) => mealIndex(y) === 1),
    bias = calibratePowerDiagram(
      lunchPoints,
      data.foods.map((item) => item.share),
    );
  for (let i = 0; i < discPoints.length; i++) {
    const [dx, dy] = discPoints[i],
      u = (i % SIZE) / (SIZE - 1),
      v = Math.floor(i / SIZE) / (SIZE - 1),
      r = Math.hypot(dx, dy),
      angle = Math.atan2(dy, dx),
      group = mealIndex(dy),
      cell = classify(dx, dy, bias),
      foodIndex = group === 1 ? cell.index : 0,
      foodData = data.foods[foodIndex],
      h = fract(
        ((angle + Math.PI) / (Math.PI * 2)) * 1.73 +
          r * 0.61 +
          foodIndex * 0.19,
      ),
      protein = foodData.macroShares[0],
      carbs = foodData.macroShares[1],
      channel = h < protein ? 0 : h < protein + carbs ? 1 : 2,
      delay = 0.06 + fract(Math.sin((i + 1) * 12.9898) * 43758.5453) * 0.42,
      edge = 1 + Math.sin(angle * 3.0) * 0.018 + Math.cos(angle * 5.0) * 0.009;
    positions.push(
      dx * RADIUS * edge,
      dy * RADIUS * edge,
      (1 - r * r) * 0.12 + Math.sin(dx * 3.1 + dy * 2.4) * 0.025,
    );
    uvs.push(u, v);
    meal.push(group);
    food.push(foodIndex);
    margins.push(group === 1 ? cell.margin : 1);
    macro.push(channel);
    delays.push(delay);
    params.push(dx, dy);
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
  geometry.setAttribute("aMealIndex", new Float32BufferAttribute(meal, 1));
  geometry.setAttribute("aFoodIndex", new Float32BufferAttribute(food, 1));
  geometry.setAttribute("aCellMargin", new Float32BufferAttribute(margins, 1));
  geometry.setAttribute("aMacroIndex", new Float32BufferAttribute(macro, 1));
  geometry.setAttribute("aFlowDelay", new Float32BufferAttribute(delays, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const lunchCells = [0, 0, 0, 0];
  for (let index = 0; index < meal.length; index++)
    if (meal[index] === 1) lunchCells[food[index]]++;
  const lunchTotal = Math.max(
    1,
    lunchCells.reduce((sum, value) => sum + value, 0),
  );
  geometry.userData.dataLens = {
    topology: `${SIZE}x${SIZE}`,
    vertexCount: positions.length / 3,
    targetFoodShares: data.foods.map((item) => item.share),
    actualFoodShares: lunchCells.map((value) => value / lunchTotal),
  };
  return geometry;
}
