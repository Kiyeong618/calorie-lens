import type {
  DailyRecord,
  FoodDefinition,
  FoodItem,
  Meal,
  NutritionTarget,
  UserProfile,
} from "../types";
import { clampNumber, uid } from "../utils";

const round = (n: number, digits = 1) => Number(n.toFixed(digits));
export function calculateFoodByWeight(
  food: FoodDefinition | FoodItem,
  grams: number,
  source: FoodItem["source"] = "manual",
): FoodItem {
  const ratio = clampNumber(grams) / 100;
  return {
    id: "id" in food && food.id ? uid() : uid(),
    foodDefinitionId:
      "foodDefinitionId" in food ? food.foodDefinitionId : food.id,
    name: food.name,
    grams: clampNumber(grams),
    kcalPer100g: clampNumber(food.kcalPer100g),
    proteinPer100g: clampNumber(food.proteinPer100g),
    carbsPer100g: clampNumber(food.carbsPer100g),
    fatPer100g: clampNumber(food.fatPer100g),
    calories: round(clampNumber(food.kcalPer100g) * ratio),
    protein: round(clampNumber(food.proteinPer100g) * ratio),
    carbs: round(clampNumber(food.carbsPer100g) * ratio),
    fat: round(clampNumber(food.fatPer100g) * ratio),
    source,
  };
}
export function recalculateEntry(food: FoodItem, grams = food.grams): FoodItem {
  const next = calculateFoodByWeight(food, grams, food.source);
  return { ...next, id: food.id, confidence: food.confidence };
}
export function calculateMealNutrition(foods: FoodItem[]) {
  return {
    totalCalories: round(
      foods.reduce((s, f) => s + clampNumber(f.calories), 0),
    ),
    protein: round(foods.reduce((s, f) => s + clampNumber(f.protein), 0)),
    carbs: round(foods.reduce((s, f) => s + clampNumber(f.carbs), 0)),
    fat: round(foods.reduce((s, f) => s + clampNumber(f.fat), 0)),
  };
}
export function calculateDailyNutrition(meals: Meal[]) {
  const totals = calculateMealNutrition(meals.flatMap((m) => m.foods));
  return { ...totals, meals };
}
export const calculateBMI = (weight: number, height: number) =>
  round(weight / Math.pow(height / 100, 2));
export const calculateBMR = (p: UserProfile) =>
  Math.round(
    10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "male" ? 5 : -161),
  );
export const calculateTDEE = (
  bmr: number,
  activity: UserProfile["activityLevel"],
) =>
  Math.round(
    bmr *
      {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        high: 1.725,
        extreme: 1.9,
      }[activity],
  );
export const calculateTargetCalories = (
  tdee: number,
  goal: UserProfile["goal"],
) => Math.round(tdee * { lose: 0.85, maintain: 1, gain: 1.1 }[goal]);
export const calculateCalorieDeviation = (actual: number, target: number) =>
  round(actual - target);
export const calculateConsistencyScore = (actual: number, target: number) =>
  target
    ? Math.max(0, Math.round((1 - Math.abs(actual - target) / target) * 100))
    : 0;
export const calculateMacroCalories = (
  protein: number,
  carbs: number,
  fat: number,
) => ({
  protein: round(protein * 4),
  carbs: round(carbs * 4),
  fat: round(fat * 9),
  total: round(protein * 4 + carbs * 4 + fat * 9),
});
export const calculateDeviation = calculateCalorieDeviation;
export function calculateNutritionTarget(p: UserProfile): NutritionTarget {
  const bmi = calculateBMI(p.weight, p.height);
  const bmr = calculateBMR(p);
  const tdee = calculateTDEE(bmr, p.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, p.goal);
  return {
    bmi,
    bmr,
    tdee,
    targetCalories,
    proteinTarget: Math.round(p.weight * 1.8),
    carbTarget: Math.round((targetCalories * 0.45) / 4),
    fatTarget: Math.round((targetCalories * 0.28) / 9),
  };
}
export const getMealDistribution = (record?: DailyRecord) =>
  ["breakfast", "lunch", "dinner", "snack"].map((type) => ({
    type,
    calories:
      record?.meals
        .filter((m) => m.type === type)
        .reduce((s, m) => s + m.totalCalories, 0) ?? 0,
  }));
