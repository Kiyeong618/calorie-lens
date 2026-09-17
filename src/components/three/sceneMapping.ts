import type { DailyRecord, NutritionTarget } from "../../types";
import {
  getFoodDistribution,
  getMacroEnergyRatio,
  getMealDistribution,
} from "../../data/selectors";

export interface DataLensFood {
  id: string;
  name: string;
  share: number;
  macroShares: [number, number, number];
}
export interface DataLensData {
  mealShares: [number, number, number, number];
  foods: DataLensFood[];
  macroShares: [number, number, number];
  totalCalories: number;
  targetCalories: number;
}
export function mapDataLens(
  record: DailyRecord,
  target: NutritionTarget,
): DataLensData {
  const meals = getMealDistribution(record),
    mealTotal = Math.max(
      1,
      meals.reduce((sum, meal) => sum + meal.calories, 0),
    );
  const source = record.meals.filter((meal) => meal.type === "lunch");
  const foods = getFoodDistribution({ ...record, meals: source }).slice(0, 4),
    foodTotal = Math.max(
      1,
      foods.reduce((sum, food) => sum + food.calories, 0),
    );
  const mapped = foods.map((food) => {
    const protein = food.protein * 4,
      carbs = food.carbs * 4,
      fat = food.fat * 9,
      total = Math.max(1, protein + carbs + fat);
    return {
      id: food.id,
      name: food.name,
      share: food.calories / foodTotal,
      macroShares: [protein / total, carbs / total, fat / total] as [
        number,
        number,
        number,
      ],
    };
  });
  while (mapped.length < 4)
    mapped.push({
      id: `empty-${mapped.length}`,
      name: "",
      share: 0,
      macroShares: [1 / 3, 1 / 3, 1 / 3],
    });
  const macro = getMacroEnergyRatio(record);
  return {
    mealShares: meals.map((meal) => meal.calories / mealTotal) as [
      number,
      number,
      number,
      number,
    ],
    foods: mapped,
    macroShares: [macro.proteinRatio, macro.carbsRatio, macro.fatRatio],
    totalCalories: record.totalCalories,
    targetCalories: target.targetCalories,
  };
}
