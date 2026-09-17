import { createDataLensGeometry } from "../src/components/three/DataLensGeometry.ts";
import { getDataLensState } from "../src/components/three/dataLensMorph.ts";
import type { DataLensData } from "../src/components/three/sceneMapping.ts";

const data: DataLensData = {
  mealShares: [0.2, 0.42, 0.3, 0.08],
  foods: [
    { id: "a", name: "A", share: 0.42, macroShares: [0.45, 0.4, 0.15] },
    { id: "b", name: "B", share: 0.28, macroShares: [0.2, 0.65, 0.15] },
    { id: "c", name: "C", share: 0.2, macroShares: [0.25, 0.25, 0.5] },
    { id: "d", name: "D", share: 0.1, macroShares: [0.2, 0.5, 0.3] },
  ],
  macroShares: [0.3, 0.48, 0.22],
  totalCalories: 1800,
  targetCalories: 2000,
};

const geometry = createDataLensGeometry(data);
const report = geometry.userData.dataLens as {
  vertexCount: number;
  targetFoodShares: number[];
  actualFoodShares: number[];
};
if (report.vertexCount !== 128 * 128)
  throw new Error("Topology vertex count changed");
if (geometry.getAttribute("uv").count !== report.vertexCount)
  throw new Error("UV count does not match topology");

const largestCellError = Math.max(
  ...report.targetFoodShares.map((target, index) =>
    Math.abs(target - report.actualFoodShares[index]),
  ),
);
if (largestCellError > 0.035)
  throw new Error(`Power Diagram area error is ${largestCellError.toFixed(4)}`);

const frames = [0.1, 0.3, 0.5, 0.7, 0.82].map((progress) => ({
  progress,
  ...getDataLensState(progress),
}));
if (frames[0].mealLayerProgress !== 0)
  throw new Error("Frame A is not membrane-only");
if (frames[1].mealLayerProgress < 0.9)
  throw new Error("Frame B lacks meal depth");
if (frames[2].foodCellProgress < 0.7)
  throw new Error("Frame C lacks food cells");
if (!(frames[3].macroFlowProgress > 0.1 && frames[3].macroFlowProgress < 0.9))
  throw new Error("Frame D is not an intermediate extraction state");
if (frames[4].macroFlowProgress < 0.99)
  throw new Error("Frame E lacks macro sculpture");

console.log(
  JSON.stringify(
    {
      topology: geometry.userData.dataLens.topology,
      vertexCount: report.vertexCount,
      largestCellError: +largestCellError.toFixed(4),
      frames,
    },
    null,
    2,
  ),
);
geometry.dispose();
